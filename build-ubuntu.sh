#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
OUTPUT_DIR="$SCRIPT_DIR/build/bin"
APP_NAME="xmreader"

TARGET_ARCH=""
ARCHIVE_NAME=""
ARCHIVE_PATH=""
WEBKIT_PKG=""
WAILS_TAG_ARGS=()

detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64)
      TARGET_ARCH="amd64"
      ;;
    aarch64|arm64)
      TARGET_ARCH="arm64"
      ;;
    *)
      echo "  [ERROR] Unsupported Ubuntu architecture: $(uname -m)"
      echo "  Supported architectures: x86_64/amd64, aarch64/arm64"
      exit 1
      ;;
  esac

  ARCHIVE_NAME="${APP_NAME}-linux-${TARGET_ARCH}.tar.gz"
  ARCHIVE_PATH="$OUTPUT_DIR/$ARCHIVE_NAME"
}

detect_webkit() {
  if pkg-config --exists webkit2gtk-4.0; then
    WEBKIT_PKG="webkit2gtk-4.0"
    return
  fi

  if pkg-config --exists webkit2gtk-4.1; then
    WEBKIT_PKG="webkit2gtk-4.1"
    WAILS_TAG_ARGS=(-tags webkit2_41)
    return
  fi

  echo "  [ERROR] webkit2gtk development package not found"
  echo "  Ubuntu 22.04 and earlier usually need:"
  echo "    sudo apt install build-essential pkg-config libgtk-3-dev libwebkit2gtk-4.0-dev"
  echo "  Ubuntu 24.04 and newer usually need:"
  echo "    sudo apt install build-essential pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev"
  exit 1
}

echo "============================================"
echo "  XMReader: Ubuntu one-click build"
echo "============================================"
echo ""

if [[ -f /etc/os-release ]]; then
  # shellcheck disable=SC1091
  source /etc/os-release
  echo "Detected system: ${PRETTY_NAME:-unknown}"
  if [[ "${ID:-}" != "ubuntu" ]]; then
    echo "  [WARN] This script is optimized for Ubuntu. Current distro: ${ID:-unknown}"
  fi
  echo ""
fi

detect_arch

echo "[1/5] Checking environment..."
for cmd in go bun wails pkg-config tar; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "  [ERROR] $cmd not found"
    exit 1
  fi
  echo "  - $cmd: OK"
done

if ! pkg-config --exists gtk+-3.0; then
  echo "  [ERROR] gtk+-3.0 development package not found"
  echo "  Try:"
  echo "    sudo apt install build-essential pkg-config libgtk-3-dev"
  exit 1
fi

detect_webkit
echo "  - gtk+-3.0: OK"
echo "  - $WEBKIT_PKG: OK"

echo ""
echo "[2/5] Installing frontend dependencies..."
cd "$FRONTEND_DIR"
bun install
echo "  Done"

echo ""
echo "[3/5] Building frontend (Vite)..."
bun run build
echo "  Done"

echo ""
echo "[4/5] Building Linux app (Go + Wails)..."
cd "$SCRIPT_DIR"
BUILD_CMD=(wails build -platform "linux/${TARGET_ARCH}" -clean -o "$APP_NAME" -s -skipbindings)
if [[ ${#WAILS_TAG_ARGS[@]} -gt 0 ]]; then
  BUILD_CMD+=("${WAILS_TAG_ARGS[@]}")
fi
"${BUILD_CMD[@]}"
echo "  Done"

echo ""
echo "[5/5] Packaging tar.gz..."
mkdir -p "$OUTPUT_DIR"
if [[ ! -f "$OUTPUT_DIR/$APP_NAME" ]]; then
  echo "  [FAIL] Built binary not found: $OUTPUT_DIR/$APP_NAME"
  exit 1
fi

rm -f "$ARCHIVE_PATH"
tar -czf "$ARCHIVE_PATH" -C "$OUTPUT_DIR" "$APP_NAME"
echo "  Binary:  $OUTPUT_DIR/$APP_NAME"
echo "  Archive: $ARCHIVE_PATH"

echo ""
echo "Binary size: $(du -sh "$OUTPUT_DIR/$APP_NAME" 2>/dev/null | cut -f1 || echo 'N/A')"
echo "Archive size: $(du -sh "$ARCHIVE_PATH" 2>/dev/null | cut -f1 || echo 'N/A')"
echo ""
echo "============================================"
echo "  Usage:"
echo "    $OUTPUT_DIR/$APP_NAME test.md        - open a Markdown file"
echo "    $OUTPUT_DIR/$APP_NAME rules.mdc      - open an AI rules file"
echo "    tar -xzf $ARCHIVE_PATH               - unpack the release archive"
echo "============================================"
echo ""
