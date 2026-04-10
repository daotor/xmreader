import type { MenuItemGroup } from '../types/editor'

/** 菜单 A（"/" 斜杠命令 + "+" 按钮）条目 */
export const slashMenuItems: MenuItemGroup[] = [
  {
    label: '基础',
    items: [
      { id: 'heading1', label: 'H1', description: '大标题', icon: 'H1', command: 'toggleHeading', args: { level: 1 }, keywords: ['h1', '标题', 'heading'] },
      { id: 'heading2', label: 'H2', description: '中标题', icon: 'H2', command: 'toggleHeading', args: { level: 2 }, keywords: ['h2', '标题', 'heading'] },
      { id: 'heading3', label: 'H3', description: '小标题', icon: 'H3', command: 'toggleHeading', args: { level: 3 }, keywords: ['h3', '标题', 'heading'] },
      { id: 'heading4', label: 'H4', description: '四级标题', icon: 'H4', command: 'toggleHeading', args: { level: 4 }, keywords: ['h4', '标题', 'heading'] },
      { id: 'heading5', label: 'H5', description: '五级标题', icon: 'H5', command: 'toggleHeading', args: { level: 5 }, keywords: ['h5', '标题', 'heading'] },
      { id: 'orderedList', label: '有序列表', description: '有序列表', icon: 'ListOrdered', command: 'toggleOrderedList', keywords: ['ol', '有序', 'ordered'] },
      { id: 'bulletList', label: '无序列表', description: '无序列表', icon: 'List', command: 'toggleBulletList', keywords: ['ul', '无序', 'bullet'] },
      { id: 'taskList', label: '任务列表', description: '可勾选的任务', icon: 'CheckSquare', command: 'toggleTaskList', keywords: ['todo', '任务', 'task', 'checkbox'] },
      { id: 'codeBlock', label: '代码块', description: '代码片段', icon: 'Code', command: 'toggleCodeBlock', keywords: ['code', '代码'] },
      { id: 'blockquote', label: '引用', description: '引用文本', icon: 'Quote', command: 'toggleBlockquote', keywords: ['quote', '引用', 'blockquote'] },
      { id: 'horizontalRule', label: '分割线', description: '水平分割线', icon: 'Minus', command: 'setHorizontalRule', keywords: ['hr', '分割', 'divider'] },
      { id: 'link', label: '链接', description: '插入链接', icon: 'Link', command: 'insertLink', keywords: ['link', '链接', 'url'] },
    ],
  },
  {
    label: '常用',
    items: [
      { id: 'image', label: '图片', description: '插入图片', icon: 'Image', command: 'insertImage', keywords: ['image', '图片', 'img'] },
      { id: 'table', label: '表格', description: '插入表格', icon: 'Table', command: 'insertTable', hasSubMenu: true, keywords: ['table', '表格'] },
      { id: 'highlight', label: '高亮块', description: '高亮提示', icon: 'AlertCircle', command: 'insertHighlightBlock', keywords: ['highlight', '高亮', '提示'] },
      { id: 'video', label: '视频或文件', description: '插入视频或文件', icon: 'Film', command: 'insertFile', placeholder: true, keywords: ['video', '视频', '文件'] },
      { id: 'columns', label: '分栏', description: '分栏布局', icon: 'Columns', command: 'insertColumns', hasSubMenu: true, placeholder: true, keywords: ['columns', '分栏'] },
      { id: 'syncBlock', label: '同步块', description: '同步引用内容', icon: 'RefreshCw', command: 'insertSyncBlock', placeholder: true, keywords: ['sync', '同步'] },
      { id: 'button', label: '按钮', description: '插入按钮', icon: 'MousePointer', command: 'insertButton', hasSubMenu: true, placeholder: true, keywords: ['button', '按钮'] },
      { id: 'formula', label: '公式', description: '数学公式', icon: 'Sigma', command: 'insertFormula', placeholder: true, keywords: ['formula', '公式', 'math', 'latex'] },
    ],
  },
]

/** 菜单 B（块侧边操作菜单）- 快捷块类型转换区（4列×3行） */
export const blockTypeItems: MenuItemGroup[] = [
  {
    label: '',
    items: [
      /* 第 1 行 */
      { id: 'paragraph', label: '正文', icon: 'Type', command: 'setParagraph', keywords: ['text', '正文'] },
      { id: 'heading1', label: 'H1', icon: 'H1', command: 'toggleHeading', args: { level: 1 }, keywords: ['h1'] },
      { id: 'heading2', label: 'H2', icon: 'H2', command: 'toggleHeading', args: { level: 2 }, keywords: ['h2'] },
      { id: 'heading3', label: 'H3', icon: 'H3', command: 'toggleHeading', args: { level: 3 }, keywords: ['h3'] },
      /* 第 2 行 */
      { id: 'heading4', label: 'H4', icon: 'H4', command: 'toggleHeading', args: { level: 4 }, keywords: ['h4'] },
      { id: 'heading5', label: 'H5', icon: 'H5', command: 'toggleHeading', args: { level: 5 }, keywords: ['h5'] },
      { id: 'bulletList', label: '无序列表', icon: 'List', command: 'toggleBulletList', keywords: ['ul', '无序'] },
      { id: 'orderedList', label: '有序列表', icon: 'ListOrdered', command: 'toggleOrderedList', keywords: ['ol', '有序'] },
      /* 第 3 行 */
      { id: 'taskList', label: 'TODO', icon: 'CheckSquare', command: 'toggleTaskList', keywords: ['task', 'todo', '任务'] },
      { id: 'codeBlock', label: '代码块', icon: 'Code', command: 'toggleCodeBlock', keywords: ['code', '代码'] },
      { id: 'blockquote', label: '引用块', icon: 'Quote', command: 'toggleBlockquote', keywords: ['quote', '引用'] },
      { id: 'highlightBlock', label: '高亮块', icon: 'AlertCircle', command: 'insertHighlightBlock', keywords: ['highlight', '高亮'] },
    ],
  },
]

/** 菜单 B - 操作项区 */
export const blockActionItems: MenuItemGroup[] = [
  {
    label: '',
    items: [
      { id: 'indent', label: '缩进和对齐', icon: 'IndentIncrease', command: 'indent', hasSubMenu: true, placeholder: true, keywords: [] },
      { id: 'color', label: '颜色', icon: 'Palette', command: 'setColor', hasSubMenu: true, placeholder: true, keywords: [] },
      { id: 'comment', label: '评论', icon: 'MessageSquare', command: 'addComment', placeholder: true, keywords: [] },
    ],
  },
  {
    label: '',
    items: [
      { id: 'addBelow', label: '在下方添加', icon: 'PlusCircle', command: 'addBlockBelow', hasSubMenu: true, keywords: [] },
    ],
  },
]
