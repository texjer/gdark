#!/bin/sh
# Packages the extension into dist/gdark-<version>.zip — the same file is
# uploaded to addons.mozilla.org and the Chrome Web Store.
set -e
cd "$(dirname "$0")"
v=$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")
mkdir -p dist
out="dist/gdark-$v.zip"
rm -f "$out"
zip -q -X "$out" manifest.json gate.js content.js darkbox.css popup.html popup.js popup.css icons/icon-*.png
echo "built $out"
unzip -l "$out"
