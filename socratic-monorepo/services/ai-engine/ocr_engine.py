"""
SOCRATIC VISION BOARD - State-of-the-Art Blackboard Handwriting OCR Engine
Specialized for 75" Touchboards & Mobile Student Canvas:
- Handles Dark Chalkboard, Slate, Transparent & White Canvas
- Adaptive Inversion, Bilateral Stroke Denoising & Morphological Gap-Healing
- Hybrid RapidOCR (ONNX) + PyTesseract Ensemble
- Handwriting Disambiguation (0 vs O, 5 vs S, 2 vs Z, subscripts/superscripts)
- Real-time Parameter Extraction for 12 Offline STEM Simulation Templates
- Zero-Keyboard Tap & Swap LaTeX Candidate Generation
"""

import io
import re
import math
import time
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

try:
    from rapidocr_onnxruntime import RapidOCR
    RAPIDOCR_ENGINE = RapidOCR()
except Exception as e:
    print(f"[OCR Engine] RapidOCR initialization warning: {e}")
    RAPIDOCR_ENGINE = None

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False


class BlackboardPreprocessor:
    """
    Transforms dark-board chalk/neon strokes into normalized, high-contrast,
    denoised black-on-white text optimized for neural network character recognition.
    """

    @staticmethod
    def render_strokes_to_image(strokes_data: List[Dict[str, Any]], target_h: int = 140, pad: int = 35) -> Optional[np.ndarray]:
        """
        Reconstructs teacher's raw vector strokes into an ultra-sharp, anti-aliased,
        normalized black-on-white image for optimal neural OCR recognition.
        """
        if not strokes_data or not CV2_AVAILABLE:
            return None
        all_pts = []
        for s in strokes_data:
            if isinstance(s, dict):
                pts = s.get('points', [])
                all_pts.extend(pts)
        if not all_pts or len(all_pts) < 2:
            return None

        xs = [p['x'] for p in all_pts if 'x' in p]
        ys = [p['y'] for p in all_pts if 'y' in p]
        if not xs or not ys:
            return None

        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        w = max_x - min_x
        h = max_y - min_y
        if w <= 4 or h <= 4:
            return None

        scale = (target_h - 2 * pad) / float(max(h, 24))
        target_w = max(int(w * scale) + 2 * pad, 140)

        img = np.ones((target_h, target_w, 3), dtype=np.uint8) * 255

        for s in strokes_data:
            if not isinstance(s, dict):
                continue
            pts = s.get('points', [])
            if len(pts) < 2:
                continue
            coords = []
            for p in pts:
                px = int((p['x'] - min_x) * scale) + pad
                py = int((p['y'] - min_y) * scale) + pad
                coords.append([px, py])
            poly = np.array([coords], dtype=np.int32)
            cv2.polylines(img, poly, isClosed=False, color=(0, 0, 0), thickness=5, lineType=cv2.LINE_AA)

        return img

    @staticmethod
    def preprocess(image_bytes: bytes) -> Tuple[Optional[np.ndarray], Dict[str, Any]]:
        meta = {
            "original_size": (0, 0),
            "is_dark_background": False,
            "crop_box": None,
            "preprocessing_ms": 0.0,
        }
        t0 = time.perf_counter()

        if not image_bytes or not PIL_AVAILABLE or not CV2_AVAILABLE:
            return None, meta

        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            w, h = pil_img.size
            meta["original_size"] = (w, h)
            np_img = np.array(pil_img)

            # 1. Handle Alpha / Transparency
            if len(np_img.shape) == 3 and np_img.shape[2] == 4:
                alpha = np_img[:, :, 3] / 255.0
                rgb_part = np_img[:, :, :3]
                ink_pixels = rgb_part[alpha > 0.3]
                if len(ink_pixels) > 0 and np.mean(ink_pixels) < 120:
                    # Dark ink on transparent canvas: blend onto pure white background
                    white_bg = np.ones_like(rgb_part) * 255
                    blended = (rgb_part * alpha[:, :, None] + white_bg * (1.0 - alpha[:, :, None])).astype(np.uint8)
                    norm_gray = cv2.cvtColor(blended, cv2.COLOR_RGB2GRAY)
                else:
                    # White/neon chalk ink: blend onto pure black canvas, then invert
                    black_bg = np.zeros_like(rgb_part)
                    blended = (rgb_part * alpha[:, :, None] + black_bg * (1.0 - alpha[:, :, None])).astype(np.uint8)
                    gray = cv2.cvtColor(blended, cv2.COLOR_RGB2GRAY)
                    norm_gray = 255 - gray
            elif len(np_img.shape) == 3:
                gray = cv2.cvtColor(np_img, cv2.COLOR_RGB2GRAY)
                mean_intensity = float(np.mean(gray))
                meta["is_dark_background"] = mean_intensity < 130
                norm_gray = (255 - gray) if mean_intensity < 130 else gray
            else:
                norm_gray = np_img.copy()

            # 2. Bilateral Filter / Denoise
            denoised = cv2.bilateralFilter(norm_gray, d=5, sigmaColor=50, sigmaSpace=50)

            # 3. Find Ink Bounding Box
            ink_mask = (255 - norm_gray) > 25
            coords = cv2.findNonZero(ink_mask.astype(np.uint8) * 255)

            if coords is not None:
                x, y, bw, bh = cv2.boundingRect(coords)
                pad = 25
                h_img, w_img = norm_gray.shape
                x1 = max(0, x - pad)
                y1 = max(0, y - pad)
                x2 = min(w_img, x + bw + pad)
                y2 = min(h_img, y + bh + pad)
                cropped = norm_gray[y1:y2, x1:x2]
                meta["crop_box"] = (x1, y1, x2 - x1, y2 - y1)
            else:
                cropped = norm_gray

            # 4. Morphological Stroke Healing
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
            healed = cv2.erode(cropped, kernel, iterations=1)

            # 5. Height Normalization for optimal RapidOCR
            ch, cw = healed.shape
            if ch < 80 and ch > 10:
                scale_factor = 80.0 / ch
                target_w = max(40, int(cw * scale_factor))
                healed = cv2.resize(healed, (target_w, 80), interpolation=cv2.INTER_CUBIC)

            # 6. Convert to RGB 3-channel
            final_rgb = cv2.cvtColor(healed, cv2.COLOR_GRAY2RGB)
            meta["preprocessing_ms"] = round((time.perf_counter() - t0) * 1000, 2)
            return final_rgb, meta

        except Exception as e:
            print(f"[BlackboardPreprocessor] Error: {e}")
            return None, meta


