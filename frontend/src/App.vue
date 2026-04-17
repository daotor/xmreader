<template>
  <div class="app">
    <!-- Tab bar for multiple files -->
    <div v-if="files.length > 1" class="tab-bar">
      <div
        v-for="(file, idx) in files"
        :key="file.path"
        class="tab"
        :class="{ active: currentIndex === idx }"
        @click="activateTab(idx)"
        @mousedown="handleTabMouseDown($event, idx)"
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
        双击打开支持<code>.md</code>/<code>.mdc</code>文件<br>
        命令行打开：<code>xmreader.exe file.md</code><br>
        拖放阅读支持 *.md/源码/shell脚本/图片文件<br>
        Win关联md：<code>xmreader.exe --register</code>
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
      @contextmenu="handleReaderContextMenu"
      @scroll="handleReaderScroll"
    >
      <BlockEditor :key="currentFile.path" :content="currentFile.content" content-format="markdown"
        :document-url="currentFile.path" :editable="false" :reader-mode="true" :open-links-on-click="false" />
    </div>

    <Transition name="context-menu">
      <div
        v-if="readerContextMenu.visible && currentFile"
        ref="readerContextMenuRef"
        class="reader-context-menu"
        :style="{ left: `${readerContextMenu.x}px`, top: `${readerContextMenu.y}px` }"
        tabindex="-1"
        role="menu"
        aria-label="文档操作菜单"
        @contextmenu.prevent
      >
        <template v-for="item in readerContextMenuItems" :key="item.key">
          <button
            v-if="item.kind === 'action'"
            type="button"
            class="reader-context-menu__item"
            role="menuitem"
            @click="handleReaderContextMenuAction(item.action)"
          >
            <span class="reader-context-menu__label">{{ item.label }}</span>
            <span class="reader-context-menu__hint">{{ item.hint }}</span>
          </button>
          <div
            v-else
            class="reader-context-menu__divider"
            role="separator"
            aria-hidden="true"
          ></div>
        </template>
      </div>
    </Transition>

    <div v-if="currentFile && !loading" class="outline-dock">
      <Transition name="outline-panel">
        <aside v-if="isOutlineOpen" id="xmreader-outline-panel" class="outline-panel" aria-label="文档大纲">
          <div class="outline-panel-header">
            <div>
              <p class="outline-panel-eyebrow">Navigation</p>
              <h3>文档大纲</h3>
            </div>
            <span class="outline-panel-count">{{ outlineEntries.length }}</span>
          </div>

          <div v-if="hasOutline" class="outline-panel-body">
            <button
              v-for="entry in outlineEntries"
              :key="entry.id"
              type="button"
              class="outline-item"
              :class="{ 'outline-item--active': activeOutlineId === entry.id }"
              :style="{ '--outline-depth': String(getOutlineDepth(entry.level)) }"
              @click="scrollToHeading(entry.id)"
            >
              <span class="outline-item-rail" aria-hidden="true"></span>
              <span class="outline-item-label">{{ entry.text }}</span>
            </button>
          </div>

          <div v-else class="outline-empty">
            <p class="outline-empty-title">当前文档暂无标题</p>
            <p class="outline-empty-text">正文中使用 H1-H5 标题后，这里会自动生成可跳转的大纲。</p>
          </div>
        </aside>
      </Transition>

      <button
        type="button"
        class="outline-toggle"
        :class="{ 'outline-toggle--open': isOutlineOpen, 'outline-toggle--empty': !hasOutline }"
        :title="isOutlineOpen ? '收起大纲' : hasOutline ? '展开大纲' : '当前文档暂无可用大纲'"
        :aria-expanded="isOutlineOpen"
        :aria-label="isOutlineOpen ? '收起大纲' : '展开大纲'"
        aria-controls="xmreader-outline-panel"
        @click="toggleOutline"
      >
        <span class="outline-toggle-icon" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
        <span class="outline-toggle-text">大纲</span>
      </button>
    </div>

    <!-- Scroll to top button -->
    <button v-if="showScrollTop" type="button" class="scroll-top" @click="scrollToTop" title="回到顶部"
      aria-label="回到顶部">↑</button>

    <Transition name="drop-overlay">
      <div v-if="isDragActive" class="drop-overlay">
        <div class="drop-overlay-card">
          <div class="drop-overlay-title">释放以打开文件</div>
          <div class="drop-overlay-text">支持本地 Markdown、源码、Win脚本与图片文件</div>
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
import { BrowserOpenURL, ClipboardSetText, EventsOn, OnFileDrop, OnFileDropOff, WindowSetTitle } from '../wailsjs/runtime/runtime'

