#!/bin/sh
# Renders the PWA icons from the SVG sources next to this script with headless Chrome.
# Run from anywhere after editing a source: ./icons/generate.sh (needs google-chrome or chromium).
set -eu

# Source folder, output folder and a throwaway folder for the render pages.
HERE="$(cd "$(dirname "$0")" && pwd)"
PUBLIC="$HERE/../public"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# First Chrome binary found on the PATH.
CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser)"

# Renders one SVG source to a square PNG of the given size, keeping transparency.
render() {
  source="$1"
  size="$2"
  output="$3"
  cat > "$TMP/page.html" <<EOF
<!doctype html><html><body style="margin:0;background:transparent">
<img src="file://$HERE/$source" width="$size" height="$size" style="display:block">
</body></html>
EOF
  "$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor=1 --window-size="$size,$size" \
    --default-background-color=00000000 \
    --screenshot="$PUBLIC/icons/$output" "file://$TMP/page.html" > /dev/null 2>&1
  echo "icons/$output (${size}px)"
}

mkdir -p "$PUBLIC/icons"
render icon.svg 192 icon-192.png
render icon.svg 512 icon-512.png
render icon-maskable.svg 192 icon-maskable-192.png
render icon-maskable.svg 512 icon-maskable-512.png
render icon-maskable.svg 180 apple-touch-icon.png

# The favicon is the standard icon itself, served as SVG.
cp "$HERE/icon.svg" "$PUBLIC/favicon.svg"
echo "favicon.svg"
