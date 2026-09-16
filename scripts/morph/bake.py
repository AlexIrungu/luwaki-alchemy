#!/usr/bin/env python3
"""
Bakes every design in every delivered shape into height + colour maps for the
surface morph (home hero, UNIVERSE, collections).

    python3 scripts/morph/bake.py

Reads Kent's raw exports in source/ (the same "<DESIGN> <SHAPE>.gltf" files
`npm run models` uses) and writes into public/morph/, per design and shape:
  <slug>-<shape>-height.png  R,G = top surface height (16-bit) · B = underside (8-bit)
  <slug>-<shape>-color.png   RGB = linear base colour of the top surface
                             A = 255 pattern · 160 resin shell · 0 outside the nail
plus manifest.json describing the grid and which shapes each design has.

Every shell is centred across its width and anchored at the cuticle (the
low-Z end in every export — the tip is at high Z), so all maps share one grid:
a 35 mm coffin fills it end to end exactly as before, and a 20 mm oval grows
from the same base. That is what lets the morph turn one design or shape into
the next. Overhangs flatten to the highest surface; at hero size that reads fine.
"""
import base64, colorsys, json, re, sys, unicodedata
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "source"
OUT = ROOT / "public" / "morph"

CELL = 0.1                 # mm per texel
X0, X1 = -9.5, 9.5         # width, with room for Crypt Crawler's legs
Z0, Z1 = -18.0, 18.0       # length — the coffin is 35 mm
Y0, Y1 = -4.0, 12.0        # encodable height range
W, H = round((X1 - X0) / CELL), round((Z1 - Z0) / CELL)

COMPONENT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
WIDTH = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


# Mirrors SHAPES in lib/catalogue.ts — same names, same order.
SHAPES = ["cubic", "square", "stiletto", "coffin", "oval"]


def parse_file(path):
    """Mirrors parseFile() + slugify() in scripts/optimize-models.mjs: "JUNGLE OVAL" → ("jungle", "oval")."""
    match = re.match(r"^(.+?)[\s_-]+(\S+)$", path.stem.strip())
    if not match or match.group(2).lower() not in SHAPES:
        return None
    s = re.sub(r"_(?=s\b)", "'", match.group(1), flags=re.I).lower()
    s = unicodedata.normalize("NFKD", s)
    s = re.sub(r"['’]", "", s)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:60], match.group(2).lower()


def load(path):
    g = json.loads(path.read_text())
    buffers = [
        base64.b64decode(b["uri"].split(",", 1)[1]) if b.get("uri", "").startswith("data:")
        else (path.parent / b["uri"]).read_bytes()
        for b in g["buffers"]
    ]
    return g, buffers


def read(g, buffers, index):
    acc = g["accessors"][index]
    view = g["bufferViews"][acc["bufferView"]]
    dtype = np.dtype(COMPONENT[acc["componentType"]])
    n = WIDTH[acc["type"]]
    size = dtype.itemsize * n
    offset = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    stride = view.get("byteStride") or size
    raw = np.frombuffer(buffers[view["buffer"]], dtype=np.uint8, count=stride * (acc["count"] - 1) + size, offset=offset)
    if stride == size:
        return raw.view(dtype).reshape(acc["count"], n)
    picks = np.arange(acc["count"])[:, None] * stride + np.arange(size)[None, :]
    return raw[picks].copy().view(dtype).reshape(acc["count"], n)


def local_matrix(node):
    if "matrix" in node:
        return np.array(node["matrix"], dtype=float).reshape(4, 4).T
    x, y, z, w = node.get("rotation", [0, 0, 0, 1])
    r = np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ])
    m = np.eye(4)
    m[:3, :3] = r * np.array(node.get("scale", [1, 1, 1]))
    m[:3, 3] = node.get("translation", [0, 0, 0])
    return m


