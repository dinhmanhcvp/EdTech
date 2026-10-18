import urllib.request
import json
import base64
import io
import math
import sys
from PIL import Image, ImageDraw

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def test_pipeline():
    # 1. Generate real high-contrast 512x256 image with black wave stroke (mimicking offscreen exporter)
    img = Image.new('RGB', (512, 256), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    pts = []
    for x in range(50, 460):
        y = 128 + int(50 * math.sin((x - 50) * 0.04))
        pts.append((x, y))
    draw.line(pts, fill=(0, 0, 0), width=8)

    buf = io.BytesIO()
    img.save(buf, format='PNG')
    b64_str = base64.b64encode(buf.getvalue()).decode('utf-8')
    data_url = f'data:image/png;base64,{b64_str}'

    # 2. Test Direct FastAPI Endpoint (Port 8000)
    payload = json.dumps({
        'image_base64': data_url,
        'hint_text': 'y = 2sin(x)'
    }).encode('utf-8')

    req = urllib.request.Request(
        'http://localhost:8000/api/v1/canvas/compile-lasso',
        data=payload,
        headers={'Content-Type': 'application/json'}
    )
    res = urllib.request.urlopen(req)
    assert res.status == 200, f'Expected 200, got {res.status}'
    data = json.loads(res.read().decode('utf-8'))
    bp = data['simulation_blueprint']
    ocr = data['ocr_result']
    print('=== Test 1: Real Base64 Image of y = 2sin(x) ===')
    print('Status: 200 OK')
    print('Template ID:', bp['templateId'])
    print('Recognized LaTeX:', bp['recognizedLatex'])
    print('Engine:', bp['engine'])
    print('Parameters:', {p['key']: p['defaultValue'] for p in bp['parameters']})
    assert bp['templateId'] == 'MATH_TRIG_WAVE'
    assert bp['engine'] == 'MATH'

    # 3. Test Next.js Proxy Rewrite (Port 3001 -> Port 8000)
    req_proxy = urllib.request.Request(
        'http://localhost:3001/api/v1/canvas/compile-lasso',
        data=payload,
        headers={'Content-Type': 'application/json'}
    )
    res_proxy = urllib.request.urlopen(req_proxy)
    assert res_proxy.status == 200, f'Expected 200, got {res_proxy.status}'
    data_proxy = json.loads(res_proxy.read().decode('utf-8'))
    print('\n=== Test 2: Next.js Rewrite Proxy (Port 3001) ===')
    print('Status: 200 OK')
    print('Template ID:', data_proxy['simulation_blueprint']['templateId'])
    assert data_proxy['simulation_blueprint']['templateId'] == 'MATH_TRIG_WAVE'

    # 4. Test STEM Categories Fuzzy Matcher
    test_cases = [
        ('ném xiên v0 = 22 m/s', 'PHYS_PROJECTILE', 'PHYSICS'),
        ('con lắc đơn L = 2.0m', 'PHYS_PENDULUM', 'PHYSICS'),
        ('4Fe + 3O2 -> 2Fe2O3', 'CHEM_BALANCE_SCALE', 'CHEMISTRY'),
        ('Mg + HCl phản ứng sủi bọt', 'CHEM_REACTION_LAB', 'CHEMISTRY'),
        ('quang hợp nhiệt độ 25 độ C', 'BIO_PHOTOSYNTHESIS', 'BIOLOGY'),
    ]

    print('\n=== Test 3: STEM Fuzzy Template Classifier ===')
    for hint, expected_tpl, expected_engine in test_cases:
        p = json.dumps({'image_base64': data_url, 'hint_text': hint}).encode('utf-8')
        r = urllib.request.Request(
            'http://localhost:8000/api/v1/canvas/compile-lasso',
            data=p,
            headers={'Content-Type': 'application/json'}
        )
        resp = urllib.request.urlopen(r)
        d = json.loads(resp.read().decode('utf-8'))
        t_id = d['simulation_blueprint']['templateId']
        eng = d['simulation_blueprint']['engine']
        print(f"[{hint}] -> {t_id} ({eng})")
        assert t_id == expected_tpl, f"Expected {expected_tpl}, got {t_id}"
        assert eng == expected_engine, f"Expected {expected_engine}, got {eng}"

    print('\n>>> ALL PIPELINE TESTS VERIFIED & PASSED SUCCESSFULLY! <<<')

if __name__ == '__main__':
    test_pipeline()
