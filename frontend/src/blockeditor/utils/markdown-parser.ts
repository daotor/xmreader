/**
 * GFM Markdown -> TipTap 导入
 *
 * 策略：
 * 1. 预处理：识别 GFM Alert 语法，转为自定义 HTML 标签
 * 2. 使用 marked 将 GFM 解析为 HTML
 * 3. 将 HTML 喂给 TipTap 的 setContent
 *
 * 高亮块导入：GFM Alert [!NOTE/TIP/WARNING/CAUTION] -> highlightBlock
 */

import { marked } from 'marked'

export interface MarkdownToHtmlOptions {
  documentUrl?: string
}

/**
 * GFM Alert 类型映射到高亮块类型
 */
const ALERT_TYPE_MAP: Record<string, string> = {
  NOTE: 'info',
  TIP: 'success',
  IMPORTANT: 'info',
  WARNING: 'warning',
  CAUTION: 'danger',
}

/**
 * 预处理 Markdown：将 GFM Alert 语法转为自定义 HTML
 *
 * 输入格式：
 * > [!NOTE]
 * > 内容
 *
 * 输出格式：
 * <div data-highlight-block data-type="info"><p>内容</p></div>
 */
function preprocessAlerts(md: string): string {
  // 匹配 GFM Alert blocks
  const alertRegex = /^(>)\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n((?:>\s?.*\n?)*)/gm

  return md.replace(alertRegex, (_, _quote, type, body) => {
    const highlightType = ALERT_TYPE_MAP[type] || 'info'
    // 去掉引用前缀并清理
    const content = body
      .split('\n')
      .map((line: string) => line.replace(/^>\s?/, ''))
      .join('\n')
      .trim()

    // 返回自定义标签（会被 TipTap 的 highlightBlock 扩展解析）
    return `<div data-highlight-block data-type="${highlightType}">\n\n${content}\n\n</div>\n`
  })
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function isWindowsDrivePath(path: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(path)
}

export function filePathToFileUrl(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  if (normalized.startsWith('//')) {
    return `file:${encodeURI(normalized)}`
  }
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return `file:///${encodeURI(normalized)}`
  }
  if (normalized.startsWith('/')) {
    return `file://${encodeURI(normalized)}`
  }
  return encodeURI(normalized)
}

function toBaseUrl(documentUrl: string): string {
  if (isWindowsDrivePath(documentUrl)) {
    return filePathToFileUrl(documentUrl)
  }

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(documentUrl)) {
    return documentUrl
  }

  return filePathToFileUrl(documentUrl)
}

function resolveAssetUrl(url: string, documentUrl?: string): string {
  if (!url) {
    return url
  }

  if (isWindowsDrivePath(url)) {
    return filePathToFileUrl(url)
  }

  const normalizedUrl = url.replace(/\\/g, '/')

  if (normalizedUrl.startsWith('/')) {
    return filePathToFileUrl(normalizedUrl)
  }

  if (!documentUrl) {
    return normalizedUrl
  }

  if (/^(?:[a-zA-Z][a-zA-Z\d+.-]*:|\/\/|#)/.test(normalizedUrl)) {
    return normalizedUrl
  }

  try {
    return new URL(normalizedUrl, toBaseUrl(documentUrl)).href
  } catch (error) {
    console.warn('[MarkdownParser] failed to resolve asset url:', url, error)
    return normalizedUrl
  }
}

/**
 * 将 GFM Markdown 解析为 HTML（供 TipTap setContent 使用）
 */
export function markdownToHtml(md: string, options: MarkdownToHtmlOptions = {}): string {
  // 先预处理 Alert 语法
  const preprocessed = preprocessAlerts(md)
  const renderer = new marked.Renderer()

  renderer.image = function (...args: any[]) {
    const image = args[0]
    const href = typeof image === 'string' ? image : image?.href || ''
    const title = (typeof image === 'object' ? image?.title : args[1]) || ''
    const text = (typeof image === 'object' ? image?.text : args[2]) || ''
    const resolvedHref = resolveAssetUrl(href, options.documentUrl)
    const titleAttr = title ? ` title="${escapeHtmlAttr(title)}"` : ''
    return `<img src="${escapeHtmlAttr(resolvedHref)}" alt="${escapeHtmlAttr(text)}"${titleAttr}>`
  }

  // 使用 marked 解析为 HTML（启用 GFM）
  const html = marked.parse(preprocessed, {
    renderer,
    gfm: true,
    breaks: false,
  })

  // marked.parse 可能返回 Promise（异步模式），这里确保同步
  if (typeof html !== 'string') {
    console.warn('[MarkdownParser] marked returned non-string, falling back to sync')
    return ''
  }

  return html
}

/**
 * 检测文本是否可能是 Markdown 格式
 */
export function isLikelyMarkdown(text: string): boolean {
  const patterns = [
    /^#{1,6}\s/m,           // 标题
    /^\s*[-*+]\s/m,          // 无序列表
    /^\s*\d+\.\s/m,          // 有序列表
    /^\s*>\s/m,              // 引用
    /```/,                   // 代码块
    /\[.+\]\(.+\)/,          // 链接
    /!\[.*\]\(.+\)/,         // 图片
    /\*\*.+\*\*/,            // 粗体
    /\|.+\|.+\|/,            // 表格
    /^\s*- \[[ x]\]/m,       // 任务列表
  ]

  let matches = 0
  for (const pattern of patterns) {
    if (pattern.test(text)) matches++
    if (matches >= 2) return true
  }
  return false
}
