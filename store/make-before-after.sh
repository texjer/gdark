#!/bin/sh
# Builds store/screenshot-1-before-after.png (1280x800) from two raw
# screenshots of the same open email: store/before.png (DarkBox off) and
# store/after.png (DarkBox on). Any size; each is scaled to fit its half.
# Usage: ./store/make-before-after.sh
set -e
cd "$(dirname "$0")"
for f in before.png after.png; do [ -f "$f" ] || { echo "missing $f"; exit 1; }; done
magick before.png -resize 616x680 -bordercolor '#2a2a31' -border 2 -gravity north -background none -extent 620x684 _l.png
magick after.png  -resize 616x680 -bordercolor '#2a2a31' -border 2 -gravity north -background none -extent 620x684 _r.png
magick -size 1280x800 xc:'#121216' \
  _l.png -gravity northwest -geometry +14+96 -composite \
  _r.png -gravity northwest -geometry +646+96 -composite \
  -font Helvetica -pointsize 30 -fill '#a2a2ac' -gravity northwest -annotate +14+40 'Gmail Dark theme' \
  -font Helvetica -pointsize 30 -fill '#e3e3e8' -gravity northwest -annotate +646+40 'Gmail Dark theme + DarkBox' \
  screenshot-1-before-after.png
rm -f _l.png _r.png
echo "wrote $(pwd)/screenshot-1-before-after.png"
