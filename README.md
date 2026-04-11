# XMReader

[简体中文](./readme_zh.md)

XMReader is a lightweight, cross-platform Markdown reader built with Go, Wails, and Vue, focused on a clean local-document reading experience.

## Overview

- Designed for local Markdown reading without forcing a full editor workflow
- Supports multi-tab reading, drag-and-drop opening, Mermaid diagrams, local image resolution, and both `.md` and `.mdc` files
- Includes WebView2 runtime detection, automatic installation fallback, and startup logs on Windows

## Features

- Multi-tab reading for multiple files
- Markdown and GitHub Flavored Markdown rendering
- Mermaid diagram rendering
- Local image and relative-path image resolution
- Drag-and-drop file opening
- Support for both `.md` and `.mdc` files
- System light and dark theme support
- Windows WebView2 dependency self-check and recovery

## Tech Stack

- Go + Wails v2
- Vue 3 + TypeScript
- Vite
- TipTap / BlockEditor
- Mermaid

## Requirements

- Go 1.22+
- bun
- Wails CLI v2  
  `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

## Build

### Windows

```cmd
REM Build the production executable
build.bat

REM Build the NSIS installer (requires NSIS / makensis)
build-installer.bat
```

- The production executable is generated at `build/bin/xmreader.exe`
- XMReader depends on Microsoft WebView2 Runtime on Windows
- Startup logs are written to `%LOCALAPPDATA%\XMReader\logs\xmreader.log`

### macOS

```bash
./build-macos.sh
```

- Builds the `.app` bundle
- Generates a `.dmg` when available

### Ubuntu

```bash
# Ubuntu 22.04 and earlier
sudo apt install build-essential pkg-config libgtk-3-dev libwebkit2gtk-4.0-dev

# Ubuntu 24.04 and newer
sudo apt install build-essential pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev

./build-ubuntu.sh
```

### Debian Package

```bash
sudo apt install build-essential pkg-config libgtk-3-dev libwebkit2gtk-4.0-dev dpkg-dev
./build-debian-package.sh
```

## Manual Build

```bash
cd frontend
bun install
bun run build

cd ..
wails build -clean -webview2 embed -o xmreader.exe
```

For Windows releases, prefer `wails build` instead of plain `go build`.

## Usage

```cmd
REM Open one file
xmreader.exe file.md

REM Open multiple files
xmreader.exe file1.md file2.mdc

REM Reuse the existing window and append as tabs
xmreader.exe file3.md

REM Explicitly open a new window
xmreader.exe --new-window file4.md

REM Register file associations for .md / .mdc
xmreader.exe --register
```

## Windows Notes

- If WebView2 Runtime is missing, XMReader will try to download and install it automatically
- If automatic installation fails, XMReader opens the official WebView2 download page
- If you see a blank window or startup issues, check `%LOCALAPPDATA%\XMReader\logs\xmreader.log` first

## Supported Content

- Headings, lists, tables, and task lists
- Code blocks and syntax highlighting
- Mermaid diagrams
- Local images and relative-path assets

## License

To be added.
