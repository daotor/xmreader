# BlockEditor

一个基于 Vue 3 和 TipTap 3 的 block 富文本编辑器。

这个编辑器最初为 XMReader 开发，目前以项目内源码的形式维护，并不是一个已经发布到 npm 的独立包。它同时支持编辑态和阅读态，具备 JSON/Markdown 内容流、Slash 命令、块拖拽排序、图片粘贴/上传、代码高亮，以及 Mermaid 预览等能力。

## 功能特性

- 典型的 block 编辑体验，包含顶部工具栏、选中文本气泡工具栏、Slash 菜单、空行 `+` 按钮、块侧边菜单
- 常用块类型：正文、`H1-H5`、无序列表、有序列表、任务列表、引用、分割线、表格、图片、代码块、高亮块
- 常用行内格式：粗体、斜体、下划线、删除线、行内代码、链接、文字颜色、背景高亮、字号
- 代码块增强：语言切换、行号、复制、自动换行、固定高度、Mermaid 流程图预览与全屏查看
- 块交互能力：悬浮拖拽手柄、拖拽排序、复制块、删除块、块类型快速切换
- 内容可从 TipTap JSON 字符串或 Markdown 字符串初始化
- 通过组件暴露方法可导出 JSON、HTML、Markdown
- 支持阅读模式，用作 Markdown 文档查看器
- 可跟随页面 `data-theme="light|dark"` 或系统主题切换明暗样式

## 技术栈

- Vue 3
- TipTap 3
- `marked` 用于 Markdown 导入
- `lowlight` + `highlight.js` 用于代码高亮
- `mermaid` 用于流程图预览
- `d3-selection` + `d3-zoom` 用于全屏流程图缩放和平移

## 快速接入

这个目录是源码目录，不是独立发布包。直接引入组件即可，同时保证你的项目已经安装了 `xmreader/frontend/package.json` 中相关依赖。

```ts
import './blockeditor/styles/editor.css'
import BlockEditor from './blockeditor/components/BlockEditor.vue'
```

### 编辑模式示例

```vue
<script setup lang="ts">
import { ref } from 'vue'
import BlockEditor from './blockeditor/components/BlockEditor.vue'
import type { BlockEditorExpose } from './blockeditor/types/editor'

const editorRef = ref<BlockEditorExpose>()
const content = ref(
  JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph' }],
  }),
)

function handleSave(json: string) {
  console.log('保存得到的 JSON:', json)
  console.log('当前 Markdown:', editorRef.value?.getMarkdown())
}
</script>

<template>
  <BlockEditor
    ref="editorRef"
    v-model:content="content"
    content-format="json"
    placeholder='输入 "/" 插入内容块…'
    @save="handleSave"
  />
</template>
```

### 阅读模式示例

如果你只是想把它当作 Markdown 文档阅读器来使用，可以关闭交互能力并启用阅读布局。

```vue
<BlockEditor
  :content="markdown"
  content-format="markdown"
  :document-url="filePath"
  :editable="false"
  :reader-mode="true"
  :open-links-on-click="false"
/>
```

如果 Markdown 中包含相对路径图片或本地链接，建议传入 `documentUrl`。

Mermaid SVG 渲染完成后，代码块工具栏会显示“全屏”入口。全屏视图直接复用当前 SVG，支持以鼠标位置为中心的滚轮缩放、按住鼠标左键拖动、工具栏缩放/适合窗口，以及 `Esc` 退出；编辑模式下全屏视图仍保持只读。

## 组件 API

### Props

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `content` | `string` | `''` | TipTap JSON 字符串或 Markdown 字符串 |
| `contentFormat` | `'json' \| 'markdown'` | `'json'` | 指定 `content` 的解析方式 |
| `editable` | `boolean` | `true` | 是否允许编辑 |
| `placeholder` | `string` | `输入 "/" 插入内容块…` | 空块占位提示 |
| `documentUrl` | `string` | `undefined` | 当前文档路径或 URL，用于解析相对资源和链接 |
| `readerMode` | `boolean` | `false` | 隐藏编辑 UI，切换为阅读布局 |
| `openLinksOnClick` | `boolean` | 自动 | 编辑态默认 `false`，非编辑态默认 `true` |

