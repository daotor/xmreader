import type { Editor } from '@tiptap/core'

export type BlockEditorContentFormat = 'json' | 'markdown'

export interface BlockEditorProps {
  content?: string
  contentFormat?: BlockEditorContentFormat
  editable?: boolean
  placeholder?: string
  documentUrl?: string
  readerMode?: boolean
}

export interface BlockEditorEmits {
  (e: 'update:content', json: string): void
  (e: 'save', json: string): void
  (e: 'ready', editor: Editor): void
}

export interface BlockEditorExpose {
  getJSON(): object
  getHTML(): string
  getMarkdown(): string
  setMarkdown(md: string): void
  setJSON(json: object): void
  focus(): void
  isEmpty(): boolean
}

export interface BlockEditorOptions {
  content?: string
  contentFormat?: BlockEditorContentFormat
  editable?: boolean
  placeholder?: string
  documentUrl?: string
  onUpdate?: (json: object) => void
  onSave?: (json: object) => void
}

/** 菜单项定义 */
export interface MenuItem {
  id: string
  label: string
  icon?: string
  description?: string
  command: string
  args?: Record<string, any>
  hasSubMenu?: boolean
  placeholder?: boolean
  keywords?: string[]
  /** 所属分组名（由斜杠菜单扁平化时填充） */
  group?: string
}

/** 菜单分组 */
export interface MenuItemGroup {
  label: string
  items: MenuItem[]
}

/** 高亮块类型 */
export type HighlightBlockType = 'info' | 'success' | 'warning' | 'danger'

/** 图片上传回调 */
export interface ImageUploadOptions {
  file: File
  onProgress?: (percent: number) => void
}

export type ImageUploadHandler = (options: ImageUploadOptions) => Promise<string>
