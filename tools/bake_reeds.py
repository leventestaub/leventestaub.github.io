"""Bake the hero's reeded-glass SVG filter into the video, for WebKit (iOS/Safari drop CSS `filter: url()` on playing video).
Same maths as the #reeds filter in src/pages/index.astro, in video pixels:
out(x,y) = soft(x + scale*(R-.5), y + scale*(G-.5)), R = per-reed sawtooth 0..1, G = .5 +- tilt/2, map blurred across reeds.
The video shows at ~2x downscale on desktop (~550 css px) and ~3x on phones, so these px are the page values scaled to match.
usage: uv run --no-project --with imageio[ffmpeg] --with scipy --with numpy python tools/bake_reeds.py [look]"""
import sys, numpy as np, imageio.v2 as iio
from scipy.ndimage import gaussian_filter, gaussian_filter1d, map_coordinates

LOOK = sys.argv[1] if len(sys.argv) > 1 else 'silhouette'
REED, SCALE, SMOOTH, SOFT, TILT = 59, 51, 6, 2.4, 0.35
src, dst = f'public/hero/{LOOK}.mp4', f'public/hero/{LOOK}-reeds.mp4'
rd = iio.get_reader(src); fps = rd.get_meta_data()['fps']
w, h = rd.get_meta_data()['size']
t = (np.arange(w) % REED) / (REED - 1)                       # sawtooth ramp per reed
pad = 3 * SMOOTH * 4
R = gaussian_filter1d(np.concatenate([t[-pad:], t, t[:pad]]), SMOOTH)[pad:-pad]   # seams softened
G = 0.5 - TILT / 2 + TILT * R
X, Y = np.meshgrid(np.arange(w), np.arange(h))
cx = X + SCALE * (R[None, :] - 0.5); cy = Y + SCALE * (G[None, :] - 0.5)
wr = iio.get_writer(dst, fps=fps, codec='libx264', quality=None, macro_block_size=8,
                    ffmpeg_params=['-crf', '26', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'])
first = None
for f in rd:
    out = np.empty_like(f)
    for c in range(3):
        s = gaussian_filter(f[..., c].astype(np.float32), SOFT)
        out[..., c] = np.clip(map_coordinates(s, [cy, cx], order=1, mode='nearest'), 0, 255)
    if first is None: first = out
    wr.append_data(out)
wr.close()
iio.imwrite(f'public/hero/{LOOK}-reeds-poster.jpg', first, quality=85)
print(dst, w, h, fps)
