# BlockEditor

A block-based rich text editor built with Vue 3 and TipTap 3.

This editor was originally developed for XMReader and lives as source code inside the project rather than as a published npm package. It supports both editing and reader-style rendering, with JSON/Markdown content flows, slash commands, block drag-and-drop, image paste/upload, code blocks with syntax highlighting, and Mermaid preview.

## Features

- Block-based editing UX with a top toolbar, bubble toolbar, slash menu, plus button, and block side menu
- Common blocks: paragraph, headings `H1-H5`, bullet list, ordered list, task list, blockquote, divider, table, image, code block, and highlight block
- Rich text marks: bold, italic, underline, strike, inline code, link, text color, background highlight, and font size
- Code block extras: language picker, line numbers, copy button, word wrap, fixed-height mode, and Mermaid diagram preview
- Block interactions: hover handle, drag to reorder, duplicate, delete, and quick type switching
- Content input as TipTap JSON string or Markdown string
- Content export through component methods: JSON, HTML, and Markdown
- Reader mode for Markdown/document viewing
- Theme sync with page-level `data-theme="light|dark"` or system preference

## Tech Stack

- Vue 3
- TipTap 3
- `marked` for Markdown import
- `lowlight` + `highlight.js` for code highlighting
- `mermaid` for diagram preview

## Quick Start

This directory is source-only. Import the component directly and make sure the dependencies used in `xmreader/frontend/package.json` are installed in your app.

```ts
import './blockeditor/styles/editor.css'
import BlockEditor from './blockeditor/components/BlockEditor.vue'
```

### Editable Example

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
  console.log('saved json:', json)
  console.log('markdown snapshot:', editorRef.value?.getMarkdown())
}
</script>

<template>
  <BlockEditor
    ref="editorRef"
    v-model:content="content"
    content-format="json"
    placeholder='Type "/" to insert blocks...'
    @save="handleSave"
  />
</template>
```

### Reader Example

Use this mode when you want Markdown-style document rendering without editing chrome.

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

`documentUrl` is important when the Markdown contains relative images or local links.

## Component API

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `content` | `string` | `''` | Serialized TipTap JSON or Markdown text |
| `contentFormat` | `'json' \| 'markdown'` | `'json'` | How `content` should be interpreted |
| `editable` | `boolean` | `true` | Enables editing |
| `placeholder` | `string` | `输入 "/" 插入内容块…` | Placeholder text for empty blocks |
| `documentUrl` | `string` | `undefined` | Current document path/URL, used for relative asset and link resolution |
| `readerMode` | `boolean` | `false` | Hides editing UI and uses reader layout |
| `openLinksOnClick` | `boolean` | auto | Defaults to `false` while editing and `true` in non-editable mode |

### Events

| Event | Payload | Description |
| --- | --- | --- |
| `update:content` | `json: string` | Fired on every content update. Payload is always serialized TipTap JSON |
| `save` | `json: string` | Fired on `Ctrl/Cmd + S`. Payload is always serialized TipTap JSON |
| `ready` | `editor: Editor` | Fired after the editor instance is available |

### Exposed Methods

| Method | Return | Description |
| --- | --- | --- |
| `getJSON()` | `object` | Returns current TipTap JSON |
| `getHTML()` | `string` | Returns rendered HTML |
| `getMarkdown()` | `string` | Serializes current content to Markdown |
| `setMarkdown(md)` | `void` | Replaces content from Markdown |
| `setJSON(json)` | `void` | Replaces content from TipTap JSON |
| `focus()` | `void` | Focuses the editor |
| `isEmpty()` | `boolean` | Returns whether the document is empty |

## Markdown Behavior

- Markdown input is parsed with `marked` in GFM mode
- Supported/common cases include headings, lists, task lists, blockquotes, fenced code blocks, tables, links, and images
- GFM alerts such as `> [!NOTE]` are converted into the custom `highlightBlock`
- Relative asset paths are resolved against `documentUrl`
- Markdown can be exported back from the editor with `getMarkdown()`

## Customization Points

- `extensions/starter-kit.ts`
  Configure TipTap extensions, placeholder behavior, code block behavior, and keyboard shortcuts
- `config/menu-items.ts`
  Configure slash menu items and side-menu actions
- `config/toolbar.ts`
  Adjust heading, font-size, alignment, and color presets
- `utils/image-upload.ts`
  Replace the default base64 image upload flow or create a MinIO upload handler
- `utils/markdown-parser.ts`
  Adjust Markdown import, local file handling, and relative path resolution
- `utils/markdown-serializer.ts`
  Adjust Markdown export behavior
- `styles/editor.css`
  Theme tokens and base editor styling

## Known Limitations

- Some configured menu items are placeholders and are not implemented yet: video/file, columns, sync block, button, formula, indent submenu, side-menu color action, and comment
- `update:content` and `save` always emit JSON, even if the initial input uses `contentFormat="markdown"`
- Markdown round-tripping is best-effort, not lossless. Editor-specific attributes such as font size, text alignment, inline highlight color, and code-block fixed-height state are not preserved exactly
- The default image insert flow stores images as base64 data URLs. This is convenient for local use, but usually not ideal for production
- Local file asset rewriting currently targets XMReader's Wails route `/__xmreader_local_file__/...`. If you reuse this editor in a plain web app, adapt `markdown-parser.ts` to your own asset-serving strategy
- The current theme sync helper is page-global and is best suited to single-editor pages

## Key Files

- `components/BlockEditor.vue`: main component
- `components/EditorToolbar.vue`: top toolbar
- `components/BubbleToolbar.vue`: text selection toolbar
- `components/CodeBlockView.vue`: custom code block node view
- `composables/useBlockEditor.ts`: editor creation and content resolution
- `extensions/starter-kit.ts`: TipTap extension registry
- `utils/markdown-parser.ts`: Markdown to HTML/content conversion
- `utils/markdown-serializer.ts`: TipTap JSON to Markdown conversion

