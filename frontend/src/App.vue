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

    <Transition name="notice">
      <div v-if="dropNotice" class="drop-notice" :class="`drop-notice--${dropNotice.type}`">
        {{ dropNotice.message }}
      </div>
    </Transition>

    <!-- Empty state -->
    <div v-if="!loading && files.length === 0" class="empty-state">
      <div class="empty-icon">📄</div>
      <h2>XMReader</h2>
      <p>Markdown 阅读器</p>
      <p class="empty-hint">
        使用方式：<br>
        双击 <code>.md</code> / <code>.mdc</code> 文件即可打开<br>
        或命令行：<code>xmreader.exe file.md</code><br>
        也可直接拖放 <code>.md</code> / <code>.mdc</code> / 图片文件到窗口打开
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <!-- Markdown content -->
    <div
      v-if="currentFile && !loading"
      ref="readerContainer"
      class="reader"
      @click.capture="handleReaderLinkClick"
      @scroll="handleReaderScroll"
    >
      <BlockEditor
        :key="currentFile.path"
        :content="currentFile.content"
        content-format="markdown"
        :document-url="currentFile.path"
        :editable="false"
        :reader-mode="true"
        :open-links-on-click="false"
      />
    </div>

    <!-- Scroll to top button -->
    <button
      v-if="showScrollTop"
      class="scroll-top"
      @click="scrollToTop"
      title="回到顶部"
    >↑</button>

    <Transition name="drop-overlay">
      <div v-if="isDragActive" class="drop-overlay">
        <div class="drop-overlay-card">
          <div class="drop-overlay-title">释放以打开文件</div>
          <div class="drop-overlay-text">支持本地 Markdown 与图片文件</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import BlockEditor from './blockeditor/components/BlockEditor.vue'
import { filePathToFileUrl, resolveDocumentLinkPath } from './blockeditor/utils/markdown-parser'
import { GetFiles, ReadFile } from '../wailsjs/go/main/App'
import { BrowserOpenURL, EventsOn, OnFileDrop, OnFileDropOff } from '../wailsjs/runtime/runtime'

interface FileInfo {
  path: string
  title: string
  content: string
}

interface DropNotice {
  type: 'info' | 'error'
  message: string
}

const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdc', '.markdown', '.mdown', '.mkd', '.mkdn'])
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.avif'])
const FILE_OPENED_EVENT = 'xmreader:file-opened'

const files = ref<FileInfo[]>([])
const currentIndex = ref(0)
const loading = ref(true)
const showScrollTop = ref(false)
const readerContainer = ref<HTMLElement | null>(null)
const isDragActive = ref(false)
const dropNotice = ref<DropNotice | null>(null)
let systemThemeMedia: MediaQueryList | null = null
let cleanupThemeMediaListener: (() => void) | null = null
let dragDepth = 0
let noticeTimer: ReturnType<typeof setTimeout> | null = null
let fileDropRegistered = false
let removeFileOpenListener: (() => void) | null = null

const currentFile = computed<FileInfo | null>(() => {
  return files.value[currentIndex.value] || null
})

function getFileName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath
}

function getFileTitle(filePath: string): string {
  const fileName = getFileName(filePath)
  const extIndex = fileName.lastIndexOf('.')
  return extIndex > 0 ? fileName.slice(0, extIndex) : fileName
}

function getFileExtension(filePath: string): string {
  const fileName = getFileName(filePath).toLowerCase()
  const extIndex = fileName.lastIndexOf('.')
  return extIndex >= 0 ? fileName.slice(extIndex) : ''
}

function isMarkdownFile(filePath: string): boolean {
  return MARKDOWN_EXTENSIONS.has(getFileExtension(filePath))
}

function isImageFile(filePath: string): boolean {
  return IMAGE_EXTENSIONS.has(getFileExtension(filePath))
}

function escapeMarkdownAlt(text: string): string {
  return text.replace(/([\\[\]])/g, '\\$1')
}

function buildImageMarkdown(filePath: string, title: string): string {
  return `![${escapeMarkdownAlt(title)}](<${filePathToFileUrl(filePath)}>)`
}

function isExternalLinkHref(href: string): boolean {
  return /^(?:[a-zA-Z][a-zA-Z\d+.-]*:|\/\/)/.test(href) && !href.toLowerCase().startsWith('file://')
}

function handleReaderLinkClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
  if (!anchor) return

  const rawHref = anchor.getAttribute('href')?.trim()
  if (!rawHref || rawHref.startsWith('#')) {
    return
  }

  const currentPath = currentFile.value?.path
  const resolvedLocalPath = resolveDocumentLinkPath(rawHref, currentPath)

  if (resolvedLocalPath && isMarkdownFile(resolvedLocalPath)) {
    event.preventDefault()
    event.stopPropagation()
    void openPaths([resolvedLocalPath], 'append')
    return
  }

  if (isExternalLinkHref(rawHref)) {
    event.preventDefault()
    event.stopPropagation()
    BrowserOpenURL(rawHref)
    return
  }

  if (resolvedLocalPath) {
    event.preventDefault()
    event.stopPropagation()
    showDropNotice('error', '当前仅支持在 XMReader 内打开 Markdown 链接')
  }
}

function showDropNotice(type: DropNotice['type'], message: string) {
  dropNotice.value = { type, message }
  if (noticeTimer) {
    clearTimeout(noticeTimer)
  }
  noticeTimer = setTimeout(() => {
    dropNotice.value = null
    noticeTimer = null
  }, 4000)
}

function resetDragState() {
  dragDepth = 0
  isDragActive.value = false
}

function syncSystemTheme() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

function setupSystemThemeSync() {
  systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)')
  const handleThemeChange = () => syncSystemTheme()
  syncSystemTheme()

  if (systemThemeMedia.addEventListener) {
    systemThemeMedia.addEventListener('change', handleThemeChange)
    cleanupThemeMediaListener = () => systemThemeMedia?.removeEventListener('change', handleThemeChange)
  } else {
    systemThemeMedia.addListener(handleThemeChange)
    cleanupThemeMediaListener = () => systemThemeMedia?.removeListener(handleThemeChange)
  }
}

async function createFileInfoFromPath(filePath: string): Promise<FileInfo | null> {
  const title = getFileTitle(filePath)

  if (isMarkdownFile(filePath)) {
    const content = await ReadFile(filePath)
    return { path: filePath, title, content }
  }

  if (isImageFile(filePath)) {
    return {
      path: filePath,
      title,
      content: buildImageMarkdown(filePath, title),
    }
  }

  return null
}

async function openDroppedFiles(paths: string[]) {
  await openPaths(paths, 'replace')
}

function applyOpenedFiles(nextFiles: FileInfo[], mode: 'replace' | 'append') {
  if (mode === 'replace' || files.value.length === 0) {
    files.value = nextFiles
    currentIndex.value = 0
    return
  }

  const mergedFiles = [...files.value]
  let nextIndex = currentIndex.value

  for (const file of nextFiles) {
    const existingIndex = mergedFiles.findIndex((item) => item.path === file.path)
    if (existingIndex >= 0) {
      mergedFiles[existingIndex] = file
      nextIndex = existingIndex
    } else {
      mergedFiles.push(file)
      nextIndex = mergedFiles.length - 1
    }
  }

  files.value = mergedFiles
  currentIndex.value = nextIndex
}

async function openPaths(paths: string[], mode: 'replace' | 'append') {
  const uniquePaths = Array.from(new Set(paths.map((path) => path.trim()).filter(Boolean)))
  const supportedPaths = uniquePaths.filter((path) => isMarkdownFile(path) || isImageFile(path))
  const unsupportedCount = uniquePaths.length - supportedPaths.length

  if (supportedPaths.length === 0) {
    showDropNotice('error', '仅支持打开 Markdown 或图片文件')
    return
  }

  loading.value = true
  try {
    const results = await Promise.allSettled(supportedPaths.map((path) => createFileInfoFromPath(path)))
    const nextFiles: FileInfo[] = []
    let failedCount = 0

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        nextFiles.push(result.value)
      } else if (result.status === 'rejected') {
        failedCount++
        console.error('[XMReader] 打开拖放文件失败:', result.reason)
      }
    }

    if (nextFiles.length === 0) {
      showDropNotice('error', '文件打开失败')
      return
    }

    applyOpenedFiles(nextFiles, mode)

    const summary: string[] = [`已打开 ${nextFiles.length} 个文件`]
    if (unsupportedCount > 0) summary.push(`忽略 ${unsupportedCount} 个不支持的文件`)
    if (failedCount > 0) summary.push(`${failedCount} 个文件打开失败`)
    showDropNotice(failedCount > 0 ? 'error' : 'info', summary.join('，'))
  } finally {
    loading.value = false
  }
}

