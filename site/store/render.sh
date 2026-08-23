#!/usr/bin/env bash
# Renders every artboard in this directory to a 1280x800 PNG - the Chrome Web
# Store listing size, also accepted by Edge Add-ons and AMO.
#
# Usage: bash site/store/render.sh
set -euo pipefail

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="$dir/png"
mkdir -p "$out"

# Any Chromium will do; the first one found wins.
for candidate in \
  "/c/Program Files/Google/Chrome/Application/chrome.exe" \
  "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  "$(command -v google-chrome || true)" \
  "$(command -v chromium || true)"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then browser="$candidate"; break; fi
done

if [ -z "${browser:-}" ]; then
  echo "No Chromium-based browser found." >&2
  exit 1
fi

for html in "$dir"/0*.html; do
  name="$(basename "$html" .html)"
  # Windows-style path so the browser resolves the file:// URL and the output.
  url="file:///$(cd "$dir" && pwd -W)/$name.html"
  target="$(cd "$out" && pwd -W)/$name.png"

  "$browser" \
    --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=1280,800 \
    --virtual-time-budget=3000 \
    --screenshot="$target" "$url" >/dev/null 2>&1

  echo "  $name.png"
done

echo "Wrote $(ls -1 "$out"/*.png | wc -l) screenshots to site/store/png/"
