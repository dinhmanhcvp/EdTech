#!/usr/bin/env bash
# Chuyển gói PDF thi công sang bản cho CorelDRAW: chữ → nét (curves), giữ tỉ lệ 1:1 mm. Dùng: ./corel-export.sh out-thi-cong-socratic
set -euo pipefail
SRC=${1:-out-thi-cong-socratic}; DST="${SRC}-corel"; rm -rf "$DST"
find "$SRC" -name '*.pdf' | while read -r f; do o="$DST/${f#$SRC/}"; mkdir -p "$(dirname "$o")"; gs -q -o "$o" -sDEVICE=pdfwrite -dNoOutputFonts -dCompatibilityLevel=1.5 -dAutoRotatePages=/None "$f"; done
[ -d "$SRC/xem-truoc" ] && cp -r "$SRC/xem-truoc" "$DST/"
cp "$(dirname "$0")/HUONG-DAN-MO-BANG-COREL.txt" "$(dirname "$0")/ChuyenPDFsangCDR.bas" "$DST/"
echo "$(find "$DST" -name '*.pdf' | wc -l) PDF → $DST"