### Events

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `update:content` | `json: string` | 内容变化时触发，返回值始终是 TipTap JSON 字符串 |
| `save` | `json: string` | 按下 `Ctrl/Cmd + S` 时触发，返回值始终是 TipTap JSON 字符串 |
| `ready` | `editor: Editor` | 编辑器实例创建完成后触发 |

### Expose 方法

| 方法 | 返回值 | 说明 |
| --- | --- | --- |
| `getJSON()` | `object` | 获取当前 TipTap JSON |
| `getHTML()` | `string` | 获取当前 HTML |
| `getMarkdown()` | `string` | 将当前内容序列化为 Markdown |
| `setMarkdown(md)` | `void` | 用 Markdown 替换当前内容 |
| `setJSON(json)` | `void` | 用 TipTap JSON 替换当前内容 |
| `focus()` | `void` | 聚焦编辑器 |
| `isEmpty()` | `boolean` | 判断当前内容是否为空 |

## Markdown 行为说明

- Markdown 导入使用 `marked`，并启用了 GFM 模式
- 常见语法如标题、列表、任务列表、引用、围栏代码块、表格、链接、图片都可正常导入
- GFM Alert 语法如 `> [!NOTE]` 会被转换成自定义的 `highlightBlock`
- 相对资源路径会基于 `documentUrl` 进行解析
- 当前内容可以通过 `getMarkdown()` 导出回 Markdown

## 可定制点

- `extensions/starter-kit.ts`
  配置 TipTap 扩展、占位符行为、代码块行为和快捷键
- `config/menu-items.ts`
  配置 Slash 菜单和块侧边菜单项
- `config/toolbar.ts`
  调整标题、字号、对齐方式、颜色预设
- `utils/image-upload.ts`
  替换默认的 base64 图片上传逻辑，或接入 MinIO 上传
- `utils/markdown-parser.ts`
  调整 Markdown 导入、本地文件处理、相对路径解析
- `utils/markdown-serializer.ts`
  调整 Markdown 导出规则
- `styles/editor.css`
  主题变量和基础样式

## 当前限制

- 目前有一部分菜单项只是占位，还没有真正实现：视频/文件、分栏、同步块、按钮、公式、缩进子菜单、侧边菜单颜色动作、评论
- 即使初始输入使用的是 `contentFormat="markdown"`，`update:content` 和 `save` 返回的仍然始终是 JSON 字符串
- Markdown 往返转换是“尽力而为”，不是完全无损。字号、文本对齐、行内高亮颜色、代码块固定高度等编辑器特有属性不会被完整保留
- 默认图片插入流程会把图片保存为 base64 Data URL，适合本地开发或演示，不太适合生产环境
- 本地文件资源重写当前默认面向 XMReader 的 Wails 路由 `/__xmreader_local_file__/...`。如果你在普通 Web 项目里复用这个编辑器，通常需要按自己的资源服务方式改造 `markdown-parser.ts`
- 主题同步仍是页面级行为；同一页面的所有 BlockEditor 实例共享外层 `data-theme` 主题

## 关键文件

- `components/BlockEditor.vue`：主组件
- `components/EditorToolbar.vue`：顶部工具栏
- `components/BubbleToolbar.vue`：选中文本后的浮动工具栏
- `components/CodeBlockView.vue`：自定义代码块视图
- `components/MermaidFullscreenViewer.vue`：Mermaid 全屏缩放与平移视图
- `composables/useBlockEditor.ts`：编辑器创建与内容解析入口
- `extensions/starter-kit.ts`：TipTap 扩展注册
- `utils/markdown-parser.ts`：Markdown 转 HTML/内容
- `utils/markdown-serializer.ts`：TipTap JSON 转 Markdown
- `utils/mermaid-viewport.ts`：Mermaid SVG 尺寸读取与适合窗口计算

