#!/usr/bin/env bash
# Hero loop from the test take: mono silhouette, only the head-and-shoulders strip of the shot is used.
# The shot is scaled to 62% height, cropped to the subject strip (source x 300-1200 of 1280) and sat
# bottom-right; the rest of the canvas is the strip's own wall smeared outward and blurred along the
# smear. The wall shadow left of the subject (it crushed to a black arc) is lifted to wall tone. The output
# is a 1080x1080 square crop round the subject (the dark left half is dropped). Works in 16-bit so the
# smeared gradients don't band.
# usage: bash tools/hero-video.sh <silhouette|dither4> [src.mov] [start_s]
# out:   public/hero/<look>.mp4 + public/hero/<look>-poster.jpg
set -euo pipefail
LOOK=${1:-silhouette}; SRC=${2:-A001_11192154_C083.mov}; SS=${3:-11}
FF=${FF:-$(uv run --no-project --with imageio-ffmpeg python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")}
W=1920; H=1080; SW=1190; SH=669          # shot scaled to 62% height
OW=1080; OX=840                          # output: square crop of the canvas round the subject
CX=279; CW=837                           # subject strip inside the scaled shot
X=982; Y=$((H-SH)); R=$((X+CW)); RP=$((W-R)); P1=400   # strip position; the left fill runs in two steps (fillborders caps a border at half the frame)
SPEED=${SPEED:-0.8}; LEN=${LEN:-8.75}; FADE=0.5   # SPEED = playback speed of the take (0.8 = 20% slower, gaps blended); LEN = loop length in output s; the last FADE s crossfade into the start
TOT=$(awk "BEGIN{print $LEN+$FADE}"); OFF=$(awk "BEGIN{print $LEN-$FADE}"); IN=$(awk "BEGIN{print ($LEN+$FADE)*$SPEED+0.2}")
TMP=$(mktemp -d)
# feather mask: 0 outside the strip; ramps inward 160 px (left), 60 px (right), 140 px (top)
"$FF" -v error -y -f lavfi -i "color=black:s=${W}x${H}" -vf "format=gray16le,geq=lum='65535*clip((X-$X)/160\,0\,1)*clip(($R-X)/60\,0\,1)*clip((Y-$Y)/140\,0\,1)'" -frames:v 1 "$TMP/mask.png"
# 4-tone ink/paper palette (paletteuse needs 256 entries)
"$FF" -v error -y -f lavfi -i "color=0x0B0C0C:s=4x16" -f lavfi -i "color=0x3A3D3C:s=4x16" -f lavfi -i "color=0x8E928F:s=4x16" -f lavfi -i "color=0xE7E9E6:s=4x16" -filter_complex "hstack=4" -frames:v 1 "$TMP/pal4.png"

# shadow lift: left of x=545 (scaled shot), pixels above shirt tone are raised to wall tone (~88/255)
LIFT="geq=lum='lum(X\,Y)+clip((545-X)/110\,0\,1)*clip((lum(X\,Y)-6400)/2560\,0\,1)*max(22500-lum(X\,Y)\,0)'"
BASE="curves=master='0/0 0.24/0.03 0.48/0.30 0.64/0.60 0.80/0.86 1/1',format=gray16le,scale=$SW:$SH,$LIFT,crop=$CW:$SH:$CX:0,pad=$((CW+RP+P1)):$H:$P1:$Y,fillborders=left=$P1:top=$Y:right=$RP:mode=smear,pad=$W:$H:$((X-P1)):0,fillborders=left=$((X-P1)):mode=smear,split[s][b];[b]gblur=sigma=60:sigmaV=0.01,gblur=sigma=0.01:sigmaV=20[bg];[bg][s][m]maskedmerge,crop=$OW:$H:$OX:0"
PIN=""
case $LOOK in
  silhouette) FX="gblur=sigma=4,format=rgb48le,curves=master='0/0 0.28/0.02 0.42/0.45 0.58/0.80 1/0.85',format=yuv420p" ;;   # grain is a CSS overlay on the page (noise in the video costs ~10 MB)
  dither4) PIN="[2]format=rgb24[p];"; FX="gblur=sigma=3,format=rgb48le,curves=master='0/0 0.28/0 0.6/0.75 1/0.9',scale=180:180:flags=area,format=rgb24[d];[d][p]paletteuse=dither=bayer:bayer_scale=1,scale=$OW:$H:flags=neighbor,format=yuv420p" ;;
  *) echo "unknown look $LOOK"; exit 1 ;;
esac
# frame export for the cursor-gaze experiment: FRAMES=<dir> DUR=<s> writes a PNG sequence from SS, no loop
if [ -n "${FRAMES:-}" ]; then
  mkdir -p "$FRAMES"
  "$FF" -v error -y -ss "$SS" -t "${DUR:-11}" -i "$SRC" -loop 1 -i "$TMP/mask.png" -loop 1 -i "$TMP/pal4.png" -an -filter_complex \
   "[1]format=gray16le[m];$PIN[0:v]$BASE,$FX,format=gray[v]" -map "[v]" -t "${DUR:-11}" -r 24 "$FRAMES/%04d.png"
  rm -rf "$TMP"; ls "$FRAMES" | wc -l; exit 0
fi
# seamless loop: the first FADE seconds crossfade over the tail
"$FF" -v error -y -ss "$SS" -t $IN -i "$SRC" -loop 1 -i "$TMP/mask.png" -loop 1 -i "$TMP/pal4.png" -an -filter_complex \
 "[1]format=gray16le[m];$PIN[0:v]setpts=PTS/$SPEED,framerate=fps=24,$BASE,$FX,split[x][y];[x]trim=$FADE:$TOT,setpts=PTS-STARTPTS[a];[y]trim=0:$FADE,setpts=PTS-STARTPTS[c];[a][c]xfade=transition=fade:duration=$FADE:offset=$OFF[v]" \
 -map "[v]" -t $LEN -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart -r 24 "public/hero/$LOOK.mp4"
"$FF" -v error -y -i "public/hero/$LOOK.mp4" -frames:v 1 -q:v 3 "public/hero/$LOOK-poster.jpg"
rm -rf "$TMP"; ls -l "public/hero/$LOOK.mp4"
