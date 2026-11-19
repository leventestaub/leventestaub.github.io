"""Head pose per frame for the cursor-gaze hero experiment.

Reads JPEG frames (frame i = START + (i-1)/FPS s in the source clip), runs MediaPipe face mesh,
and writes one CSV row per frame: t, yaw, pitch (rough, normalised), face centre and width (px).
usage: uv run --no-project --python 3.11 --with mediapipe==0.10.14 --with opencv-python \
         python tools/gaze_poses.py <frames_dir> <out.csv> [start_s] [fps]
"""
import csv
import sys
from pathlib import Path

import cv2
import mediapipe as mp

src, out = Path(sys.argv[1]), Path(sys.argv[2])
start = float(sys.argv[3]) if len(sys.argv) > 3 else 7.0
fps = float(sys.argv[4]) if len(sys.argv) > 4 else 24.0

import numpy as np

L_CHEEK, R_CHEEK, BROW, CHIN = 234, 454, 168, 152
# nose tip, chin, eye outer corners (image left, image right), mouth corners; generic head in mm (y up, z toward camera)
PNP_IDX = [1, 152, 33, 263, 61, 291]
MODEL = np.array([(0, 0, 0), (0, -330, -65), (-225, 170, -135), (225, 170, -135), (-150, -150, -125), (150, -150, -125)], dtype=np.float64)
MODEL[:, 1] *= -1  # image y points down
MODEL[:, 2] *= -1  # camera z points away
mesh = mp.solutions.face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=False)
rows = []
for i, f in enumerate(sorted(src.glob("*.jpg"))):
    img = cv2.imread(str(f))
    h, w = img.shape[:2]
    res = mesh.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    t = round(start + i / fps, 4)
    if not res.multi_face_landmarks:
        rows.append([t, "", "", "", "", ""])
        continue
    lm = res.multi_face_landmarks[0].landmark
    P = lambda k: (lm[k].x * w, lm[k].y * h, lm[k].z * w)
    l, r, b, c = P(L_CHEEK), P(R_CHEEK), P(BROW), P(CHIN)
    fw = abs(r[0] - l[0]) or 1.0
    # head pose: fit six landmarks to a generic 3D head (solvePnP); degrees, yaw + = nose to image right, pitch + = up
    img_pts = np.array([P(k)[:2] for k in PNP_IDX], dtype=np.float64)
    cam = np.array([[w, 0, w / 2], [0, w, h / 2], [0, 0, 1]], dtype=np.float64)
    ok, rvec, _ = cv2.solvePnP(MODEL, img_pts, cam, np.zeros(4), flags=cv2.SOLVEPNP_ITERATIVE)
    R_, _ = cv2.Rodrigues(rvec)
    fwd = R_ @ np.array([0.0, 0.0, -1.0])  # nose direction in camera space (x right, y down, z away)
    yaw = float(np.degrees(np.arctan2(fwd[0], -fwd[2])))
    pitch = float(np.degrees(np.arctan2(-fwd[1], -fwd[2])))
    cx, cy = (l[0] + r[0]) / 2, (b[1] + c[1]) / 2
    rows.append([t, round(yaw, 4), round(pitch, 4), round(cx, 1), round(cy, 1), round(fw, 1)])

with out.open("w", newline="") as fh_:
    wr = csv.writer(fh_)
    wr.writerow(["t", "yaw", "pitch", "cx", "cy", "fw"])
    wr.writerows(rows)
print(f"{len(rows)} frames, {sum(1 for r in rows if r[1] != '')} with a face -> {out}")
