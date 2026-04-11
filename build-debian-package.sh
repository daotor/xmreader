#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/build/bin"
PACKAGE_WORKDIR="$SCRIPT_DIR/build/deb-workdir"
APP_NAME="xmreader"
ICON_SOURCE="$SCRIPT_DIR/assets/appicon.png"

TARGET_ARCH=""
PACKAGE_ARCH=""
PACKAGE_VERSION=""
PACKAGE_FILE=""
PACKAGE_ROOT=""
PRODUCT_NAME=""
PACKAGE_DESCRIPTION=""
PACKAGE_MAINTAINER=""
WEBKIT_RUNTIME_DEP=""

detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64)
      TARGET_ARCH="amd64"
      PACKAGE_ARCH="amd64"
      ;;
    aarch64|arm64)
      TARGET_ARCH="arm64"
      PACKAGE_ARCH="arm64"
      ;;
    *)
      echo "  [ERROR] Unsupported Debian/Ubuntu architecture: $(uname -m)"
      echo "  Supported architectures: x86_64/amd64, aarch64/arm64"
      exit 1
      ;;
  esac
}

read_project_metadata() {
  local metadata
  metadata="$(bun -e "
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('wails.json', 'utf8'));
    const info = data.info || {};
    const author = data.author || {};
    const productName = info.productName || data.name || 'xmreader';
    const version = String(info.productVersion || '1.0.0').replace(/[^0-9A-Za-z.+:~-]/g, '-');
    const comments = info.comments || 'Lightweight Markdown reader built with Wails';
    const maintainerName = author.name || productName;
    const maintainerEmail = author.email || 'noreply@example.com';
    console.log([productName, version, comments, maintainerName, maintainerEmail].join('\n'));
  ")"

  PRODUCT_NAME="$(echo "$metadata" | sed -n '1p')"
  PACKAGE_VERSION="$(echo "$metadata" | sed -n '2p')"
  PACKAGE_DESCRIPTION="$(echo "$metadata" | sed -n '3p')"
  local maintainer_name maintainer_email
  maintainer_name="$(echo "$metadata" | sed -n '4p')"
  maintainer_email="$(echo "$metadata" | sed -n '5p')"
  PACKAGE_MAINTAINER="${maintainer_name} <${maintainer_email}>"

  PACKAGE_FILE="$OUTPUT_DIR/${APP_NAME}_${PACKAGE_VERSION}_${PACKAGE_ARCH}.deb"
  PACKAGE_ROOT="$PACKAGE_WORKDIR/${APP_NAME}_${PACKAGE_VERSION}_${PACKAGE_ARCH}"
}

detect_runtime_dependencies() {
  if command -v dpkg-query &>/dev/null && dpkg-query -W -f='${Status}' libwebkit2gtk-4.1-0 2>/dev/null | grep -q "install ok installed"; then
    WEBKIT_RUNTIME_DEP="libwebkit2gtk-4.1-0"
    return
  fi

  if command -v pkg-config &>/dev/null && pkg-config --exists webkit2gtk-4.1; then
    WEBKIT_RUNTIME_DEP="libwebkit2gtk-4.1-0"
    return
  fi

  WEBKIT_RUNTIME_DEP="libwebkit2gtk-4.0-37"
}

write_control_file() {
  cat > "$PACKAGE_ROOT/DEBIAN/control" <<EOF
Package: ${APP_NAME}
Version: ${PACKAGE_VERSION}
Section: editors
Priority: optional
Architecture: ${PACKAGE_ARCH}
Maintainer: ${PACKAGE_MAINTAINER}
Depends: libgtk-3-0, ${WEBKIT_RUNTIME_DEP}
Recommends: shared-mime-info, desktop-file-utils
Description: ${PRODUCT_NAME}
 ${PACKAGE_DESCRIPTION}
 Provides a lightweight desktop Markdown reader with support for
 Mermaid diagrams, local images, and AI rules files (.mdc).
EOF
}

