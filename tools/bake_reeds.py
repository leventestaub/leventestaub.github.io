"""Bake the hero's reeded-glass SVG filter into the video. WebKit (iOS/Safari) drops CSS `filter: url()` on a playing
video, and phones get their own gentler set, so the phone frame plays a baked file for every browser.
Same maths as the #reeds filter in src/pages/index.astro, in video pixels:
out(x,y) = soft(x + scale*(R-.5), y + scale*(G-.5)), R = per-reed sawtooth 0..1, G = .5 +- tilt/2, map blurred across reeds.
The 1080 px video shows at ~550 css px on desktop and ~370 on phones.
usage: uv run --no-project --with imageio[ffmpeg] --with scipy --with numpy python tools/bake_reeds.py <preset> [--poster-only]
       presets: desktop (= the live #reeds at 1440) | phone"""
import sys, numpy as np, imageio.v2 as iio
from scipy.ndimage import gaussian_filter, gaussian_filter1d, map_coordinates

# reed width, distortion (max shift = scale/2), seam softness, pre-blur, diagonal pull; all in video px
PRESETS = {'desktop': dict(reed=59, scale=51, smooth=6, soft=2.4, tilt=0.35, out='silhouette-reeds'),
           'phone':   dict(reed=50, scale=20, smooth=3, soft=3, tilt=0.44, out='silhouette-reeds-sm')}
args = [a for a in sys.argv[1:] if not a.startswith('--')]
P = dict(PRESETS[args[0] if args else 'desktop'])
for a in sys.argv[1:]:                                   # --reed=80 etc. override a preset (for trials)
    if a.startswith('--') and '=' in a: k, v = a[2:].split('='); P[k] = v if k == 'out' else float(v)
poster_only = '--poster-only' in sys.argv

rd = iio.get_reader('public/hero/silhouette.mp4'); meta = rd.get_meta_data(); w, h = meta['size']
reed = int(P['reed']); t = (np.arange(w) % reed) / (reed - 1)        # sawtooth ramp per reed
pad = int(12 * P['smooth']) + 1
R = gaussian_filter1d(np.concatenate([t[-pad:], t, t[:pad]]), P['smooth'])[pad:-pad] if P['smooth'] else t
G = 0.5 - P['tilt'] / 2 + P['tilt'] * R
X, Y = np.meshgrid(np.arange(w), np.arange(h))
cx = X + P['scale'] * (R[None, :] - 0.5); cy = Y + P['scale'] * (G[None, :] - 0.5)

def glass(f):
    out = np.empty_like(f)
    for c in range(3):
        s = gaussian_filter(f[..., c].astype(np.float32), P['soft'])
        out[..., c] = np.clip(map_coordinates(s, [cy, cx], order=1, mode='nearest'), 0, 255)
    return out

if poster_only:
    iio.imwrite(f"/tmp/fc/{P['out']}.png", glass(rd.get_data(0))); print(P); sys.exit()
wr = iio.get_writer(f"public/hero/{P['out']}.mp4", fps=meta['fps'], codec='libx264', macro_block_size=8,
                    ffmpeg_params=['-crf', '26', '-preset', 'slow', '-movflags', '+faststart'])
first = None
for f in rd:
    g = glass(f); first = g if first is None else first; wr.append_data(g)
wr.close(); iio.imwrite(f"public/hero/{P['out']}-poster.webp", first, quality=94); print(P)