interface FileInfo {
  path: string
  title: string
  content: string
}

interface DropNotice {
  type: 'info' | 'error'
  message: string
}

interface OutlineEntry {
  id: string
  text: string
  level: number
}

interface ReaderContextMenuState {
  visible: boolean
  x: number
  y: number
}

type ReaderContextMenuAction = 'open-directory' | 'copy-path' | 'copy-content' | 'refresh-document' | 'toggle-theme'
type ReaderContextMenuItem =
  | {
      kind: 'action'
      key: string
      action: ReaderContextMenuAction
      label: string
      hint: string
    }
  | {
      kind: 'divider'
      key: string
    }

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.avif'])
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdc', '.markdown', '.mdown', '.mkd', '.mkdn'])
const FILE_OPENED_EVENT = 'xmreader:file-opened'
const HEADING_SELECTOR = '.block-editor-content h1, .block-editor-content h2, .block-editor-content h3, .block-editor-content h4, .block-editor-content h5'
const OUTLINE_ID_PREFIX = 'xm-outline-'
const GENERATED_OUTLINE_ID_FLAG = 'true'
const THEME_STORAGE_KEY = 'xmdor-theme'

const files = ref<FileInfo[]>([])
const currentIndex = ref(0)
const loading = ref(true)
const showScrollTop = ref(false)
const readerContainer = ref<HTMLElement | null>(null)
const readerContextMenuRef = ref<HTMLElement | null>(null)
const outlineEntries = ref<OutlineEntry[]>([])
const activeOutlineId = ref('')
const isOutlineOpen = ref(false)
const currentTheme = ref<'light' | 'dark'>('light')
const isDragActive = ref(false)
const dropNotice = ref<DropNotice | null>(null)
const readerContextMenu = ref<ReaderContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
})
let systemThemeMedia: MediaQueryList | null = null
let cleanupThemeMediaListener: (() => void) | null = null
let outlineObserver: MutationObserver | null = null
let outlineRefreshFrame: number | null = null
let dragDepth = 0
let noticeTimer: ReturnType<typeof setTimeout> | null = null
let fileDropRegistered = false
let removeFileOpenListener: (() => void) | null = null

const currentFile = computed<FileInfo | null>(() => {
  return files.value[currentIndex.value] || null
})

