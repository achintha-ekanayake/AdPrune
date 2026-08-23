#!/usr/bin/env bash
#
# Reproduces the exact Firefox package submitted to addons.mozilla.org.
# Every technical step required for the build lives here; see REVIEWERS.md.

set -euo pipefail

cd "$(dirname "$0")/.."

REQUIRED_NODE_MAJOR=22

echo "==> Checking build environment"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is not installed. Node.js ${REQUIRED_NODE_MAJOR}.x or newer is required." >&2
  echo "See REVIEWERS.md section 1 for installation instructions." >&2
  exit 1
fi

node_major="$(node --version | sed 's/^v\([0-9]*\).*/\1/')"
if [ "$node_major" -lt "$REQUIRED_NODE_MAJOR" ]; then
  echo "Error: Node.js ${REQUIRED_NODE_MAJOR}.x or newer is required (found $(node --version))." >&2
  exit 1
fi

echo "    node $(node --version)"
echo "    npm  v$(npm --version)"

echo "==> Installing pinned dependencies (npm ci)"
npm ci

echo "==> Building the Firefox package"
npm run zip:firefox

echo
echo "==> Done. Package written to:"
ls -1 .output/*firefox.zip
echo
echo "An unpacked copy of the same build is in .output/firefox-mv3/"