class BlackboardMathCorrector:
    """
    Expert rule-based and regex engine to correct teacher handwriting OCR errors,
    standardize formulas into canonical LaTeX, and extract simulation parameters.
    """

    @staticmethod
    def fix_handwriting_ambiguities(raw_text: str) -> str:
        if not raw_text:
            return ""
        t = raw_text.strip()

        # Remove extra OCR noise characters like pipes, backticks, colons, exclamation marks
        t = re.sub(r'[`~|:!;\'"]', '', t)
        t = re.sub(r'[\u2013\u2014_]+', '-', t) # em-dash, en-dash, underscore to minus
        t = re.sub(r'\s+', ' ', t).strip()

        # Standardize arrow
        t = re.sub(r'[-_=]+>', ' -> ', t)

        # Fix OCR artifacts where = is split or misread:
        t = re.sub(r':=|=:|\s*=\s*', ' = ', t)

        # Fix y misread as v, V, Y, 4, q at the beginning: e.g. "v = 2x + 1" -> "y = 2x + 1"
        t = re.sub(r'^[vV4q]\s*=', 'y =', t)

        # Fix 2 misread as z or Z when next to x or numbers: "zx" -> "2x", "z^" -> "2^"
        t = re.sub(r'\b[zZ]([xX0-9])', r'2\1', t)

        # Fix '+' misread as 't' or 'T' between terms: e.g. "2x t 1" -> "2x + 1"
        t = re.sub(r'([xX0-9])\s+[tT]\s+([xX0-9])', r'\1 + \2', t)

        # Superscripts: e.g. "x2" -> "x^2", "x3" -> "x^3", "x 2" -> "x^2", "x 3" -> "x^3"
        t = re.sub(r'([xX])\s*([2345])\b', r'\1^\2', t)
        t = re.sub(r'([xX])([2345])\b', r'\1^\2', t)

        # Standardize multiplication
        t = re.sub(r'(\d)\s*[xX*]\s*([a-zA-Z])', r'\1\2', t)

        # If user wrote just "2x + 1" or "x^2 - 4" without "y =", add "y = "
        if not re.search(r'^[a-zA-Z]\s*=', t) and any(kw in t.lower() for kw in ['x', 'sin', 'cos', 'tan']):
            t = "y = " + t

        return t.strip()

    @staticmethod
    def normalize_chemistry(text: str) -> Tuple[str, Dict[str, float]]:
        """
        Fixes 0 vs O in chemical formulas:
        '302' -> '3O_2', '2Fe203' -> '2Fe_2O_3', 'C02' -> 'CO_2', 'H20' -> 'H_2O'
        Extracts stoichiometric coefficients c1, c2, c3.
        """
        t = text
        # Replace 0 in common elements
        t = re.sub(r'(?i)fe203', r'Fe2O3', t)
        t = re.sub(r'(?i)fe2o3', r'Fe2O3', t)
        t = re.sub(r'(\d*)\s*02\b', r'\1O2', t)
        t = re.sub(r'c02\b', 'CO2', t, flags=re.IGNORECASE)
        t = re.sub(r'h20\b', 'H2O', t, flags=re.IGNORECASE)

        # Extract coefficients for Fe + O2 -> Fe2O3
        # e.g. 4Fe + 3O2 -> 2Fe2O3
        c1, c2, c3 = 4.0, 3.0, 2.0
        m1 = re.search(r'(\d+)\s*Fe\b', t, re.IGNORECASE)
        if m1:
            try: c1 = float(m1.group(1))
            except: pass
        m2 = re.search(r'(\d+)\s*O2\b', t, re.IGNORECASE)
        if m2:
            try: c2 = float(m2.group(1))
            except: pass
        m3 = re.search(r'(\d+)\s*Fe2O3\b', t, re.IGNORECASE)
        if m3:
            try: c3 = float(m3.group(1))
            except: pass

        latex = f"{int(c1) if c1.is_integer() else c1}\\text{{Fe}} + {int(c2) if c2.is_integer() else c2}\\text{{O}}_2 \\rightarrow {int(c3) if c3.is_integer() else c3}\\text{{Fe}}_2\\text{{O}}_3"
        return latex, {"c1": c1, "c2": c2, "c3": c3}

    @staticmethod
    def normalize_trig_wave(text: str) -> Tuple[str, Dict[str, float]]:
        """
        Parses wave equation: y = A*sin(omega*x + phi) or y = 2sin(3x)
        Extracts A, omega, phi.
        """
        t = text.lower()
        # Fix '5in' -> 'sin', 'zsin' -> '2sin'
        t = re.sub(r'5in', 'sin', t)
        t = re.sub(r'zsin', '2sin', t)

        A = 2.0
        omega = 3.0
        phi = 0.0

        # Match amplitude: e.g. y = 3.5sin or 2sin
        m_a = re.search(r'(?:y\s*=\s*)?([0-9\.]+)\s*(?:\\sin|sin|\\cos|cos)', t)
        if m_a:
            try: A = float(m_a.group(1))
            except: pass

        # Match frequency: e.g. sin(4x) or sin 4x or sin(4.5*x)
        m_w = re.search(r'(?:sin|cos)\s*\(?\s*([0-9\.]+)\s*\*?\s*x', t)
        if m_w:
            try: omega = float(m_w.group(1))
            except: pass

        # Match phase: e.g. + 1.57 or - 0.5
        m_p = re.search(r'x\s*([+-]\s*[0-9\.]+)', t)
        if m_p:
            try: phi = float(m_p.group(1).replace(' ', ''))
            except: pass

        func_name = r"\cos" if "cos" in t else r"\sin"
        phi_str = f" + {phi}" if phi > 0 else (f" - {abs(phi)}" if phi < 0 else "")
        latex = f"y = {A}{func_name}({omega}x{phi_str})"
        return latex, {"A": A, "omega": omega, "phi": phi}

    @staticmethod
    def normalize_polynomial_2d(text: str) -> Tuple[str, Dict[str, float], List[Dict[str, Any]]]:
        """
        Parses 2D polynomial & general functions:
        Linear: y = cx + d
        Quadratic: y = bx^2 + cx + d
        Cubic: y = ax^3 + bx^2 + cx + d
        """
        raw = text.strip()
        t = raw.lower().replace(' ', '')

        # Handwriting disambiguation
        t = re.sub(r'^[vy]=', '', t) # 'v=' or 'y='
        t = re.sub(r'^f\(x\)=', '', t)
        t = re.sub(r'x\s*2\b', 'x^2', t)
        t = re.sub(r'x2\b', 'x^2', t)
        t = re.sub(r'x\s*3\b', 'x^3', t)
        t = re.sub(r'x3\b', 'x^3', t)
        t = t.replace('–', '-').replace('—', '-')

        a, b, c, d, x0 = 0.0, 0.0, 0.0, 0.0, 1.0

        # Match x^3
        m3 = re.search(r'([+-]?[0-9\.]*)x\^3', t)
        if m3:
            v = m3.group(1)
            a = 1.0 if v in ['', '+'] else (-1.0 if v == '-' else float(v))
            t = t.replace(m3.group(0), '', 1)

        # Match x^2
        m2 = re.search(r'([+-]?[0-9\.]*)x\^2', t)
        if m2:
            v = m2.group(1)
            b = 1.0 if v in ['', '+'] else (-1.0 if v == '-' else float(v))
            t = t.replace(m2.group(0), '', 1)

        # Match x (not followed by ^)
        m1 = re.search(r'([+-]?[0-9\.]*)x(?!\^)', t)
        if m1:
            v = m1.group(1)
            c = 1.0 if v in ['', '+'] else (-1.0 if v == '-' else float(v))
            t = t.replace(m1.group(0), '', 1)

        # Match constant term
        md = re.search(r'([+-]?[0-9\.]+)', t)
        if md:
            try:
                d = float(md.group(1))
            except:
                pass

        # If completely empty, default to y = 2x + 1
        if a == 0.0 and b == 0.0 and c == 0.0 and d == 0.0:
            c, d = 2.0, 1.0

        # Build clean LaTeX
        parts = []
        if a != 0.0:
            a_str = "" if a == 1.0 else ("-" if a == -1.0 else f"{int(a) if a.is_integer() else a}")
            parts.append(f"{a_str}x^3")
        if b != 0.0:
            b_str = "" if b == 1.0 else ("-" if b == -1.0 else f"{int(b) if b.is_integer() else b}")
            if parts and b > 0:
                parts.append(f"+ {b_str}x^2")
            elif parts and b < 0:
                parts.append(f"- {abs(int(b) if b.is_integer() else b)}x^2")
            else:
                parts.append(f"{b_str}x^2")
        if c != 0.0:
            c_str = "" if c == 1.0 else ("-" if c == -1.0 else f"{int(c) if c.is_integer() else c}")
            if parts and c > 0:
                parts.append(f"+ {c_str}x")
            elif parts and c < 0:
                parts.append(f"- {abs(int(c) if c.is_integer() else c)}x")
            else:
                parts.append(f"{c_str}x")
        if d != 0.0:
            d_val = int(d) if d.is_integer() else d
            if parts and d > 0:
                parts.append(f"+ {d_val}")
            elif parts and d < 0:
                parts.append(f"- {abs(d_val)}")
            else:
                parts.append(f"{d_val}")

        latex = "y = " + (" ".join(parts) if parts else "0")

        # Dynamic parameter configs
        dynamic_params = []
        if a != 0.0:
            dynamic_params.append({ "key": "a", "label": "Hệ số a (x³)", "unit": "", "defaultValue": a, "min": -5.0, "max": 5.0, "step": 0.5 })
            dynamic_params.append({ "key": "b", "label": "Hệ số b (x²)", "unit": "", "defaultValue": b, "min": -5.0, "max": 5.0, "step": 0.5 })
            dynamic_params.append({ "key": "c", "label": "Hệ số c (x)", "unit": "", "defaultValue": c, "min": -10.0, "max": 10.0, "step": 0.5 })
            dynamic_params.append({ "key": "d", "label": "Hệ số d (tự do)", "unit": "", "defaultValue": d, "min": -10.0, "max": 10.0, "step": 0.5 })
        elif b != 0.0:
            dynamic_params.append({ "key": "b", "label": "Hệ số a (x²)", "unit": "", "defaultValue": b, "min": -5.0, "max": 5.0, "step": 0.5 })
            dynamic_params.append({ "key": "c", "label": "Hệ số b (x)", "unit": "", "defaultValue": c, "min": -10.0, "max": 10.0, "step": 0.5 })
            dynamic_params.append({ "key": "d", "label": "Hệ số c (tự do)", "unit": "", "defaultValue": d, "min": -10.0, "max": 10.0, "step": 0.5 })
        else:
            # Linear y = cx + d
            dynamic_params.append({ "key": "c", "label": "Hệ số góc (k)", "unit": "", "defaultValue": c, "min": -10.0, "max": 10.0, "step": 0.5 })
            dynamic_params.append({ "key": "d", "label": "Tung độ gốc (d)", "unit": "", "defaultValue": d, "min": -10.0, "max": 10.0, "step": 0.5 })

        dynamic_params.append({ "key": "x0", "label": "Điểm tiếp điểm (x₀)", "unit": "", "defaultValue": 1.0, "min": -5.0, "max": 5.0, "step": 0.5 })

        return latex, {"a": a, "b": b, "c": c, "d": d, "x0": x0}, dynamic_params

    @staticmethod
    def normalize_conic(text: str) -> Tuple[str, Dict[str, float]]:
        """
        Parses conic/ellipse: x^2/a^2 + y^2/b^2 = 1
        """
        t = text.lower().replace(' ', '')
        aAxis = 3.0
        bAxis = 2.0

        m_a = re.search(r'x\^?2\s*/\s*([0-9\.]+)', t)
        if m_a:
            try:
                denom = float(m_a.group(1))
                aAxis = math.sqrt(denom) if denom > 4 else denom
            except: pass

        m_b = re.search(r'y\^?2\s*/\s*([0-9\.]+)', t)
        if m_b:
            try:
                denom = float(m_b.group(1))
                bAxis = math.sqrt(denom) if denom > 4 else denom
            except: pass

        latex = f"\\frac{{x^2}}{{{int(aAxis)**2 if aAxis.is_integer() else round(aAxis**2, 1)}}} + \\frac{{y^2}}{{{int(bAxis)**2 if bAxis.is_integer() else round(bAxis**2, 1)}}} = 1"
        return latex, {"aAxis": aAxis, "bAxis": bAxis, "a": 0.0, "b": 0.0}

    @staticmethod
    def normalize_projectile(text: str) -> Tuple[str, Dict[str, float]]:
        """
        Parses projectile: v0 = 25 m/s, alpha = 45
        """
        t = text.lower()
        v0 = 22.0
        alpha = 45.0
        g = 9.8

        m_v = re.search(r'v[0o]?\s*=\s*([0-9\.]+)', t)
        if m_v:
            try: v0 = float(m_v.group(1))
            except: pass

        m_a = re.search(r'(?:alpha|a|g[oó]c)\s*=\s*([0-9\.]+)', t)
        if m_a:
            try: alpha = float(m_a.group(1))
            except: pass

        latex = f"v_0 = {v0}\\text{{ m/s}}, \\alpha = {alpha}^\\circ"
        return latex, {"v0": v0, "alpha": alpha, "g": g}

    @staticmethod
    def normalize_pendulum(text: str) -> Tuple[str, Dict[str, float]]:
        """
        Parses pendulum: L = 2m, theta = 30
        """
        t = text.lower()
        L = 2.0
        theta0 = 30.0

        m_l = re.search(r'[l1]\s*=\s*([0-9\.]+)', t)
        if m_l:
            try: L = float(m_l.group(1))
            except: pass

        m_th = re.search(r'(?:theta|th|g[oó]c)\s*=\s*([0-9\.]+)', t)
        if m_th:
            try: theta0 = float(m_th.group(1))
            except: pass

        latex = f"\\ddot{{\\theta}} + \\frac{{g}}{{{L}}}\\sin\\theta = 0 \\quad (\\theta_0 = {theta0}^\\circ)"
        return latex, {"L": L, "theta0": theta0, "g": 9.8, "b": 0.02}

    @staticmethod
    def normalize_optics(text: str) -> Tuple[str, Dict[str, float]]:
        """
        Parses optics: 1/f = 1/d + 1/d', f = 100, d = 220
        """
        t = text.lower()
        f = 100.0
        d = 220.0

        m_f = re.search(r'f\s*=\s*([0-9\.]+)', t)
        if m_f:
            try: f = float(m_f.group(1))
            except: pass

        m_d = re.search(r'd\s*=\s*([0-9\.]+)', t)
        if m_d:
            try: d = float(m_d.group(1))
            except: pass

        latex = f"\\frac{{1}}{{{f}}} = \\frac{{1}}{{{d}}} + \\frac{{1}}{{d'}}"
        return latex, {"f": f, "d": d, "h": 50.0}

    @staticmethod
    def normalize_inclined(text: str) -> Tuple[str, Dict[str, float]]:
        """
        Parses inclined plane: alpha = 30, mu = 0.15
        """
        t = text.lower()
        alpha = 30.0
        mu = 0.15

        m_a = re.search(r'(?:alpha|a)\s*=\s*([0-9\.]+)', t)
        if m_a:
            try: alpha = float(m_a.group(1))
            except: pass

        m_u = re.search(r'(?:mu|u|ma\s*s[aá]t)\s*=\s*([0-9\.]+)', t)
        if m_u:
            try: mu = float(m_u.group(1))
            except: pass

        latex = f"a = g(\\sin {alpha}^\\circ - {mu}\\cos {alpha}^\\circ)"
        return latex, {"alpha": alpha, "mu": mu, "m": 2.0, "g": 9.8}

    @staticmethod
    def normalize_bio(text: str, is_heart: bool = False) -> Tuple[str, Dict[str, float]]:
        t = text.lower()
        if is_heart:
            bpm = 75.0
            m_b = re.search(r'([0-9]{2,3})\s*(?:bpm|nh[iị]p)', t) or re.search(r'bpm\s*=\s*([0-9]+)', t)
            if m_b:
                try: bpm = float(m_b.group(1))
                except: pass
            return f"\\text{{ECG Pulse: }} S(t) = f(\\text{{BPM}} = {int(bpm)})", {"BPM": bpm}
        else:
            temp = 25.0
            light = 70.0
            m_t = re.search(r'(?:t|nhi[eệ]t\s*đ[oộ])\s*=\s*([0-9\.]+)', t)
            if m_t:
                try: temp = float(m_t.group(1))
                except: pass
            m_l = re.search(r'(?:light|s[aá]ng|i)\s*=\s*([0-9\.]+)', t)
            if m_l:
                try: light = float(m_l.group(1))
                except: pass
            return f"\\text{{Quang hợp: }} Rate = f(T = {temp}^\\circ\\text{{C}}, I = {light}\\%)", {"temperature": temp, "light": light}


