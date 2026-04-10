#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
OUTPUT_DIR="$SCRIPT_DIR/build/bin"
EXE_NAME="kmread"

echo "============================================"
echo "  KMRead: macOS one-click build"
echo "============================================"
echo ""

# 1. Check dependencies
echo "[1/5] Checking environment..."
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
echo "[2/5] Installing frontend dependencies..."
cd "$FRONTEND_DIR"
bun install
echo "  Done"

# 3. Build frontend
echo ""
echo "[3/5] Building frontend (Vite)..."
bunx vite build
echo "  Done"

# 4. Compile exe
echo ""
echo "[4/5] Compiling exe (Go + Wails)..."
cd "$SCRIPT_DIR"
wails build -o "$EXE_NAME" -s -skipbindings
echo "  Done"

# 5. Result
echo ""
echo "[5/5] Build success!"
OUTPUT="$OUTPUT_DIR/$EXE_NAME.app"
if [ -d "$OUTPUT" ]; then
    echo "  Output: $OUTPUT.app (macOS app bundle)"
    echo "  Path:   $OUTPUT"
else
    OUTPUT="$OUTPUT_DIR/$EXE_NAME"
    echo "  Output: $OUTPUT"
fi
echo ""
echo "File size: $(du -sh "$OUTPUT" 2>/dev/null | cut -f1 || echo 'N/A')"
echo ""
echo "============================================"
echo "  Usage:"
echo "    open $OUTPUT                         - launch app"
echo "    open -a kmread test.md               - open a file"
echo "    ./build/bin/kmread test.md            - open via terminal"
echo "============================================"
echo ""
