#!/usr/bin/env bash
# Proxy 1080p30 H.264 8-bit (+ âm thanh AAC) cho mọi clip trong raw/ → socratic-video/public/fn/<số>.mp4
# Chạy: bash freshnose-video/tools/proxy.sh
FF="C:/Users/Admin/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/../socratic-video/public/fn"
mkdir -p "$OUT"
for f in "$ROOT"/raw/FX30_*.MP4; do
  n=$(basename "$f" .MP4); n=${n#FX30_}
  [ -f "$OUT/$n.mp4" ] && continue
  "$FF" -v error -y -i "$f" -vf "scale=1920:1080:flags=lanczos,fps=30,format=yuv420p" -c:v libx264 -crf 17 -preset medium -g 15 -c:a aac -b:a 192k -ar 48000 "$OUT/$n.mp4" && echo "proxy $n"
done
