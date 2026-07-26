#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
OUTPUT_DIR="$SCRIPT_DIR/build/bin"
APP_NAME="xmreader"
APP_BUNDLE="$OUTPUT_DIR/$APP_NAME.app"
DMG_NAME="${APP_NAME}-installer"
DMG_PATH="$OUTPUT_DIR/$DMG_NAME.dmg"
DMG_WORKDIR="$OUTPUT_DIR/.dmg-root"

echo "============================================"
echo "  XMReader: macOS one-click build"
echo "============================================"
echo ""

# 1. Check dependencies
echo "[1/6] Checking environment..."
for cmd in go bun wails; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "  [X] $cmd not found"
        echo "  Try:"
        echo "    go  -> https://go.dev/dl/"
        echo "    bun -> curl -fsSL https://bun.sh/install | bash"
        echo "    wails -> go install github.com/wailsapp/wails/v2/cmd/wails@latest"
        exit 1
    fi
    echo "  - $cmd: OK"
done

# 2. Install frontend dependencies
echo ""
echo "[2/6] Installing frontend dependencies..."
cd "$FRONTEND_DIR"
bun install
echo "  Done"

# 3. Build frontend
echo ""
echo "[3/6] Building frontend (Vite)..."
bun run build
echo "  Done"

# 4. Prepare Wails build assets
echo ""
echo "[4/6] Preparing application icon..."
cd "$SCRIPT_DIR"
go run ./scripts/buildassets
echo "  Done"

# 5. Build universal macOS app
echo ""
echo "[5/6] Building universal macOS app (Go + Wails)..."
wails build -platform darwin/universal -clean -o "$APP_NAME" -s -skipbindings
echo "  Done"

# 6. Package DMG if available
echo ""
echo "[6/6] Packaging installer..."
if [ -d "$APP_BUNDLE" ]; then
    echo "  App bundle: $APP_BUNDLE"
else
    echo "  [FAIL] App bundle not found: $APP_BUNDLE"
    exit 1
fi

if command -v hdiutil &>/dev/null; then
    rm -rf "$DMG_WORKDIR" "$DMG_PATH"
    mkdir -p "$DMG_WORKDIR"
    cp -R "$APP_BUNDLE" "$DMG_WORKDIR/"
    ln -s /Applications "$DMG_WORKDIR/Applications"

    hdiutil create \
      -volname "XMReader Installer" \
      -srcfolder "$DMG_WORKDIR" \
      -ov \
      -format UDZO \
      "$DMG_PATH" >/dev/null

    rm -rf "$DMG_WORKDIR"
    echo "  DMG package: $DMG_PATH"
else
    echo "  [WARN] hdiutil not found, skipped DMG creation"
fi
echo ""
echo "App size: $(du -sh "$APP_BUNDLE" 2>/dev/null | cut -f1 || echo 'N/A')"
if [ -f "$DMG_PATH" ]; then
    echo "DMG size: $(du -sh "$DMG_PATH" 2>/dev/null | cut -f1 || echo 'N/A')"
fi
echo ""
echo "============================================"
echo "  Usage:"
echo "    open \"$APP_BUNDLE\"                  - launch app"
echo "    open -a XMReader test.md               - open a file"
echo "    open -a XMReader rules.mdc             - open an AI rules file"
if [ -f "$DMG_PATH" ]; then
    echo "    open \"$DMG_PATH\"                    - mount installer package"
fi
echo "============================================"
echo ""
