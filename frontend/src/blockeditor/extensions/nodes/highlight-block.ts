import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { HighlightBlockType } from '../../types/editor'

export interface HighlightBlockOptions {
  types: HighlightBlockType[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    highlightBlock: {
      setHighlightBlock: (attrs?: { type?: HighlightBlockType }) => ReturnType
      toggleHighlightBlock: (attrs?: { type?: HighlightBlockType }) => ReturnType
    }
  }
}

/**
 * 高亮块扩展
 * 支持 info / success / warning / danger 四种类型
 * 渲染为带图标与彩色边栏的容器块
 */
export const HighlightBlock = Node.create<HighlightBlockOptions>({
  name: 'highlightBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  addOptions() {
    return { types: ['info', 'success', 'warning', 'danger'] }
  },

  addAttributes() {
    return {
      type: {
        default: 'info' as HighlightBlockType,
        parseHTML: el => (el.getAttribute('data-type') as HighlightBlockType) || 'info',
        renderHTML: attrs => ({ 'data-type': attrs.type }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-highlight-block]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-highlight-block': '',
      class: `highlight-block highlight-block--${HTMLAttributes['data-type'] || 'info'}`,
    }), 0]
  },

  addCommands() {
    return {
      setHighlightBlock: (attrs) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { type: attrs?.type || 'info' },
          content: [{ type: 'paragraph' }],
        })
      },
      toggleHighlightBlock: (attrs) => ({ commands, editor }) => {
        if (editor.isActive(this.name)) {
          return commands.lift(this.name)
        }
        return commands.setHighlightBlock(attrs)
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      // Backspace on empty highlight block -> unwrap
      Backspace: () => {
        const { editor } = this
        if (!editor.isActive(this.name)) return false
        const { $from } = editor.state.selection
        if ($from.parent.content.size > 0) return false
        return editor.commands.lift(this.name)
      },
    }
  },
})