def triangles(path):
    """All triangles in millimetres, with base colour and a shell flag each."""
    g, buffers = load(path)
    tris, colours, shell = [], [], []

    def walk(i, parent):
        node = g["nodes"][i]
        m = parent @ local_matrix(node)
        if "mesh" in node:
            for prim in g["meshes"][node["mesh"]]["primitives"]:
                if prim.get("mode", 4) != 4:
                    continue
                pos = read(g, buffers, prim["attributes"]["POSITION"]).astype(float)
                pos = (np.c_[pos, np.ones(len(pos))] @ m.T)[:, :3] * 1000.0
                dims = np.sort(pos.max(0) - pos.min(0))
                # The print tab — same rule as isPrintTab() in lib/three/nail.ts.
                if dims[0] < 1.5 and dims[1] < 4 and dims[2] > 20 and len(pos) < 400:
                    continue
                idx = read(g, buffers, prim["indices"]).ravel().astype(np.int64) if "indices" in prim else np.arange(len(pos))
                t = pos[idx.reshape(-1, 3)]
                material = g["materials"][prim["material"]] if "material" in prim else {}
                rgb = material.get("pbrMetallicRoughness", {}).get("baseColorFactor", [1, 1, 1, 1])[:3]
                tris.append(t)
                colours.append(np.tile(rgb, (len(t), 1)))
                shell.append(np.full(len(t), colorsys.rgb_to_hls(*rgb)[2] < 0.15))
        for child in node.get("children", []):
            walk(child, m)

    for root in g["scenes"][g.get("scene", 0)]["nodes"]:
        walk(root, np.eye(4))
    return np.concatenate(tris), np.concatenate(colours), np.concatenate(shell)


