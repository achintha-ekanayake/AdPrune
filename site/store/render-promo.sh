#!/usr/bin/env bash
# Renders promo-small.html to the Chrome Web Store small promo tile: 440x280,
# 24-bit PNG (no alpha) plus a JPEG. Edge Add-ons uses the same size.
#
# Usage: bash site/store/render-promo.sh
set -euo pipefail

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="$dir/png"
mkdir -p "$out"

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

for shell in pwsh powershell; do
  if command -v "$shell" >/dev/null 2>&1; then ps="$shell"; break; fi
done

if [ -z "${ps:-}" ]; then
  echo "No PowerShell found; cannot flatten the alpha channel." >&2
  exit 1
fi

url="file:///$(cd "$dir" && pwd -W)/promo-small.html"
raw="$(cd "$out" && pwd -W)/promo-small-rgba.png"

"$browser" \
  --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=440,280 \
  --virtual-time-budget=3000 \
  --screenshot="$raw" "$url" >/dev/null 2>&1

"$ps" -NoProfile -File "$(cd "$dir" && pwd -W)/flatten.ps1" \
  -In "$raw" \
  -OutPng "$(cd "$out" && pwd -W)/promo-small-440x280.png" \
  -OutJpg "$(cd "$out" && pwd -W)/promo-small-440x280.jpg"

rm -f "$out/promo-small-rgba.png"

echo "Wrote site/store/png/promo-small-440x280.{png,jpg}"
