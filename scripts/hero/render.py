#!/usr/bin/env python3
"""
Renders the home-page hero stills from the Draco models.

    python3 scripts/hero/render.py            # every slug in lib/hero.ts
    python3 scripts/hero/render.py rimuru     # just one

Needs `npm run models` first, plus Python Playwright with Chromium. Serves the
project root on a throwaway port, renders each design in headless Chromium,
and writes public/hero/<slug>.webp. Background and light colours are read from
the brand tokens in app/globals.css, so a palette change is a re-run.
"""
import asyncio, base64, functools, http.server, io, re, socketserver, sys, threading
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "hero"
W, H = 1920, 1080

css = (ROOT / "app" / "globals.css").read_text()
token = lambda name: re.search(rf"--color-{name}:\s*(#[0-9a-fA-F]{{6}})", css).group(1)
slugs = sys.argv[1:] or re.findall(r'"([a-z0-9-]+)"', re.search(r"HERO_SLUGS = \[(.*?)\]", (ROOT / "lib" / "hero.ts").read_text(), re.S).group(1))

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

handler = functools.partial(QuietHandler, directory=str(ROOT))
server = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
port = server.server_address[1]

async def render(p, sem, i, slug):
    async with sem:
        browser = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        try:
            page = await browser.new_page(viewport={"width": W, "height": H})
            # Alternate the lean so consecutive slides don't repeat the pose.
            rz, ry = (-0.32, 0.25) if i % 2 == 0 else (0.3, -0.25)
            qs = f"m={slug}&w={W}&h={H}&ry={ry}&rz={rz}&fit=3.2&bg=%23{token('ground')[1:]}&key=%23{token('gold')[1:]}&rim=%23{token('turquoise')[1:]}"
            await page.goto(f"http://127.0.0.1:{port}/scripts/hero/render.html?{qs}", wait_until="commit", timeout=60000)
            await page.wait_for_function("window.DONE", timeout=420000, polling=2000)
            data = await page.evaluate("document.querySelector('canvas').toDataURL('image/png')")
            img = Image.open(io.BytesIO(base64.b64decode(data.split(",")[1]))).convert("RGB")
            img.save(OUT / f"{slug}.webp", "WEBP", quality=82, method=6)
            print(f"✓ {slug}  {(OUT / f'{slug}.webp').stat().st_size // 1024} KB", flush=True)
            return True
        except Exception as e:
            print(f"✗ {slug}: {str(e).splitlines()[0]}", flush=True)
            return False
        finally:
            await browser.close()

async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(3)
    async with async_playwright() as p:
        results = await asyncio.gather(*(render(p, sem, i, s) for i, s in enumerate(slugs)))
    server.shutdown()
    if not all(results):
        sys.exit(f"{results.count(False)} render(s) failed")

asyncio.run(main())
