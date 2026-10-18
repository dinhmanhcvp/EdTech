import sys
import io
import re
import cv2
import json
import numpy as np
from rapidocr_onnxruntime import RapidOCR

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append('socratic-monorepo/services/ai-engine')
from ocr_engine import BlackboardMathCorrector

def assemble_boxes(res):
    if not res:
        return ""
    sorted_res = sorted(res, key=lambda r: min(pt[0] for pt in r[0]))
    tokens = []
    prev_box = None

    cjk_map = {
        '\u306e': 'y', # の
        '\u03b3': 'y', # gamma
        '\u0443': 'y', # cyrillic u
        '\u4e8c': '=', # 二
        '\u5341': '+', # 十
        '\u4e00': '-', # 一
        '#C': 'x',
        '#c': 'x',
        'DC': 'x',
        'dc': 'x',
        ')(': 'x',
        '><': 'x',
        'oe': 'x',
        'ae': 'x',
    }

    for r in sorted_res:
        txt = r[1].strip()
        pts = r[0]
        min_x = min(pt[0] for pt in pts)
        min_y = min(pt[1] for pt in pts)
        max_y = max(pt[1] for pt in pts)
        cy = (min_y + max_y) / 2.0
        h = max_y - min_y

        mapped = cjk_map.get(txt, txt)
        # Check superscript
        if prev_box is not None and prev_box['mapped'] in ['x', 'X', 'y', 't'] and mapped in ['2', '3', '4', 'n']:
            if cy < prev_box['cy'] - 10:
                mapped = '^' + mapped

        tokens.append(mapped)
        prev_box = {'mapped': mapped.replace('^', ''), 'cy': cy, 'h': h}

    raw_str = " ".join(tokens)
    raw_str = re.sub(r'([xXyY])\s*\^(\d)', r'\1^\2', raw_str)
    return raw_str

p = r'C:\Users\PC\.gemini\antigravity-ide\brain\fb5b747c-3cf7-4e3e-8c99-b4fc458c9c24\.user_uploaded\media_1792298365446.png'
img = cv2.imread(p)
o = RapidOCR()
res, _ = o(img)
assembled = assemble_boxes(res)
print("Assembled from Raw Image:", assembled)

corrected = BlackboardMathCorrector.fix_handwriting_ambiguities(assembled)
print("After Ambiguity Fix:", corrected)

latex, params, dyn = BlackboardMathCorrector.normalize_polynomial_2d(corrected)
print("Final LaTeX Formula:", latex)
print("Extracted Parameters:", params)
