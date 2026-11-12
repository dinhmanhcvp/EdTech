# Dựng bản final: build -> PDF -> đo số trang từng mục -> ghi toc_pages.json -> build lại cho đến khi ổn định.
# Chạy: python -X utf8 lam_final.py   (cần LibreOffice và pymupdf)
import json, os, re, shutil, subprocess, sys, tempfile
import pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
SOFFICE = r"C:\Program Files\LibreOffice\program\soffice.exe"
DOCX = os.path.join(HERE, "BAO_CAO_FRESHNOSE_final.docx")


def build():
    subprocess.run([sys.executable, "-X", "utf8", "build_docx.py", "bao-cao_final-mau-2026.md"], cwd=HERE, check=True, stdout=subprocess.DEVNULL)
    out = tempfile.mkdtemp()
    subprocess.run([SOFFICE, "--headless", "--convert-to", "pdf", "--outdir", out, DOCX], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return os.path.join(out, "BAO_CAO_FRESHNOSE_final.pdf")


def measure(pdf):
    d = pymupdf.open(pdf)
    norm = lambda t: re.sub(r"\s+", "", t)
    texts = [norm(p.get_text()) for p in d]
    entries = json.load(open(os.path.join(HERE, "toc_entries.json"), encoding="utf8"))
    toc_page = next(i for i, t in enumerate(texts) if "MỤCLỤC" in t)
    body = [i for i in range(1, len(texts)) if i != toc_page]   # bỏ bìa và trang mục lục
    pages = {}
    for e in entries:
        key = norm(e["key"])
        pages[e["name"]] = next((i + 1 for i in body if key in texts[i]), None)
    return len(d), pages


for attempt in range(4):
    pdf = build()
    n, pages = measure(pdf)
    old_path = os.path.join(HERE, "toc_pages.json")
    old = json.load(open(old_path, encoding="utf8")) if os.path.exists(old_path) else {}
    missing = [k for k, v in pages.items() if v is None]
    if missing: print("khong tim thay muc:", missing)
    json.dump(pages, open(old_path, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print(f"lan {attempt + 1}: {n} trang", "on dinh" if pages == old else "doi so trang, build lai")
    if pages == old:
        shutil.copy(pdf, os.path.join(HERE, "BAO_CAO_FRESHNOSE_final.pdf"))
        break
print(json.dumps(pages, ensure_ascii=False))
