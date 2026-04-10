# KMRead

轻量级 Markdown 阅读器，基于 Go + Wails + Vue。

## 功能

- ✅ Markdown / GFM 渲染（表格、代码高亮、任务列表）
- ✅ 多文件标签页
- ✅ 本地图片自动路径解析
- ✅ 浅色主题，适配系统
- ✅ 键盘快捷键
- ✅ macOS `.app` 构建与 `.md` / `.mdc` 文件关联

## 构建

```bash
# 前置依赖
# - Go 1.22+
# - bun
# - Wails CLI v2: go install github.com/wailsapp/wails/v2/cmd/wails@latest

cd frontend && bun install && bun run build
cd .. && wails build -o kmread.exe
```

产物在 `build/bin/kmread.exe`

## 使用

```cmd
# 双击打开
kmread.exe file.md

# 打开多个文件
kmread.exe file1.md file2.mdc

# 注册 .md / .mdc 文件关联（双击即用）
kmread.exe --register
```

### macOS

```bash
# 构建可安装的 .app（并在可用时额外生成 .dmg）
./build-macos.sh

# 直接打开应用
open build/bin/kmread.app

# 通过系统文件关联打开
open -a KMRead test.md

# 打开 AI Agent rules 文件
open -a KMRead rules.mdc
```

## 技术栈

- Go + Wails v2（桌面框架，WebView2）
- Vue 3 + TypeScript（前端渲染）
- Vite（构建工具）
- marked + highlight.js（Markdown 渲染 + 代码高亮）