def bake(path, key):
    tris, colours, shell = triangles(path)
    if not shell.any():
        return "no shell"
    shell_points = tris[shell].reshape(-1, 3)
    lo, hi = shell_points.min(0), shell_points.max(0)
    if hi[2] - lo[2] > Z1 - (Z0 + 0.5):
        return f"shell {hi[2] - lo[2]:.1f} mm long, past the end of the grid"
    # Centre across width and height; put the cuticle half a millimetre in from the grid's end.
    tris = tris - np.array([(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2] - (Z0 + 0.5)])

    top = np.full(W * H, -np.inf)
    bottom = np.full(W * H, np.inf)
    colour = np.zeros((W * H, 3))
    kind = np.zeros(W * H, np.uint8)  # 0 empty · 1 shell · 2 pattern

    # Sample every triangle densely enough that no texel it covers is missed.
    edges = np.stack([tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 1], tris[:, 0] - tris[:, 2]], 1)[:, :, [0, 2]]
    steps = np.clip(np.ceil(np.linalg.norm(edges, axis=2).max(1) / (CELL * 0.5)), 1, 48).astype(int)

    for k in np.unique(steps):
        chosen = np.nonzero(steps == k)[0]
        ii, jj = np.meshgrid(np.arange(k + 1), np.arange(k + 1))
        keep = ii + jj <= k
        u = (ii[keep] / k)[None, :, None]
        v = (jj[keep] / k)[None, :, None]
        for chunk in np.array_split(chosen, max(1, len(chosen) * int(keep.sum()) // 2_000_000)):
            t = tris[chunk]
            points = (t[:, None, 0] * (1 - u - v) + t[:, None, 1] * u + t[:, None, 2] * v).reshape(-1, 3)
            per = int(keep.sum())
            col = np.repeat(colours[chunk], per, axis=0)
            knd = np.repeat(np.where(shell[chunk], 1, 2), per)

            ix = np.floor((points[:, 0] - X0) / CELL).astype(int)
            iz = np.floor((points[:, 2] - Z0) / CELL).astype(int)
            ok = (ix >= 0) & (ix < W) & (iz >= 0) & (iz < H)
            flat, y, col, knd = (iz * W + ix)[ok], points[ok, 1], col[ok], knd[ok]

            np.minimum.at(bottom, flat, y)
            order = np.argsort(y)
            f, yy = flat[order], y[order]
            higher = yy > top[f]
            f = f[higher]
            top[f] = yy[higher]
            colour[f] = col[order][higher]
            kind[f] = knd[order][higher]

    top, bottom = top.reshape(H, W), bottom.reshape(H, W)
    colour, kind = colour.reshape(H, W, 3), kind.reshape(H, W)

    # Close pinholes inside the outline from their neighbours.
    for _ in range(2):
        for dz, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nt = np.roll(np.roll(top, dz, 0), dx, 1)
            take = ~np.isfinite(top) & np.isfinite(nt)
            neighbours = sum(np.roll(np.roll(np.isfinite(top), a, 0), b, 1).astype(int) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            take &= neighbours >= 3
            top[take] = nt[take]
            bottom[take] = np.roll(np.roll(bottom, dz, 0), dx, 1)[take]
            colour[take] = np.roll(np.roll(colour, dz, 0), dx, 1)[take]
            kind[take] = np.roll(np.roll(kind, dz, 0), dx, 1)[take]

    # Clean the outline: keep only the nail itself (stray islands read as dust)
    # and flatten lone spikes standing far above all four neighbours — sampling
    # noise, not design. No morphological opening: along the rim the shell
    # between pattern bands is under 3 texels wide, and opening notched it.
    inside = np.isfinite(top)
    labels, count = ndimage.label(inside)
    if count > 1:
        sizes = ndimage.sum(inside, labels, range(1, count + 1))
        inside = labels == 1 + int(np.argmax(sizes))
    top[~inside] = -np.inf
    kind[~inside] = 0
    ring = np.maximum.reduce([np.roll(top, 1, 0), np.roll(top, -1, 0), np.roll(top, 1, 1), np.roll(top, -1, 1)])
    with np.errstate(invalid="ignore"):  # -inf − -inf outside the nail; those cells aren't inside anyway
        spike = inside & np.isfinite(ring) & (top - ring > 1.5)
    top[spike] = ring[spike]

    t16 = np.where(inside, np.clip((np.where(inside, top, Y0) - Y0) / (Y1 - Y0) * 65534 + 1, 1, 65535), 0).astype(np.uint16)
    b8 = np.where(inside, np.clip((np.where(inside, bottom, Y0) - Y0) / (Y1 - Y0) * 255, 0, 255), 0).astype(np.uint8)
    height = np.dstack([(t16 >> 8).astype(np.uint8), (t16 & 255).astype(np.uint8), b8])
    alpha = np.select([kind == 2, kind == 1], [255, 160], 0).astype(np.uint8)
    rgba = np.dstack([np.clip(colour * 255, 0, 255).astype(np.uint8), alpha])

    Image.fromarray(height, "RGB").save(OUT / f"{key}-height.png", optimize=True)
    Image.fromarray(rgba, "RGBA").save(OUT / f"{key}-color.png", optimize=True)
    return f"{inside.mean() * 100:.0f}% of grid · pattern {np.mean(kind == 2) * 100:.0f}% · max height {top[inside].max():.1f} mm"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[1:])  # optional slugs to re-bake; the manifest still covers everything on disk
    shapes = {}
    failed = 0
    for path in sorted(SOURCE.glob("*.gltf")):
        parsed = parse_file(path)
        if not parsed:
            print(f"✗ {path.name}: doesn't end in a shape ({' · '.join(SHAPES)})")
            failed += 1
            continue
        slug, shape = parsed
        key = f"{slug}-{shape}"
        if only and slug not in only:
            if (OUT / f"{key}-height.png").exists():
                shapes.setdefault(slug, []).append(shape)
            continue
        result = bake(path, key)
        if result.startswith(("no ", "shell ")):
            print(f"– {key}: skipped ({result})")
        else:
            shapes.setdefault(slug, []).append(shape)
            print(f"✓ {key}: {result}")

    shapes = {slug: sorted(found, key=SHAPES.index) for slug, found in sorted(shapes.items())}
    manifest = {
        "cell": CELL, "width": W, "height": H,
        "bounds": {"x0": X0, "x1": X1, "z0": Z0, "z1": Z1, "y0": Y0, "y1": Y1},
        # Designs with a coffin bake — what UNIVERSE and the collections draw on.
        "designs": [slug for slug, found in shapes.items() if "coffin" in found],
        "shapes": shapes,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

    # Maps no bake produces any more (the pre-shape "<slug>-height.png" names, retired exports).
    expected = {f"{slug}-{shape}-{kind}.png" for slug, found in shapes.items() for shape in found for kind in ("height", "color")}
    stale = [p for p in OUT.glob("*.png") if p.name not in expected] if not failed else []
    for p in stale:
        p.unlink()

    total = sum(len(found) for found in shapes.values())
    print(f"\n{len(shapes)} designs · {total} bakes · grid {W}×{H} · {OUT / 'manifest.json'}")
    if stale:
        print(f"Removed {len(stale)} stale map(s)")
    if failed:
        sys.exit(f"{failed} file(s) not baked — see above. Stale maps left in place.")


main()
