"""Ghép các ảnh trong một thư mục thành tờ liên hoàn có nhãn: python -I tools/sheet.py <thư mục> <ra.jpg> [số cột]"""
import glob
import os
import sys

import cv2
import numpy as np

src, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 3
ims = []
for f in sorted(glob.glob(os.path.join(src, "*.jpg")) + glob.glob(os.path.join(src, "*.png"))):
    im = cv2.resize(cv2.imread(f), (640, 360))
    cv2.putText(im, os.path.basename(f)[:30], (8, 26), 0, 0.7, (0, 0, 0), 4)
    cv2.putText(im, os.path.basename(f)[:30], (8, 26), 0, 0.7, (0, 255, 255), 2)
    ims.append(im)
while len(ims) % cols:
    ims.append(np.zeros((360, 640, 3), np.uint8))
cv2.imwrite(out, np.vstack([np.hstack(ims[i : i + cols]) for i in range(0, len(ims), cols)]))
