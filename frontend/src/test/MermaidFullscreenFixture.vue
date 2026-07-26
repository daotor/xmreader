<script setup lang="ts">
import { ref } from 'vue'
import BlockEditor from '../blockeditor/components/BlockEditor.vue'

const markdown = ref(`# Mermaid 全屏验证

## 架构流程

\`\`\`mermaid
flowchart LR
  Request["Reader request"] --> Parser["Markdown parser"]
  Parser --> Editor["BlockEditor"]
  Editor --> CodeBlock["CodeBlockView"]
  CodeBlock --> Render["Mermaid SVG"]
  Render --> Viewer["Fullscreen Viewer"]
  Viewer --> Zoom["Wheel zoom"]
  Viewer --> Pan["Left drag pan"]
  Viewer --> Fit["Fit viewport"]
  Render --> Cache["Reuse current SVG"]
  Cache --> Viewer
\`\`\`

## 普通代码

\`\`\`typescript
const ordinaryCodeBlock = true
\`\`\`

## 第二张图

\`\`\`mermaid
sequenceDiagram
  participant User
  participant Toolbar
  participant Viewer
  User->>Toolbar: Open fullscreen
  Toolbar->>Viewer: Reuse rendered SVG
  User->>Viewer: Wheel and drag
  Viewer-->>User: Updated viewport
\`\`\`
`)

function toggleTheme() {
  const root = document.documentElement
  root.setAttribute('data-theme', root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark')
}
</script>

<template>
  <main class="fixture-shell">
    <header class="fixture-toolbar">
      <strong>BlockEditor Mermaid</strong>
      <button type="button" data-testid="toggle-theme" @click="toggleTheme">切换主题</button>
    </header>
    <div class="fixture-editor">
      <BlockEditor
        :content="markdown"
        content-format="markdown"
        :editable="false"
        :reader-mode="true"
        :open-links-on-click="false"
      />
    </div>
  </main>
</template>

<style scoped>
.fixture-shell {
  min-height: 100vh;
  background: var(--be-bg);
}

.fixture-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 0 16px;
  border-bottom: 1px solid var(--be-border);
  color: var(--be-text);
  background: var(--be-toolbar-bg);
}

.fixture-toolbar button {
  padding: 6px 10px;
  border: 1px solid var(--be-border);
  border-radius: 5px;
  color: var(--be-text);
  background: var(--be-bg);
  cursor: pointer;
}

.fixture-editor {
  min-height: calc(100vh - 44px);
}
</style>
