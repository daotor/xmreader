# XMReader

[English](./README.md)

XMReader 是一个轻量、跨平台的 Markdown 阅读器，基于 Go、Wails 和 Vue 构建，专注于本地文档的纯阅读体验。

## 简介

- 面向本地 Markdown 文档阅读，不引入复杂编辑器工作流
- 支持多标签页、拖放打开、Mermaid 流程图、本地图片解析，以及 `.md` / `.mdc` 文件
- Windows 平台内置 WebView2 运行时检测、自动安装尝试和启动日志，便于分发与排障

## 功能

- 多文件标签页阅读
- Markdown / GFM 渲染
- Mermaid 图表支持
- 本地图片与相对路径解析
- 文件拖放打开
- `.md` 与 `.mdc` 文件支持
- 系统浅色/深色主题适配
- Windows WebView2 依赖自检与自愈

## 技术栈

- Go + Wails v2
- Vue 3 + TypeScript
- Vite
- TipTap / BlockEditor
- Mermaid

## 环境要求

- Go 1.22+
- bun
- Wails CLI v2  
  `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

## 构建

### Windows

```cmd
REM 构建正式可执行文件
build.bat

REM 构建 NSIS 安装器（需要先安装 NSIS / makensis）
build-installer.bat
```

- 默认产物输出到 `build/bin/xmreader.exe`
- Windows 运行依赖是 Microsoft WebView2 Runtime
- 启动日志默认写入 `%LOCALAPPDATA%\XMReader\logs\xmreader.log`

### macOS

```bash
./build-macos.sh
```

- 构建 `.app`
- 在可用时额外生成 `.dmg`

### Ubuntu

```bash
# Ubuntu 22.04 及更早版本
sudo apt install build-essential pkg-config libgtk-3-dev libwebkit2gtk-4.0-dev

# Ubuntu 24.04 及更新版本
sudo apt install build-essential pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev

./build-ubuntu.sh
```

### Debian 安装包

```bash
sudo apt install build-essential pkg-config libgtk-3-dev libwebkit2gtk-4.0-dev dpkg-dev
./build-debian-package.sh
```

## 手动构建

```bash
cd frontend
bun install
bun run build

cd ..
wails build -clean -webview2 embed -o xmreader.exe
```

Windows 正式分发请优先使用 `wails build`，不要使用裸 `go build`。

## 使用

```cmd
REM 打开单个文件
xmreader.exe file.md

REM 打开多个文件
xmreader.exe file1.md file2.mdc

REM 复用当前窗口并追加为标签页
xmreader.exe file3.md

REM 显式打开新窗口
xmreader.exe --new-window file4.md

REM 注册 .md / .mdc 文件关联
xmreader.exe --register
```

## Windows 说明

- 如果系统缺少 WebView2 Runtime，XMReader 会先尝试自动下载安装
- 如果自动安装失败，XMReader 会打开官方 WebView2 下载页面
- 如果遇到白屏或启动异常，请先查看 `%LOCALAPPDATA%\XMReader\logs\xmreader.log`

## 支持的内容

- 标题、列表、表格、任务列表
- 代码块与语法高亮
- Mermaid 图表
- 本地图片与相对路径资源

## License

本项目采用 Apache-2.0 开源协议。详见 [LICENSE](./LICENSE)。
