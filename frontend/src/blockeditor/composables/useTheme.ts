import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * 全局主题管理（与外层页面主题同步）
 *
 * - 监听 document.documentElement 的 data-theme 属性
 * - 当外层页面切换主题时，自动同步到 blockeditor
 * - 统一管理 DOM class：.block-editor.theme-dark / body.be-theme-dark
 */

const isDark = ref(false)
let initialized = false
let observer: MutationObserver | null = null
let mediaQuery: MediaQueryList | null = null
let handleMediaChange: ((event: MediaQueryListEvent) => void) | null = null

/** 将当前主题状态同步到 DOM */
function applyTheme() {
  const editorRoot = document.querySelector('.block-editor')
  if (editorRoot) {
    editorRoot.classList.toggle('theme-dark', isDark.value)
  }
  document.body.classList.toggle('be-theme-dark', isDark.value)
}

/** 从外层页面读取当前主题 */
function readExternalTheme(): boolean {
  const theme = document.documentElement.getAttribute('data-theme')
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** 初始化：监听外层页面主题变化 */
function init() {
  if (initialized) return
  initialized = true

  // 读取初始主题
  isDark.value = readExternalTheme()

  // 监听 data-theme 属性变化
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        isDark.value = readExternalTheme()
        applyTheme()
      }
    }
  })

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  })

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  handleMediaChange = () => {
    if (document.documentElement.hasAttribute('data-theme')) return
    isDark.value = mediaQuery?.matches ?? false
    applyTheme()
  }
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleMediaChange)
  } else {
    mediaQuery.addListener(handleMediaChange)
  }

  // 首次应用（需等 DOM 就绪）
  requestAnimationFrame(() => applyTheme())
}

/** 销毁监听 */
function destroy() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (mediaQuery && handleMediaChange) {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handleMediaChange)
    } else {
      mediaQuery.removeListener(handleMediaChange)
    }
  }
  mediaQuery = null
  handleMediaChange = null
  initialized = false
}

/** 手动切换主题（同时更新外层页面） */
function toggleTheme() {
  const newTheme = isDark.value ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', newTheme)
  localStorage.setItem('xmdor-theme', newTheme)
  // isDark 会通过 MutationObserver 自动更新
}

/**
 * 主题 composable
 *
 * 用法：
 * ```ts
 * const { isDark, toggleTheme } = useTheme()
 * ```
 */
export function useTheme() {
  onMounted(() => {
    init()
    // 每次挂载时重新同步 DOM（防止动态渲染的 .block-editor 未被应用）
    requestAnimationFrame(() => applyTheme())
  })

  onBeforeUnmount(() => {
    destroy()
  })

  return {
    isDark,
    toggleTheme,
    applyTheme,
  }
}