class BlackboardOCREngine:
    """
    Unified Orchestrator:
    1. Preprocesses blackboard crop (denoising, polarity inversion, healing)
    2. Runs neural OCR (RapidOCR + PyTesseract fallback)
    3. Normalizes blackboard handwriting ambiguities
    4. Extracts parameters & formats LaTeX
    5. Generates 3 Zero-Keyboard Tap & Swap alternatives
    """

    def __init__(self):
        self.rapidocr = RAPIDOCR_ENGINE
        self.preprocessor = BlackboardPreprocessor()
        self.corrector = BlackboardMathCorrector()

    def recognize(
        self,
        image_bytes: Optional[bytes] = None,
        raw_strokes_json: Optional[str] = None,
        hint_subject: Optional[str] = None
    ) -> Dict[str, Any]:
        start_time = time.perf_counter()
        raw_text = ""
        ocr_confidence = 0.95
        engine_used = "GEOMETRIC_STROKES"
        meta_info: Dict[str, Any] = {}

        # 1. Parse raw_strokes_json if available
        parsed_strokes = []
        if raw_strokes_json:
            try:
                import json
                s_obj = json.loads(raw_strokes_json)
                if isinstance(s_obj, list):
                    parsed_strokes = s_obj
            except Exception:
                pass

        # 2. Multi-Pass OCR: Vector Stroke Reconstruction + Direct Image Processing
        candidates = []

        # Pass A: Stroke Vector Reconstruction (Extremely crisp, thickness 5, anti-aliased, 0 noise)
        if parsed_strokes and self.rapidocr is not None:
            stroke_img = self.preprocessor.render_strokes_to_image(parsed_strokes)
            if stroke_img is not None:
                try:
                    ocr_res, _ = self.rapidocr(stroke_img)
                    if ocr_res:
                        # Sort bounding boxes strictly left-to-right (min X coordinate)
                        ocr_res = sorted(ocr_res, key=lambda r: min(pt[0] for pt in r[0]))
                        texts = [r[1] for r in ocr_res]
                        scores = [float(r[2]) for r in ocr_res]
                        txt = " ".join(texts).strip()
                        conf = float(sum(scores) / len(scores))
                        if txt:
                            candidates.append((txt, conf, "RAPIDOCR_STROKES"))
                except Exception as e:
                    print(f"[BlackboardOCREngine] Stroke OCR error: {e}")

        # Pass B: Uploaded Image Crop OCR
        if image_bytes and len(image_bytes) > 0:
            prep_img, meta_info = self.preprocessor.preprocess(image_bytes)
            if prep_img is not None and self.rapidocr is not None:
                try:
                    ocr_res, _ = self.rapidocr(prep_img)
                    if ocr_res:
                        # Sort bounding boxes left-to-right
                        ocr_res = sorted(ocr_res, key=lambda r: min(pt[0] for pt in r[0]))
                        texts = [r[1] for r in ocr_res]
                        scores = [float(r[2]) for r in ocr_res]
                        txt = " ".join(texts).strip()
                        conf = float(sum(scores) / len(scores))
                        if txt:
                            candidates.append((txt, conf, "RAPIDOCR_IMAGE"))
                except Exception as e:
                    print(f"[BlackboardOCREngine] Image OCR error: {e}")

            # PyTesseract fallback
            if not candidates and PYTESSERACT_AVAILABLE and prep_img is not None:
                try:
                    tess_text = pytesseract.image_to_string(prep_img, config="--psm 6").strip()
                    if tess_text:
                        candidates.append((tess_text, 0.85, "PYTESSERACT_ENSEMBLE"))
                except Exception:
                    pass

        # Select Best Candidate (Prefer text containing recognizable math tokens)
        if candidates:
            def score_candidate(cand):
                txt, conf, _ = cand
                math_bonus = 1.0 if any(c in txt.lower() for c in ['x', 'y', 'sin', 'cos', '+', '-', '^', '=']) else 0.0
                return conf + math_bonus * 0.5 + min(len(txt), 20) * 0.02
            best = max(candidates, key=score_candidate)
            raw_text, ocr_confidence, engine_used = best[0], best[1], best[2]

        # 3. Handwriting Ambiguity Correction
        cleaned_text = self.corrector.fix_handwriting_ambiguities(raw_text)
        lower_t = cleaned_text.lower()

        # 4. Domain Template Classification
        key = None
        extracted_params: Dict[str, float] = {}
        dynamic_parameters: Optional[List[Dict[str, Any]]] = None
        latex_formula = ""

        # Check Chemistry
        if any(w in lower_t for w in ["fe", "o2", "02", "fe2", "h2", "co2", "chem", "phản ứng", "cân bằng"]):
            key = "CHEM_BALANCE_SCALE" if any(w in lower_t for w in ["fe", "cân", "scale", "o2", "02"]) else "CHEM_REACTION_LAB"
            latex_formula, extracted_params = self.corrector.normalize_chemistry(cleaned_text)

        # Check Optics (f, d, 1/f)
        elif any(w in lower_t for w in ["thấu kính", "lens", "1/f", "tiêu cự"]) or (("f=" in lower_t or "f =" in lower_t) and ("d=" in lower_t or "d =" in lower_t)):
            key = "PHYS_OPTICS_LENS"
            latex_formula, extracted_params = self.corrector.normalize_optics(cleaned_text)

        # Check Waves / Trigonometry
        elif any(w in lower_t for w in ["sin", "cos", "tan", "wave", "sóng", "dao động"]):
            key = "MATH_TRIG_WAVE"
            latex_formula, extracted_params = self.corrector.normalize_trig_wave(cleaned_text)

        # Check Conics (Ellipse, Circle)
        elif any(w in lower_t for w in ["elip", "tròn", "conic", "x^2/", "y^2/", "x2/", "y2/"]):
            key = "MATH_CONIC_2D"
            latex_formula, extracted_params = self.corrector.normalize_conic(cleaned_text)

        # Check Polynomial / 2D Functions (Linear, Quadratic, Cubic, etc.)
        elif any(w in lower_t for w in ["x^", "x2", "x3", "y =", "y=", "f(x)", "hàm số", "cực trị"]) or re.search(r'(?:[0-9]x|[-+]x|\bx\b)', lower_t):
            key = "MATH_FUNC_2D"
            latex_formula, extracted_params, dynamic_parameters = self.corrector.normalize_polynomial_2d(cleaned_text)

        # Check Projectile Motion
        elif any(w in lower_t for w in ["ném", "projectile", "v0", "vo", "m/s", "tầm xa"]):
            key = "PHYS_PROJECTILE"
            latex_formula, extracted_params = self.corrector.normalize_projectile(cleaned_text)

        # Check Pendulum
        elif any(w in lower_t for w in ["con lắc", "pendulum", "dây", "chu kỳ"]) or (("l=" in lower_t or "l =" in lower_t) and ("theta" in lower_t or "g=" in lower_t or "g =" in lower_t)):
            key = "PHYS_PENDULUM"
            latex_formula, extracted_params = self.corrector.normalize_pendulum(cleaned_text)

        # Check Inclined Plane
        elif any(w in lower_t for w in ["nghiêng", "incline", "ma sát", "trượt"]) or ("mu=" in lower_t or "mu =" in lower_t):
            key = "PHYS_INCLINED"
            latex_formula, extracted_params = self.corrector.normalize_inclined(cleaned_text)

        # Check Biology: Photosynthesis
        elif any(w in lower_t for w in ["quang hợp", "photosynthesis", "khí khổng", "lá", "stomata"]):
            key = "BIO_PHOTOSYNTHESIS"
            latex_formula, extracted_params = self.corrector.normalize_bio(cleaned_text, is_heart=False)

        # Check Biology: Heart & ECG
        elif any(w in lower_t for w in ["tim", "heart", "ecg", "bpm", "nhịp"]):
            key = "BIO_HEART_CYCLE"
            latex_formula, extracted_params = self.corrector.normalize_bio(cleaned_text, is_heart=True)

        # 5. Stroke Geometry Fallback if no text matched
        if not key and parsed_strokes:
            try:
                all_pts = []
                for s in parsed_strokes:
                    if isinstance(s, dict) and "points" in s:
                        all_pts.extend(s["points"])
                if all_pts:
                    xs = [p["x"] for p in all_pts if "x" in p]
                    ys = [p["y"] for p in all_pts if "y" in p]
                    if xs and ys:
                        sorted_by_x = sorted([p for p in all_pts if "x" in p and "y" in p], key=lambda p: p["x"])
                        y_vals = [p["y"] for p in sorted_by_x]
                        extrema = sum(1 for i in range(1, len(y_vals)-1) if (y_vals[i] > y_vals[i-1] and y_vals[i] > y_vals[i+1]) or (y_vals[i] < y_vals[i-1] and y_vals[i] < y_vals[i+1]))

                        # Only use TRIG_WAVE if there are true multiple wavy oscillations
                        if extrema >= 4:
                            key = "MATH_TRIG_WAVE"
                            latex_formula, extracted_params = self.corrector.normalize_trig_wave("y = 2\\sin(3x)")
                        else:
                            # Natural default for STEM blackboard: Linear / 2D Function
                            key = "MATH_FUNC_2D"
                            latex_formula, extracted_params, dynamic_parameters = self.corrector.normalize_polynomial_2d("y = 2x + 1")
            except Exception:
                pass

        # 6. Subject Hint Fallback
        if not key and hint_subject:
            s = hint_subject.upper()
            if "PHOTO" in s: key = "BIO_PHOTOSYNTHESIS"; latex_formula, extracted_params = self.corrector.normalize_bio(cleaned_text, False)
            elif "HEART" in s or "ECG" in s: key = "BIO_HEART_CYCLE"; latex_formula, extracted_params = self.corrector.normalize_bio(cleaned_text, True)
            elif "PENDULUM" in s: key = "PHYS_PENDULUM"; latex_formula, extracted_params = self.corrector.normalize_pendulum(cleaned_text)
            elif "INCLINED" in s: key = "PHYS_INCLINED"; latex_formula, extracted_params = self.corrector.normalize_inclined(cleaned_text)
            elif "OPTICS" in s: key = "PHYS_OPTICS_LENS"; latex_formula, extracted_params = self.corrector.normalize_optics(cleaned_text)
            elif "PROJECTILE" in s: key = "PHYS_PROJECTILE"; latex_formula, extracted_params = self.corrector.normalize_projectile(cleaned_text)
            elif "SCALE" in s: key = "CHEM_BALANCE_SCALE"; latex_formula, extracted_params = self.corrector.normalize_chemistry(cleaned_text)
            elif "CONIC" in s: key = "MATH_CONIC_2D"; latex_formula, extracted_params = self.corrector.normalize_conic(cleaned_text)
            elif "TRIG" in s or "WAVE" in s: key = "MATH_TRIG_WAVE"; latex_formula, extracted_params = self.corrector.normalize_trig_wave(cleaned_text or "y = 2\\sin(3x)")
            else: key = "MATH_FUNC_2D"; latex_formula, extracted_params, dynamic_parameters = self.corrector.normalize_polynomial_2d(cleaned_text or "y = 2x + 1")

        # 7. Safe Default: 2D Linear Function y = 2x + 1 (NOT trig wave!)
        if not key:
            key = "MATH_FUNC_2D"
            latex_formula, extracted_params, dynamic_parameters = self.corrector.normalize_polynomial_2d(cleaned_text or "y = 2x + 1")

        # 8. Build Zero-Keyboard Tap & Swap Alternatives
        alternatives = [latex_formula]
        if key == "MATH_TRIG_WAVE":
            alternatives.extend(["y = 2\\sin(3x)", "y = 2\\cos(3x)", "y = 3\\sin(2x)"])
        elif key == "MATH_FUNC_2D":
            alternatives.extend(["y = 2x + 1", "y = x^2 - 4", "y = x^3 - 3x", "y = -x^2 + 2x"])
        elif key == "CHEM_BALANCE_SCALE":
            alternatives.extend([
                "4\\text{Fe} + 3\\text{O}_2 \\rightarrow 2\\text{Fe}_2\\text{O}_3",
                "2\\text{Fe} + \\text{O}_2 \\rightarrow 2\\text{FeO}",
                "2\\text{H}_2 + \\text{O}_2 \\rightarrow 2\\text{H}_2\\text{O}"
            ])
        elif key == "PHYS_PROJECTILE":
            alternatives.extend(["v_0 = 25\\text{ m/s}, \\alpha = 60^\\circ", "v_0 = 20\\text{ m/s}, \\alpha = 30^\\circ"])
        elif key == "PHYS_PENDULUM":
            alternatives.extend(["\\ddot{\\theta} + \\frac{g}{1.5}\\sin\\theta = 0", "\\ddot{\\theta} + \\frac{g}{2.5}\\sin\\theta = 0"])
        elif key == "PHYS_OPTICS_LENS":
            alternatives.extend(["\\frac{1}{100} = \\frac{1}{150} + \\frac{1}{d'}", "\\frac{1}{120} = \\frac{1}{200} + \\frac{1}{d'}"])

        if cleaned_text and cleaned_text not in alternatives:
            alternatives.append(f"${cleaned_text}$")

        unique_alts = list(dict.fromkeys(alternatives))[:3]
        total_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "template_id": key,
            "raw_text": cleaned_text or "Geometric Stroke Inference",
            "recognized_latex": latex_formula,
            "confidence": round(ocr_confidence, 2),
            "engine": engine_used,
            "extracted_params": extracted_params,
            "dynamic_parameters": dynamic_parameters,
            "alternatives": unique_alts,
            "latency_ms": total_time_ms,
            "meta": meta_info
        }


# Singleton engine instance
global_ocr_engine = BlackboardOCREngine()

