/**
 * 共享图标配置
 * 统一管理文字图标和 SVG 路径图标，供 BlockEditor / SideMenu / EditorToolbar 等组件使用
 */

/** 文字图标集合 — 直接用 HTML 渲染，不走 SVG */
export const textIconMap: Record<string, string> = {
  Type: 'T',
  H1: 'H1',
  H2: 'H2',
  H3: 'H3',
  H4: 'H4',
  H5: 'H5',
}

/** SVG 路径图标映射（viewBox 统一为 0 0 24 24） */
export const svgIconMap: Record<string, string> = {
  // 列表类
  List:           '<line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.5" fill="currentColor" stroke="none"/>',
  ListOrdered:    '<line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="4" y="8" font-size="7" font-weight="600" fill="currentColor" stroke="none" font-family="sans-serif">1</text><text x="4" y="14.5" font-size="7" font-weight="600" fill="currentColor" stroke="none" font-family="sans-serif">2</text><text x="4" y="21" font-size="7" font-weight="600" fill="currentColor" stroke="none" font-family="sans-serif">3</text>',
  CheckSquare:    '<rect x="3" y="5" width="6" height="6" rx="1"/><polyline points="5 8 6.5 9.5 9 6.5" stroke-width="1.5"/><line x1="13" y1="8" x2="21" y2="8"/><rect x="3" y="14" width="6" height="6" rx="1"/><line x1="13" y1="17" x2="21" y2="17"/>',

  // 代码 / 引用
  Code:           '<rect x="2" y="3" width="20" height="18" rx="3"/><polyline points="8 9 5 12 8 15"/><polyline points="16 9 19 12 16 15"/>',
  Quote:          '<line x1="3" y1="4" x2="3" y2="20" stroke-width="2.5"/><line x1="9" y1="7" x2="21" y2="7"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="17" x2="17" y2="17"/>',

  // 块类型
  Star:           '<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>',
  AlertCircle:    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  Table:          '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>',
  Image:          '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  Minus:          '<line x1="5" y1="12" x2="19" y2="12"/>',
  Film:           '<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/>',
  Columns:        '<rect x="3" y="3" width="7" height="18" rx="1.5"/><rect x="14" y="3" width="7" height="18" rx="1.5"/>',
  RefreshCw:      '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  MousePointer:   '<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/>',
  Sigma:          '<path d="M18 7V4H6l6 8-6 8h12v-3"/>',

  // 操作项
  IndentIncrease: '<line x1="3" y1="5" x2="21" y2="5"/><line x1="3" y1="19" x2="21" y2="19"/><line x1="11" y1="12" x2="21" y2="12"/><polyline points="3 9 7 12 3 15"/>',
  Palette:        '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="9" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="9" r="1.5" fill="currentColor" stroke="none"/><circle cx="8" cy="14" r="1.5" fill="currentColor" stroke="none"/>',
  MessageSquare:  '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  PlusCircle:     '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
  Copy:           '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  Trash:          '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  Link:           '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
}

/** 判断图标名是否为文字图标（不走 SVG） */
export function isTextIcon(iconName: string): boolean {
  return iconName in textIconMap
}

/** 获取 SVG 内部路径，未匹配时返回首字母文字 fallback */
export function getSvgContent(iconName: string): string {
  return svgIconMap[iconName]
    ?? `<text x="12" y="16" text-anchor="middle" font-size="10" fill="currentColor" stroke="none">${iconName.charAt(0)}</text>`
}

/** 根据 ProseMirror 节点类型返回图标 key */
export function getBlockIconKey(node: any): string {
  if (!node) return 'Type'
  switch (node.type.name) {
    case 'heading':        return `H${node.attrs?.level || 1}`
    case 'bulletList':     return 'List'
    case 'orderedList':    return 'ListOrdered'
    case 'taskList':       return 'CheckSquare'
    case 'codeBlock':      return 'Code'
    case 'blockquote':     return 'Quote'
    case 'highlightBlock': return 'Star'
    case 'table':          return 'Table'
    case 'image':          return 'Image'
    default:               return 'Type'
  }
}
