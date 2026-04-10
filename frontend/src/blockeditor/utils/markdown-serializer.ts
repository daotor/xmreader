/**
 * TipTap JSON -> GFM Markdown 序列化器
 *
 * 高亮块降级策略：导出为 blockquote，首行带类型标记
 * > [!INFO]
 * > 内容
 *
 * 使用 GitHub 的 Alert 语法（GFM 扩展）
 */

interface TiptapNode {
  type: string
  attrs?: Record<string, any>
  content?: TiptapNode[]
  text?: string
  marks?: TiptapMark[]
}

interface TiptapMark {
  type: string
  attrs?: Record<string, any>
}

/**
 * 将 TipTap JSON 文档转为 GFM Markdown
 */
export function serializeToMarkdown(doc: TiptapNode): string {
  if (doc.type !== 'doc' || !doc.content) return ''
  return serializeNodes(doc.content).trim() + '\n'
}

function serializeNodes(nodes: TiptapNode[]): string {
  const parts: string[] = []

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const result = serializeNode(node)
    parts.push(result)
  }

  return parts.join('\n')
}

function serializeNode(node: TiptapNode): string {
  switch (node.type) {
    case 'paragraph':
      return serializeInline(node.content) + '\n'

    case 'heading': {
      const level = node.attrs?.level ?? 1
      const prefix = '#'.repeat(level)
      return `${prefix} ${serializeInline(node.content)}\n`
    }

    case 'bulletList':
      return serializeList(node, '- ') + '\n'

    case 'orderedList':
      return serializeOrderedList(node) + '\n'

    case 'taskList':
      return serializeTaskList(node) + '\n'

    case 'listItem':
      return serializeNodes(node.content || [])

    case 'taskItem': {
      const checked = node.attrs?.checked ? '[x]' : '[ ]'
      const content = serializeInline(node.content?.[0]?.content)
      return `- ${checked} ${content}\n`
    }

    case 'blockquote': {
      const inner = serializeNodes(node.content || [])
      return inner
        .split('\n')
        .map(line => (line ? `> ${line}` : '>'))
        .join('\n') + '\n'
    }

    case 'codeBlock': {
      const lang = node.attrs?.language || ''
      const code = node.content?.[0]?.text || ''
      return `\`\`\`${lang}\n${code}\n\`\`\`\n`
    }

    case 'horizontalRule':
      return '---\n'

    case 'image': {
      const src = node.attrs?.src || ''
      const alt = node.attrs?.alt || ''
      const title = node.attrs?.title
      if (title) return `![${alt}](${src} "${title}")\n`
      return `![${alt}](${src})\n`
    }

    case 'table':
      return serializeTable(node) + '\n'

    case 'highlightBlock': {
      // GFM Alert 语法降级
      const type = (node.attrs?.type || 'info').toUpperCase()
      const alertType = type === 'DANGER' ? 'CAUTION'
        : type === 'SUCCESS' ? 'TIP'
        : type === 'INFO' ? 'NOTE'
        : 'WARNING'
      const inner = serializeNodes(node.content || [])
      const lines = inner.split('\n')
      const quotedLines = [`> [!${alertType}]`, ...lines.map(l => (l ? `> ${l}` : '>'))]
      return quotedLines.join('\n') + '\n'
    }

    case 'text':
      return serializeTextWithMarks(node)

    case 'hardBreak':
      return '  \n'

    default:
      // 未知节点，尝试序列化子内容
      if (node.content) return serializeNodes(node.content)
      return ''
  }
}

function serializeInline(content?: TiptapNode[]): string {
  if (!content) return ''
  return content.map(n => serializeTextWithMarks(n)).join('')
}

function serializeTextWithMarks(node: TiptapNode): string {
  if (node.type === 'hardBreak') return '  \n'
  if (node.type !== 'text' || !node.text) {
    if (node.type === 'image') {
      const src = node.attrs?.src || ''
      const alt = node.attrs?.alt || ''
      return `![${alt}](${src})`
    }
    return ''
  }

  let text = node.text
  if (!node.marks || node.marks.length === 0) return text

  // 按优先级包裹 marks
  for (const mark of node.marks) {
    switch (mark.type) {
      case 'bold':
      case 'strong':
        text = `**${text}**`
        break
      case 'italic':
      case 'em':
        text = `*${text}*`
        break
      case 'underline':
        // GFM 不支持下划线，使用 HTML
        text = `<u>${text}</u>`
        break
      case 'strike':
        text = `~~${text}~~`
        break
      case 'code':
        text = `\`${text}\``
        break
      case 'link':
        text = `[${text}](${mark.attrs?.href || ''})`
        break
      case 'highlight':
        text = `==${text}==`
        break
    }
  }

  return text
}

function serializeList(node: TiptapNode, marker: string): string {
  if (!node.content) return ''
  return node.content
    .map(item => {
      const inner = serializeNodes(item.content || []).trimEnd()
      const lines = inner.split('\n')
      return lines
        .map((line, i) => (i === 0 ? `${marker}${line}` : `  ${line}`))
        .join('\n')
    })
    .join('\n')
}

function serializeOrderedList(node: TiptapNode): string {
  if (!node.content) return ''
  const start = node.attrs?.start ?? 1
  return node.content
    .map((item, idx) => {
      const num = start + idx
      const inner = serializeNodes(item.content || []).trimEnd()
      const lines = inner.split('\n')
      return lines
        .map((line, i) => (i === 0 ? `${num}. ${line}` : `   ${line}`))
        .join('\n')
    })
    .join('\n')
}

function serializeTaskList(node: TiptapNode): string {
  if (!node.content) return ''
  return node.content.map(item => serializeNode(item)).join('').trimEnd()
}

function serializeTable(node: TiptapNode): string {
  if (!node.content) return ''

  const rows = node.content.filter(r => r.type === 'tableRow')
  if (rows.length === 0) return ''

  const lines: string[] = []

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri]
    const cells = (row.content || []).map(cell => {
      return serializeInline(cell.content?.[0]?.content).trim()
    })
    lines.push(`| ${cells.join(' | ')} |`)

    // 在第一行后插入分隔线
    if (ri === 0) {
      const sep = cells.map(() => '---').join(' | ')
      lines.push(`| ${sep} |`)
    }
  }

  return lines.join('\n')
}
