"""Cover stubs (recipe test). Real outputs only; Sentify uses placeholder data until the model is re-run.
Run: uv run --no-project --with pillow --with numpy --with scipy python tools/covers/stub.py
"""
import random
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

SRC = Path(r"C:\University\project-grad\projects-src")
OUT = Path(__file__).resolve().parents[2] / "public" / "covers"
W, H = 2560, 1600
INK = (11, 12, 12); PAPER = (231, 233, 230); MASK = (141, 176, 166); SIGNAL = (239, 162, 60)

def root():
    im = np.asarray(Image.open(SRC / "portfolio/images/plant-root/root-measurements.png").convert("RGB")).astype(int)
    # two panels side by side: find them by the white gutter
    left, right = im[:, 10:574], im[:, 587:1151]
    y0, y1 = 32, 596
    left, right = left[y0:y1], right[y0:y1]
    R, G, B = right[..., 0], right[..., 1], right[..., 2]
    red = (R > 170) & (G < 90) & (B < 90)
    cyan = (G > 170) & (B > 170) & (R < 120)
    # plate: inverted grayscale, pushed dark
    g = left.mean(-1) / 255.0
    plate = np.clip((1 - g) * 1.6 - 0.25, 0, 1)
    lab0, _ = ndi.label(g < 0.35); sizes = np.bincount(lab0.ravel()); sizes[0] = 0
    plate[ndi.binary_dilation(sizes[lab0] > 3000, iterations=3)] = 0   # drop dish rim and shadow blob, keep leaves
    # crop 16:10 around the roots
    cw = left.shape[1]; ch = int(cw * 10 / 16); cy = 70
    sl = (slice(cy, cy + ch), slice(0, cw))
    plate, red, cyan = plate[sl], red[sl], cyan[sl]
    s = W / cw
    def up(mask, grow=1.0):
        m = Image.fromarray((mask * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)
        m = m.filter(ImageFilter.GaussianBlur(s * 0.35 * grow))
        a = np.asarray(m).astype(float) / 255
        return np.clip((a - 0.18) * 3.2, 0, 1)
    pl = np.asarray(Image.fromarray((plate * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)).astype(float) / 255
    out = np.zeros((H, W, 3)); out[:] = INK
    pc = np.array(PAPER, float)
    out = out * (1 - pl[..., None] * .55) + pc * pl[..., None] * .55       # raw roots, faint
    for m, c, a in ((up(cyan), MASK, .85), (up(red, 1.2), PAPER, 1.0)):
        out = out * (1 - m[..., None] * a) + np.array(c, float) * m[..., None] * a
    img = Image.fromarray(out.clip(0, 255).astype(np.uint8))
    # tips: lowest point of each primary-root component
    lab, n = ndi.label(ndi.binary_dilation(red, iterations=2))
    d = ImageDraw.Draw(img)
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(ys) < 40: continue
        k = ys.argmax(); x, y = xs[k] * s, ys[k] * s
        r = 26
        d.ellipse((x - r, y - r, x + r, y + r), outline=SIGNAL, width=5)
        d.line((x - r - 22, y, x - r - 6, y), fill=SIGNAL, width=5); d.line((x + r + 6, y, x + r + 22, y), fill=SIGNAL, width=5)
    img.save(OUT / "root-phenotyping.webp", quality=90)

def rounded(im, r):
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, *im.size), r, fill=255)
    im = im.convert("RGBA"); im.putalpha(m); return im

def pastaio():
    # the app's own output, in its own colours (no regrade): two screens on ink
    img = Image.new("RGB", (W, H), INK)
    media = SRC / "pastaio/docs/media"
    sc = 1.15
    for f, x, y in (("10-ask-timer.png", 323, 230), ("09-ask-sourced-fact.png", 1340, 230)):
        s = Image.open(media / f).convert("RGB")
        s = s.resize((int(s.width * sc), int(s.height * sc)), Image.LANCZOS)
        img.paste(rounded(s, 56), (x, y), rounded(s, 56))
    img.save(OUT / "pastaio.webp", quality=90)

def sentify():
    # placeholder: sentence-level emotion timeline of one clip. Replace with a real run on a public clip.
    rnd = random.Random(7)
    lanes = 7; top, bot, l, r = 200, 1400, 160, 2400
    lh = (bot - top) / lanes
    t, rows, corr = 0.0, [], []
    while t < 1:
        dur = rnd.uniform(.0012, .0055)
        lane = rnd.choices(range(lanes), weights=[1, .4, .5, 1.6, .8, .6, 3])[0]
        conf = rnd.uniform(.35, .99)
        rows.append((t, dur, lane, conf, conf < .5 and rnd.random() < .5))
        t += dur + rnd.uniform(.0004, .0012)
    p = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
         f'<rect width="{W}" height="{H}" fill="#0B0C0C"/>']
    for i in range(lanes + 1):
        y = top + i * lh
        p.append(f'<line x1="{l}" x2="{r}" y1="{y:.1f}" y2="{y:.1f}" stroke="#E7E9E6" stroke-opacity=".08" stroke-width="2"/>')
    for t0, dur, lane, conf, fix in rows:
        x = l + t0 * (r - l); w = max(dur * (r - l), 3); y = top + lane * lh + lh * .12; h = lh * .76
        col, op = ("#EFA23C", 1) if fix else ("#E7E9E6", round(.15 + .85 * conf ** 2, 2))
        p.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{col}" fill-opacity="{op}"/>')
    p.append("</svg>")
    (OUT / "sentify.svg").write_text("\n".join(p), encoding="utf-8")

if __name__ == "__main__":
    root(); pastaio(); sentify(); print("ok", OUT)