write_desktop_file() {
  cat > "$PACKAGE_ROOT/usr/share/applications/${APP_NAME}.desktop" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=${PRODUCT_NAME}
Comment=${PACKAGE_DESCRIPTION}
Exec=/usr/bin/${APP_NAME} %F
Icon=${APP_NAME}
Terminal=false
StartupNotify=true
Categories=Office;Utility;Viewer;
MimeType=text/markdown;text/x-markdown;text/x-mdc;
Keywords=markdown;reader;mermaid;mdc;
EOF
}

write_mime_file() {
  cat > "$PACKAGE_ROOT/usr/share/mime/packages/${APP_NAME}.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
  <mime-type type="text/x-mdc">
    <comment>AI Agent Rules Markdown Document</comment>
    <sub-class-of type="text/plain"/>
    <sub-class-of type="text/markdown"/>
    <glob pattern="*.mdc"/>
  </mime-type>
</mime-info>
EOF
}

write_postinst_file() {
  cat > "$PACKAGE_ROOT/DEBIAN/postinst" <<'EOF'
#!/bin/bash
set -e

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications || true
fi

if command -v update-mime-database >/dev/null 2>&1; then
  update-mime-database /usr/share/mime || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q /usr/share/icons/hicolor || true
fi
EOF
  chmod 755 "$PACKAGE_ROOT/DEBIAN/postinst"
}

write_postrm_file() {
  cat > "$PACKAGE_ROOT/DEBIAN/postrm" <<'EOF'
#!/bin/bash
set -e

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications || true
fi

if command -v update-mime-database >/dev/null 2>&1; then
  update-mime-database /usr/share/mime || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q /usr/share/icons/hicolor || true
fi
EOF
  chmod 755 "$PACKAGE_ROOT/DEBIAN/postrm"
}

echo "============================================"
echo "  XMReader: Debian package one-click build"
echo "============================================"
echo ""

detect_arch

echo "[1/4] Checking environment..."
for cmd in bash bun dpkg-deb install; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "  [ERROR] $cmd not found"
    exit 1
  fi
  echo "  - $cmd: OK"
done

if [[ -f /etc/os-release ]]; then
  # shellcheck disable=SC1091
  source /etc/os-release
  echo "  - distro: ${PRETTY_NAME:-unknown}"
fi

echo ""
echo "[2/4] Building Ubuntu/Linux binary..."
bash "$SCRIPT_DIR/build-ubuntu.sh"
echo "  Done"

echo ""
echo "[3/4] Assembling Debian package layout..."
cd "$SCRIPT_DIR"
read_project_metadata
detect_runtime_dependencies

if [[ ! -f "$ICON_SOURCE" ]]; then
  echo "  [ERROR] App icon not found: $ICON_SOURCE"
  exit 1
fi

rm -rf "$PACKAGE_ROOT"
mkdir -p \
  "$PACKAGE_ROOT/DEBIAN" \
  "$PACKAGE_ROOT/usr/bin" \
  "$PACKAGE_ROOT/usr/share/applications" \
  "$PACKAGE_ROOT/usr/share/icons/hicolor/512x512/apps" \
  "$PACKAGE_ROOT/usr/share/mime/packages"

install -Dm755 "$OUTPUT_DIR/$APP_NAME" "$PACKAGE_ROOT/usr/bin/$APP_NAME"
install -Dm644 "$ICON_SOURCE" "$PACKAGE_ROOT/usr/share/icons/hicolor/512x512/apps/${APP_NAME}.png"

write_control_file
write_desktop_file
write_mime_file
write_postinst_file
write_postrm_file
echo "  Package root: $PACKAGE_ROOT"

echo ""
echo "[4/4] Building .deb package..."
rm -f "$PACKAGE_FILE"
dpkg-deb --build --root-owner-group "$PACKAGE_ROOT" "$PACKAGE_FILE" >/dev/null
echo "  Debian package: $PACKAGE_FILE"

echo ""
echo "Package size: $(du -sh "$PACKAGE_FILE" 2>/dev/null | cut -f1 || echo 'N/A')"
echo ""
echo "============================================"
echo "  Usage:"
echo "    sudo apt install $PACKAGE_FILE"
echo "    sudo dpkg -i $PACKAGE_FILE"
echo "============================================"
echo ""
