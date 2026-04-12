# XMReader

[English](./README.md)

XMReader 是一个轻量、跨平台的 Markdown 阅读器，基于 Go、Wails 和 Vue 构建，专注于本地文档的纯阅读体验。

## 简介

- 面向本地 Markdown 文档阅读，不引入复杂编辑器工作流
- 支持多标签页、拖放打开、Mermaid 流程图、本地图片解析，以及 `.md` / `.mdc` 文件
- Windows 平台内置 WebView2 运行时检测、自动安装尝试和启动日志，便于分发与排障

## 界面预览

### Windows

![XMReader Windows 界面](./docs/images/2026-04-11_13-18.png)

### macOS

![XMReader macOS 界面](./docs/images/macos_2026-04-11_13-20-32.jpg)

## 功能

- 多文件标签页阅读
- Markdown / GFM 渲染
- 源码与常见配置文件可按 fenced code block 渲染，已支持 `.go`、`.py`、`.js`、`.ts`、`.tsx`、`.java`、`.rs`、`.c`、`.cpp`、`.cs`、`.kt`、`.swift`、`.php`、`.rb`、`.sh`、`.bat`、`.cmd`、`.ps1`、`.psm1`、`.psd1`、`.json`、`.yaml`、`.toml`、`.xml`、`.html`、`.css`、`.scss`、`.sql` 等类型
- `.vue` 这类 Vue 单文件组件会按 `template` / `script` / `style` 分段结构化展示
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

## GitHub Release 自动发布

- 推送新的 tag 后，会自动触发 `.github/workflows/release.yml`
- 版本号必须遵循 [VERSIONING_RULES.mdc](./VERSIONING_RULES.mdc)：`v{yy}.{MMdd}.{HHmm}`
- 示例：`v26.0411.1735`
- workflow 会在 CI 中把 `wails.json` 的 `info.productVersion` 同步为当前 tag 版本，确保应用元数据和 Debian 包版本与 Release 一致
- 当前自动发布的资产包括：
  - `XMReader-<tag>-windows-amd64.zip`
  - `XMReader-<tag>-macos-universal.zip`
  - `XMReader-<tag>-macos-universal.dmg`
  - `XMReader-<tag>-linux-amd64.tar.gz`
  - `XMReader-<tag>-linux-amd64.deb`
  - `SHA256SUMS.txt`

## 使用

```cmd
REM 打开单个文件
xmreader.exe file.md

REM 打开 Go 源码文件
xmreader.exe main.go

REM 打开其他已支持的源码/配置文件
xmreader.exe script.py
xmreader.exe config.json

REM 打开 Windows 脚本文件
xmreader.exe build.bat
xmreader.exe build.ps1

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

## 第三方组件与许可证说明

XMReader 使用了若干第三方软件组件。以下清单用于归档主要直接依赖、构建期组件，以及需要额外说明的外部运行时，便于第三方许可证合规审查与归属说明。

除特别说明外，下面列出的开源组件均仍然受其各自上游项目许可证和版权声明约束。

下表中的版本号基于本次更新 README 时工作区内已审计到的实际版本状态。

### 直接使用 / 随应用构建的开源组件

| 组件 | 版本 | 分类 | 许可证 | 用途 / 范围 |
| --- | --- | --- | --- | --- |
| Wails | `v2.12.0` | 开源 | MIT | Go 桌面应用框架 |
| `go-webview2` | `v1.0.22` | 开源 | MIT | Windows 下 WebView2 加载与绑定，供启动检测与引导逻辑使用 |
| `golang.org/x/sys` | `v0.30.0` | 开源 | BSD-3-Clause | Windows 注册表访问与底层系统集成 |
| Vue | `3.5.32` | 开源 | MIT | 前端 UI 框架 |
| TipTap 系列包（`@tiptap/core`、`@tiptap/*`、`@tiptap/pm`） | `3.22.3` | 开源 | MIT | Block 编辑器与 Markdown 阅读核心能力 |
| Marked | `12.0.2` | 开源 | MIT | Markdown 解析 |
| Mermaid | `11.14.0` | 开源 | MIT | 图表渲染 |
| Lowlight | `3.3.0` | 开源 | MIT | 代码高亮适配层 |
| Highlight.js | `11.11.1` | 开源 | BSD-3-Clause | 代码语法高亮 |

### 构建期使用的开源组件

| 组件 | 版本 | 分类 | 许可证 | 用途 / 范围 |
| --- | --- | --- | --- | --- |
| Vite | `5.4.21` | 开源 | MIT | 前端构建工具 |
| `@vitejs/plugin-vue` | `5.2.4` | 开源 | MIT | Vite 的 Vue SFC 支持 |
| TypeScript | `5.9.3` | 开源 | Apache-2.0 | 类型检查与编译 |
| `vue-tsc` | `2.2.12` | 开源 | MIT | Vue TypeScript 类型检查 |
| NSIS / `makensis` | 外部工具 | 开源 | zlib/libpng | 可选的 Windows 安装包生成工具，仅在执行 `build-installer.bat` 时需要 |

### 闭源 / 专有外部组件

| 组件 | 版本 | 分类 | 许可证 / 条款 | 用途 / 范围 |
| --- | --- | --- | --- | --- |
| Microsoft Edge WebView2 Runtime | 外部运行时 | 闭源 / 专有 | Microsoft WebView2 Runtime Terms and Conditions License | Windows 平台渲染应用 WebView 所必需；XMReader 会检测并可能自动下载或触发安装 |

### 合规说明

- 本节重点列出主要直接依赖和需要单独说明的外部组件，并不能替代对全部传递依赖的完整审计。完整依赖链请结合 `go.mod`、`go.sum`、`frontend/package.json` 和 `frontend/bun.lock` 一并审阅。
- Windows 构建或运行过程中，可能会提示下载、安装或调用 Microsoft Edge WebView2 Runtime。该运行时及其安装程序受 Microsoft 自身条款约束，不属于 Apache-2.0 或上述开源许可证范围。
- macOS 与 Linux 版本还依赖操作系统或发行版提供的系统 WebView 组件；这些系统组件不由本仓库打包分发，其许可证应以对应平台或发行版为准。