const hasOutline = computed(() => outlineEntries.value.length > 0)
const isCurrentMarkdownFile = computed(() => {
  const path = currentFile.value?.path
  return Boolean(path && MARKDOWN_EXTENSIONS.has(getFileExtension(path)))
})
const isDarkTheme = computed(() => currentTheme.value === 'dark')
const readerContextMenuItems = computed<ReaderContextMenuItem[]>(() => [
  { kind: 'action', key: 'open-directory', action: 'open-directory', label: '打开目录', hint: 'Open Folder' },
  { kind: 'action', key: 'copy-path', action: 'copy-path', label: '复制路径', hint: 'Copy Path' },
  { kind: 'action', key: 'copy-content', action: 'copy-content', label: '复制内容', hint: 'Copy Markdown' },
  { kind: 'action', key: 'refresh-document', action: 'refresh-document', label: '刷新文档', hint: 'Refresh' },
  { kind: 'divider', key: 'theme-divider' },
  {
    kind: 'action',
    key: 'toggle-theme',
    action: 'toggle-theme',
    label: '切换主题',
    hint: isDarkTheme.value ? 'Light Mode' : 'Dark Mode',
  },
])
const outlineBaseLevel = computed(() => {
  if (outlineEntries.value.length === 0) return 1
  return Math.min(...outlineEntries.value.map((entry) => entry.level))
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

function getOutlineDepth(level: number): number {
  return Math.max(0, level - outlineBaseLevel.value)
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

function syncWindowTitle(file: FileInfo | null) {
  const nextTitle = file?.path || 'XMReader'
  document.title = nextTitle

  if ((window as any).runtime?.WindowSetTitle) {
    WindowSetTitle(nextTitle)
  }
}

function isExternalLinkHref(href: string): boolean {
  return /^(?:[a-zA-Z][a-zA-Z\d+.-]*:|\/\/)/.test(href) && !href.toLowerCase().startsWith('file://')
}

function closeReaderContextMenu() {
  if (!readerContextMenu.value.visible) return

  readerContextMenu.value = {
    visible: false,
    x: 0,
    y: 0,
  }
}

function positionReaderContextMenu(x: number, y: number) {
  const menu = readerContextMenuRef.value
  const menuWidth = menu?.offsetWidth ?? 220
  const menuHeight = menu?.offsetHeight ?? 264
  const viewportPadding = 12

  readerContextMenu.value = {
    visible: true,
    x: Math.min(Math.max(viewportPadding, x), window.innerWidth - menuWidth - viewportPadding),
    y: Math.min(Math.max(viewportPadding, y), window.innerHeight - menuHeight - viewportPadding),
  }
}

function focusReaderContextMenu() {
  readerContextMenuRef.value?.focus()
}

function handleReaderContextMenu(event: MouseEvent) {
  if (!currentFile.value || !isCurrentMarkdownFile.value) {
    closeReaderContextMenu()
    return
  }

  event.preventDefault()
  event.stopPropagation()
  positionReaderContextMenu(event.clientX, event.clientY)
  nextTick(() => {
    positionReaderContextMenu(event.clientX, event.clientY)
    focusReaderContextMenu()
  })
}

async function writeClipboardText(text: string) {
  if ((window as any).runtime?.ClipboardSetText) {
    const copied = await ClipboardSetText(text)
    if (!copied) {
      throw new Error('Wails 剪贴板写入失败')
    }
    return
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  throw new Error('当前环境不支持复制到剪贴板')
}

async function openCurrentDocumentDirectory(filePath: string) {
  const openDocumentDirectory = (window as any).go?.main?.App?.OpenDocumentDirectory as
    | ((path: string) => Promise<void>)
    | undefined

  if (!openDocumentDirectory) {
    throw new Error('打开文档目录接口尚未就绪')
  }

  await openDocumentDirectory(filePath)
}

async function refreshCurrentDocument() {
  const file = currentFile.value
  if (!file) {
    throw new Error('当前没有可刷新的文档')
  }

  const refreshedFile = await createFileInfoFromPath(file.path)
  if (!refreshedFile) {
    throw new Error('当前文档无法刷新')
  }

  const nextFiles = [...files.value]
  nextFiles[currentIndex.value] = refreshedFile
  files.value = nextFiles
}

function resolveThemePreference(): 'light' | 'dark' {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: 'light' | 'dark') {
  currentTheme.value = theme
  document.documentElement.setAttribute('data-theme', theme)
}

function toggleTheme() {
  const nextTheme = isDarkTheme.value ? 'light' : 'dark'
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
  applyTheme(nextTheme)
  showDropNotice('info', `已切换到${nextTheme === 'dark' ? '深色' : '浅色'}主题`)
}

function getReaderContextMenuActionLabel(action: ReaderContextMenuAction): string {
  const actionItem = readerContextMenuItems.value.find(
    (item): item is Extract<ReaderContextMenuItem, { kind: 'action' }> => item.kind === 'action' && item.action === action,
  )
  return actionItem?.label || action
}

async function handleReaderContextMenuAction(action: ReaderContextMenuAction) {
  const file = currentFile.value
  closeReaderContextMenu()

  if (action === 'toggle-theme') {
    toggleTheme()
    return
  }

  if (!file || !isCurrentMarkdownFile.value) {
    showDropNotice('error', '当前没有可操作的文档')
    return
  }

  try {
    switch (action) {
      case 'open-directory':
        await openCurrentDocumentDirectory(file.path)
        showDropNotice('info', '已打开当前 md 文档目录')
        return
      case 'copy-path':
        await writeClipboardText(file.path)
        showDropNotice('info', '已复制当前 md 路径')
        return
      case 'copy-content':
        await writeClipboardText(file.content)
        showDropNotice('info', '已复制当前 md 内容')
        return
      case 'refresh-document':
        await refreshCurrentDocument()
        showDropNotice('info', '已刷新当前文档')
        return
    }
  } catch (error) {
    console.error('[XMReader] 文档右键菜单操作失败:', error)
    showDropNotice('error', `${getReaderContextMenuActionLabel(action)}失败`)
  }
}

function handleDocumentPointerDown(event: MouseEvent) {
  if (!readerContextMenu.value.visible) return
  if (readerContextMenuRef.value?.contains(event.target as Node)) return
  closeReaderContextMenu()
}

function handleGlobalContextMenu(event: MouseEvent) {
  if (!readerContextMenu.value.visible) return
  if (readerContextMenuRef.value?.contains(event.target as Node)) return
  closeReaderContextMenu()
}

function handleReaderLinkClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
  if (!anchor) return

  const rawHref = anchor.getAttribute('href')?.trim()
  if (!rawHref) {
    return
  }

  if (rawHref.startsWith('#')) {
    const decodedId = decodeURIComponent(rawHref.slice(1))
    const targetElement = Array.from(readerContainer.value?.querySelectorAll<HTMLElement>('[id]') ?? [])
      .find((element) => element.id === decodedId)

    if (targetElement && readerContainer.value) {
      event.preventDefault()
      event.stopPropagation()
      const top = Math.max(0, getElementOffsetTop(targetElement) - 24)
      activeOutlineId.value = targetElement.dataset.xmOutlineId || activeOutlineId.value
      readerContainer.value.scrollTo({ top, behavior: 'smooth' })
    }
    return
  }

  const currentPath = currentFile.value?.path
  const resolvedLocalPath = resolveDocumentLinkPath(rawHref, currentPath)

  if (resolvedLocalPath && /\.(md|mdc|markdown|mdown|mkd|mkdn)$/i.test(resolvedLocalPath)) {
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

function toggleOutline() {
  isOutlineOpen.value = !isOutlineOpen.value
  if (isOutlineOpen.value) {
    scheduleOutlineRefresh()
  }
}

function disconnectOutlineObserver() {
  outlineObserver?.disconnect()
  outlineObserver = null
}

function cancelOutlineRefresh() {
  if (outlineRefreshFrame !== null) {
    cancelAnimationFrame(outlineRefreshFrame)
    outlineRefreshFrame = null
  }
}

function scheduleOutlineRefresh() {
  cancelOutlineRefresh()
  outlineRefreshFrame = requestAnimationFrame(() => {
    outlineRefreshFrame = null
    refreshOutline()
  })
}

function getHeadingElements(): HTMLElement[] {
  return Array.from(readerContainer.value?.querySelectorAll<HTMLElement>(HEADING_SELECTOR) ?? [])
}

function getHeadingAnchorId(index: number): string {
  return `${OUTLINE_ID_PREFIX}${index + 1}`
}

function getHeadingElementByOutlineId(outlineId: string): HTMLElement | null {
  return readerContainer.value?.querySelector<HTMLElement>(`[data-xm-outline-id="${outlineId}"]`) ?? null
}

function getElementOffsetTop(element: HTMLElement): number {
  const container = readerContainer.value
  if (!container) return 0
  const containerRect = container.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  return elementRect.top - containerRect.top + container.scrollTop
}

function refreshOutline() {
  const headingElements = getHeadingElements()
  const nextEntries = headingElements.map((heading, index) => {
    const outlineId = getHeadingAnchorId(index)
    const headingText = heading.textContent?.replace(/\s+/g, ' ').trim() || `未命名章节 ${index + 1}`

    heading.dataset.xmOutlineId = outlineId
    if (!heading.id || heading.dataset.xmOutlineGeneratedId === GENERATED_OUTLINE_ID_FLAG) {
      heading.id = outlineId
      heading.dataset.xmOutlineGeneratedId = GENERATED_OUTLINE_ID_FLAG
    }

    return {
      id: outlineId,
      text: headingText,
      level: Number(heading.tagName.slice(1)),
    }
  })

  outlineEntries.value = nextEntries
  if (!nextEntries.some((entry) => entry.id === activeOutlineId.value)) {
    activeOutlineId.value = nextEntries[0]?.id ?? ''
  }

  updateActiveOutline()
}

function updateActiveOutline() {
  const container = readerContainer.value
  if (!container || outlineEntries.value.length === 0) {
    activeOutlineId.value = ''
    return
  }

  const scrollPosition = container.scrollTop + 72
  let nextActiveId = ''

  for (const entry of outlineEntries.value) {
    const heading = getHeadingElementByOutlineId(entry.id)
    if (!heading) continue

    if (getElementOffsetTop(heading) <= scrollPosition) {
      nextActiveId = entry.id
    } else {
      break
    }
  }

  activeOutlineId.value = nextActiveId
}

function scrollToHeading(outlineId: string) {
  const container = readerContainer.value
  const heading = getHeadingElementByOutlineId(outlineId)
  if (!container || !heading) return

  const top = Math.max(0, getElementOffsetTop(heading) - 24)
  activeOutlineId.value = outlineId
  container.scrollTo({ top, behavior: 'smooth' })

  if (window.innerWidth <= 960) {
    isOutlineOpen.value = false
  }
}

function observeReaderContent(container: HTMLElement | null) {
  disconnectOutlineObserver()

  if (!container) {
    outlineEntries.value = []
    activeOutlineId.value = ''
    return
  }

  outlineObserver = new MutationObserver(() => {
    scheduleOutlineRefresh()
  })

  outlineObserver.observe(container, {
    childList: true,
    subtree: true,
    characterData: true,
  })

  scheduleOutlineRefresh()
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
  applyTheme(resolveThemePreference())
}

function setupSystemThemeSync() {
  systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)')
  const handleThemeChange = () => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedTheme === 'dark' || savedTheme === 'light') return
    syncSystemTheme()
  }
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

  if (!isImageFile(filePath)) {
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

function activateTab(index: number) {
  if (index < 0 || index >= files.value.length) return
  currentIndex.value = index
}

function closeTab(index: number) {
  if (index < 0 || index >= files.value.length) return

  const nextFiles = files.value.filter((_, fileIndex) => fileIndex !== index)
  let nextIndex = currentIndex.value

  if (index < currentIndex.value) {
    nextIndex -= 1
  } else if (index === currentIndex.value) {
    nextIndex = Math.min(currentIndex.value, nextFiles.length - 1)
  }

  files.value = nextFiles
  currentIndex.value = Math.max(0, nextIndex)
}

function handleTabMouseDown(event: MouseEvent, index: number) {
  if (event.button !== 1) return

  event.preventDefault()
  event.stopPropagation()
  closeTab(index)
}

async function openPaths(paths: string[], mode: 'replace' | 'append') {
  const uniquePaths = Array.from(new Set(paths.map((path) => path.trim()).filter(Boolean)))

  loading.value = true
  try {
    const results = await Promise.allSettled(uniquePaths.map((path) => createFileInfoFromPath(path)))
    const nextFiles: FileInfo[] = []
    let failedCount = 0
    let unsupportedCount = 0

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        nextFiles.push(result.value)
      } else if (result.status === 'rejected') {
        const message = String(result.reason ?? '')
        if (message.includes('暂不支持打开此类型文件')) {
          unsupportedCount++
        } else {
          failedCount++
        }
        console.error('[XMReader] 打开拖放文件失败:', result.reason)
      }
    }

    if (nextFiles.length === 0) {
      if (unsupportedCount > 0 && failedCount === 0) {
        showDropNotice('error', '当前仅支持打开 Markdown、图片和已接入的源码/脚本文件')
      } else {
        showDropNotice('error', '文件打开失败')
      }
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
  if (e.key === 'Escape' && readerContextMenu.value.visible) {
    e.preventDefault()
    closeReaderContextMenu()
    return
  }

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
  if (readerContextMenu.value.visible) {
    closeReaderContextMenu()
  }
  showScrollTop.value = (readerContainer.value?.scrollTop || 0) > 300
  updateActiveOutline()
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
    closeReaderContextMenu()
    readerContainer.value?.scrollTo({ top: 0 })
    showScrollTop.value = false
    activeOutlineId.value = ''
    scheduleOutlineRefresh()
  })
})

watch(currentFile, (file) => {
  syncWindowTitle(file)
  nextTick(() => {
    closeReaderContextMenu()
    readerContainer.value?.scrollTo({ top: 0 })
    showScrollTop.value = false
    activeOutlineId.value = ''
    scheduleOutlineRefresh()
  })
}, { immediate: true })

watch(readerContainer, (container) => {
  observeReaderContent(container)
})

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
  document.addEventListener('mousedown', handleDocumentPointerDown)
  document.addEventListener('contextmenu', handleGlobalContextMenu)
  window.addEventListener('resize', closeReaderContextMenu)
  window.addEventListener('dragenter', handleWindowDragEnter)
  window.addEventListener('dragover', handleWindowDragOver)
  window.addEventListener('dragleave', handleWindowDragLeave)
  window.addEventListener('drop', handleWindowDrop)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('mousedown', handleDocumentPointerDown)
  document.removeEventListener('contextmenu', handleGlobalContextMenu)
  window.removeEventListener('resize', closeReaderContextMenu)
  window.removeEventListener('dragenter', handleWindowDragEnter)
  window.removeEventListener('dragover', handleWindowDragOver)
  window.removeEventListener('dragleave', handleWindowDragLeave)
  window.removeEventListener('drop', handleWindowDrop)
  disconnectOutlineObserver()
  cancelOutlineRefresh()
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
