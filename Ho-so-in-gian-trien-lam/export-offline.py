# Đóng gói studio 3D + trang dự toán thành file HTML chạy offline (nhúng three.js + font), để gửi qua Zalo/email.
# Chạy: python3 export-offline.py <thư mục node_modules/three> → ban-gui/
import base64, os, re, sys
ROOT = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(ROOT, 'ban-gui'); os.makedirs(OUT, exist_ok=True)
THREE = sys.argv[1]
b64 = lambda data, mime: f'data:{mime};base64,' + base64.b64encode(data).decode()

def font_css():
    css = open(os.path.join(ROOT, 'fonts/fonts.css'), encoding='utf-8').read()
    return re.sub(r"url\(['\"]?([^'\")]+\.woff2)['\"]?\)", lambda m: f"url({b64(open(os.path.join(ROOT, 'fonts', os.path.basename(m.group(1))), 'rb').read(), 'font/woff2')})", css)

def strip_gfonts(html):
    html = re.sub(r'<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>\s*', '', html)
    head = '<!doctype html>\n<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n'
    return head + f'<style>{font_css()}</style>\n' + html + '\n</html>'

def three_importmap(entries):
    mods, todo = {}, list(entries)
    while todo:
        spec = todo.pop()
        if spec in mods: continue
        path = os.path.join(THREE, 'build/three.module.js') if spec == 'three' else os.path.join(THREE, 'examples/jsm', spec[len('three/addons/'):])
        src = open(path, encoding='utf-8').read()
        def rel(m):
            q, target = m.group(1), m.group(2)
            if target.startswith('.'):
                base = os.path.dirname(spec[len('three/addons/'):]); norm = os.path.normpath(os.path.join(base, target)).replace(os.sep, '/')
                ns = 'three/addons/' + norm; todo.append(ns); return f'from {q}{ns}{q}'
            if target != 'three': todo.append(target)
            return m.group(0)
        src = re.sub(r"from\s+(['\"])([^'\"]+)\1", rel, src)
        mods[spec] = b64(src.encode(), 'text/javascript')
    return mods

# ---- studio ----
s = open(os.path.join(ROOT, 'studio-3d/booth-studio.html'), encoding='utf-8').read()
specs = set(re.findall(r"from '(three(?:/addons/[^']+)?)'", s))
mods = three_importmap(specs)
imap = '{\n  "imports": {\n' + ',\n'.join(f'    "{k}": "{v}"' for k, v in mods.items()) + '\n  }\n}'
s = re.sub(r'(<script type="importmap">)\s*\{.*?\}\s*\}\s*(</script>)', lambda m: m.group(1) + imap + m.group(2), s, count=1, flags=re.S)
assert 'cdn.jsdelivr' not in s, 'còn link CDN'
s = strip_gfonts(s)
open(os.path.join(OUT, 'Studio-3D-gian-Socratic-GAVIS.html'), 'w', encoding='utf-8').write(s)
# ---- dự toán ----
d = strip_gfonts(open(os.path.join(ROOT, 'du-toan/du-toan-gian.html'), encoding='utf-8').read())
open(os.path.join(OUT, 'Du-toan-gian-trien-lam.html'), 'w', encoding='utf-8').write(d)
for f in sorted(os.listdir(OUT)): print(f, round(os.path.getsize(os.path.join(OUT, f)) / 1e6, 2), 'MB')