function isFileDragEvent(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types || []).includes('Files')
}

function handleWindowDragEnter(event: DragEvent) {
  if (!isFileDragEvent(event)) return
  event.preventDefault()
  dragDepth += 1
  isDragActive.value = true
}

function handleWindowDragOver(event: DragEvent) {
  if (!isFileDragEvent(event)) return
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
  isDragActive.value = true
}

function handleWindowDragLeave(event: DragEvent) {
  if (!isFileDragEvent(event)) return
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) {
    isDragActive.value = false
  }
}

function handleWindowDrop(event: DragEvent) {
  if (!isFileDragEvent(event)) return
  event.preventDefault()
  resetDragState()
}

function registerFileDrop() {
  if (fileDropRegistered) return
  if (!(window as any).runtime?.OnFileDrop) {
    setTimeout(registerFileDrop, 100)
    return
  }
  fileDropRegistered = true
  OnFileDrop((_x, _y, paths) => {
    resetDragState()
    void openDroppedFiles(paths)
  }, false)
}

function registerFileOpenEvent() {
  if (removeFileOpenListener) return
  if (!(window as any).runtime?.EventsOn) {
    setTimeout(registerFileOpenEvent, 100)
    return
  }

  removeFileOpenListener = EventsOn(FILE_OPENED_EVENT, (...data: unknown[]) => {
    const incomingPaths = data.length === 1 && Array.isArray(data[0])
      ? data[0].filter((item): item is string => typeof item === 'string')
      : data.filter((item): item is string => typeof item === 'string')

    if (incomingPaths.length > 0) {
      void openPaths(incomingPaths, 'append')
    }
  })
}

// Robust file loading: polls until Wails bindings are ready
function loadFiles() {
  loading.value = true
  const poll = () => {
    if (!(window as any).go?.main?.App?.GetFiles) {
      console.log('[XMReader] 等待 Wails 绑定...')
      setTimeout(poll, 100)
      return
    }

    GetFiles()
      .then((data: FileInfo[]) => {
        console.log('[XMReader] 收到文件:', data)
        if (data && data.length > 0) {
          files.value = data
          document.title = `${data[0].title} - XMReader`
        }
        loading.value = false
      })
      .catch((err: any) => {
        console.error('[XMReader] GetFiles 失败:', err)
        loading.value = false
      })
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
      if (e.ctrlKey) { e.preventDefault(); scrollToTop() }
      break
    case 'End':
      if (e.ctrlKey) { e.preventDefault(); scrollToBottom() }
      break
  }
}

function handleReaderScroll() {
  showScrollTop.value = (readerContainer.value?.scrollTop || 0) > 300
}

function scrollToTop() {
  readerContainer.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

function scrollToBottom() {
  if (!readerContainer.value) return
  readerContainer.value.scrollTo({
    top: readerContainer.value.scrollHeight,
    behavior: 'smooth',
  })
}

watch(currentIndex, () => {
  nextTick(() => {
    readerContainer.value?.scrollTo({ top: 0 })
    showScrollTop.value = false
  })
})

watch(currentFile, (file) => {
  document.title = file ? `${file.title} - XMReader` : 'XMReader'
  nextTick(() => {
    readerContainer.value?.scrollTo({ top: 0 })
    showScrollTop.value = false
  })
}, { immediate: true })

function truncatePath(p: string): string {
  if (p.length <= 40) return p
  return '...' + p.slice(-37)
}

onMounted(() => {
  setupSystemThemeSync()
  loadFiles()
  registerFileDrop()
  registerFileOpenEvent()
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('dragenter', handleWindowDragEnter)
  window.addEventListener('dragover', handleWindowDragOver)
  window.addEventListener('dragleave', handleWindowDragLeave)
  window.addEventListener('drop', handleWindowDrop)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('dragenter', handleWindowDragEnter)
  window.removeEventListener('dragover', handleWindowDragOver)
  window.removeEventListener('dragleave', handleWindowDragLeave)
  window.removeEventListener('drop', handleWindowDrop)
  OnFileDropOff()
  fileDropRegistered = false
  removeFileOpenListener?.()
  removeFileOpenListener = null
  cleanupThemeMediaListener?.()
  if (noticeTimer) {
    clearTimeout(noticeTimer)
  }
})
</script>
