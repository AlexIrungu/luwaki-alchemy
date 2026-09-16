#!/usr/bin/env python3
"""
Renders the home-page hero stills from the Draco models.

    python3 scripts/hero/render.py            # every slug in lib/hero.ts
    python3 scripts/hero/render.py rimuru     # just one

    python3 scripts/hero/render.py --shapes           # a shape-strip tile for every model
    python3 scripts/hero/render.py --shapes jungle    # every shape of one design

Shape tiles are portrait, all in one pose so a design's shapes read as a set,
and land in public/shapes/<slug>-<shape>.webp.

Needs `npm run models` first, plus Python Playwright with Chromium. Serves the
project root on a throwaway port, renders each design in headless Chromium,
and writes public/hero/<slug>.webp with a transparent background, so the same
still sits on the light and the dark theme.
"""
import asyncio, base64, functools, http.server, io, json, re, socketserver, sys, threading
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
args = sys.argv[1:]
SHAPES_MODE = "--shapes" in args
args = [a for a in args if a != "--shapes"]

if SHAPES_MODE:
    OUT = ROOT / "public" / "shapes"
    W, H = 900, 1200
    manifest = json.loads((ROOT / "public" / "models" / "manifest.json").read_text())
    # (slug, shape) pairs, one per delivered model.
    jobs = [(d["slug"], s) for d in manifest if not args or d["slug"] in args for s in d["shapes"]]
else:
    OUT = ROOT / "public" / "hero"
    W, H = 1920, 1080
    slugs = args or re.findall(r'"([a-z0-9-]+)"', re.search(r"HERO_SLUGS = \[(.*?)\]", (ROOT / "lib" / "hero.ts").read_text(), re.S).group(1))
    jobs = [(s, None) for s in slugs]

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

handler = functools.partial(QuietHandler, directory=str(ROOT))
server = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
port = server.server_address[1]

async def render(p, sem, i, slug, shape):
    name = f"{slug}-{shape}" if shape else slug
    async with sem:
        browser = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        try:
            page = await browser.new_page(viewport={"width": W, "height": H})
            if shape:
                qs = f"m={slug}&s={shape}&w={W}&h={H}&ry=0.3&rz=-0.12&fit=2.5"
            else:
                # Alternate the lean so consecutive slides don't repeat the pose.
                rz, ry = (-0.32, 0.25) if i % 2 == 0 else (0.3, -0.25)
                qs = f"m={slug}&w={W}&h={H}&ry={ry}&rz={rz}&fit=3.2"
            await page.goto(f"http://127.0.0.1:{port}/scripts/hero/render.html?{qs}", wait_until="commit", timeout=60000)
            await page.wait_for_function("window.DONE", timeout=420000, polling=2000)
            data = await page.evaluate("document.querySelector('canvas').toDataURL('image/png')")
            img = Image.open(io.BytesIO(base64.b64decode(data.split(",")[1]))).convert("RGBA")
            img.save(OUT / f"{name}.webp", "WEBP", quality=82, method=6)
            print(f"✓ {name}  {(OUT / f'{name}.webp').stat().st_size // 1024} KB", flush=True)
            return True
        except Exception as e:
            print(f"✗ {name}: {str(e).splitlines()[0]}", flush=True)
            return False
        finally:
            await browser.close()

async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(3)
    async with async_playwright() as p:
        results = await asyncio.gather(*(render(p, sem, i, slug, shape) for i, (slug, shape) in enumerate(jobs)))
    server.shutdown()
    if not all(results):
        sys.exit(f"{results.count(False)} render(s) failed")

asyncio.run(main())
