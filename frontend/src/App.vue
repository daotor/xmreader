<template>
  <div class="app">
    <!-- Tab bar for multiple files -->
    <div v-if="files.length > 1" class="tab-bar">
      <div
        v-for="(file, idx) in files"
        :key="file.path"
        class="tab"
        :class="{ active: currentIndex === idx }"
        @click="currentIndex = idx"
      >
        <span class="tab-title">{{ file.title }}</span>
        <span class="tab-path" :title="file.path">{{ truncatePath(file.path) }}</span>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!loading && files.length === 0" class="empty-state">
      <div class="empty-icon">📄</div>
      <h2>KMRead</h2>
      <p>Markdown 阅读器</p>
      <p class="empty-hint">
        使用方式：<br>
        双击 .md 文件即可打开<br>
        或命令行：<code>kmread.exe file.md</code>
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <!-- Markdown content -->
    <div v-if="currentFile && !loading" class="reader">
      <div class="markdown-body" v-html="renderedContent"></div>
    </div>

    <!-- Scroll to top button -->
    <button
      v-if="showScrollTop"
      class="scroll-top"
      @click="scrollToTop"
      title="回到顶部"
    >↑</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import 'github-markdown-css'

// Add Highlight.js dark theme for system dark mode
const darkStyle = document.createElement('link')
darkStyle.rel = 'stylesheet'
darkStyle.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
darkStyle.media = '(prefers-color-scheme: dark)'
document.head.appendChild(darkStyle)

// Add Google Fonts
const link = document.createElement('link')
link.rel = 'stylesheet'
link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800&display=swap'
document.head.appendChild(link)

interface FileInfo {
  path: string
  title: string
  content: string
}

const files = ref<FileInfo[]>([])
const currentIndex = ref(0)
const loading = ref(true)
const showScrollTop = ref(false)

const currentFile = computed<FileInfo | null>(() => {
  return files.value[currentIndex.value] || null
})

function configureRenderer() {
  const renderer = new marked.Renderer()

  renderer.code = function (...args: any[]) {
    const codeObj = args[0]
    let code: string, lang: string
    if (typeof codeObj === 'string') {
      code = codeObj; lang = (args[1] as string) || ''
    } else if (codeObj && typeof codeObj === 'object') {
      code = (codeObj as any).text || ''; lang = (codeObj as any).lang || ''
    } else {
      code = String(codeObj || ''); lang = ''
    }
    let highlighted: string
    if (lang && hljs.getLanguage(lang)) {
      highlighted = hljs.highlight(code, { language: lang }).value
    } else {
      highlighted = hljs.highlightAuto(code).value
    }
    return `<pre class="hljs"><code class="language-${lang}">${highlighted}</code></pre>`
  }

  renderer.image = function (...args: any[]) {
    const hrefObj = args[0]
    let src: string, title: string, text: string
    if (typeof hrefObj === 'string') {
      src = hrefObj; title = (args[1] as string) || ''; text = (args[2] as string) || ''
    } else if (hrefObj && typeof hrefObj === 'object') {
      src = (hrefObj as any).href || ''
      title = (args[1] as string) || (hrefObj as any).title || ''
      text = (args[2] as string) || (hrefObj as any).text || ''
    } else {
      src = String(hrefObj || ''); title = ''; text = ''
    }
    if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('file://')) {
      const basePath = currentFile.value?.path || ''
      if (basePath) {
        const sep = basePath.includes('\\') ? '\\' : '/'
        const dir = basePath.substring(0, basePath.lastIndexOf(sep) + 1)
        src = dir + src
      }
      src = 'file:///' + src.replace(/\\/g, '/')
    }
    return `<img src="${src}" alt="${text}" title="${title || ''}" loading="lazy" />`
  }

  marked.setOptions({ renderer, gfm: true, breaks: true })
}

const renderedContent = computed(() => {
  if (!currentFile.value) return ''
  try { return marked(currentFile.value.content) as string }
  catch { return '<p>渲染错误</p>' }
})

// Robust file loading: polls until Wails bindings are ready
function loadFiles() {
  loading.value = true
  const poll = () => {
    const win = window as any
    // Check if Wails Go bindings are available
    if (win.go?.main?.App?.GetFiles) {
      win.go.main.App.GetFiles()
        .then((data: FileInfo[]) => {
          console.log('[KMRead] 收到文件:', data)
          if (data && data.length > 0) {
            files.value = data
            document.title = `${data[0].title} - KMRead`
          }
          loading.value = false
        })
        .catch((err: any) => {
          console.error('[KMRead] GetFiles 失败:', err)
          loading.value = false
        })
    } else {
      // Bindings not ready yet, retry
      console.log('[KMRead] 等待 Wails 绑定...')
      setTimeout(poll, 100)
    }
  }
  poll()
}

function handleKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      if (e.ctrlKey && files.value.length > 1) { e.preventDefault(); currentIndex.value = Math.max(0, currentIndex.value - 1) }
      break
    case 'ArrowRight':
    case 'ArrowDown':
      if (e.ctrlKey && files.value.length > 1) { e.preventDefault(); currentIndex.value = Math.min(files.value.length - 1, currentIndex.value + 1) }
      break
    case 'Home':
      if (e.ctrlKey) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }
      break
    case 'End':
      if (e.ctrlKey) { e.preventDefault(); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }) }
      break
  }
}

function handleScroll() { showScrollTop.value = window.scrollY > 300 }
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }

watch(currentIndex, () => { nextTick(() => window.scrollTo({ top: 0 })) })

function truncatePath(p: string): string {
  if (p.length <= 40) return p
  return '...' + p.slice(-37)
}

onMounted(() => {
  configureRenderer()
  loadFiles()
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('scroll', handleScroll)
})
</script>
