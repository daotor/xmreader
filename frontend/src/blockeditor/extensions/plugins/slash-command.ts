import { Extension } from '@tiptap/core'
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion'
import type { Editor } from '@tiptap/core'
import type { MenuItem, MenuItemGroup } from '../../types/editor'
import { slashMenuItems } from '../../config/menu-items'

export interface SlashCommandOptions {
  suggestion: Partial<SuggestionOptions>
}

/** 执行菜单命令 */
export function executeMenuCommand(editor: Editor, item: MenuItem) {
  const chain = editor.chain().focus()
  switch (item.command) {
    case 'toggleHeading':
      chain.toggleHeading({ level: item.args?.level ?? 1 }).run()
      break
    case 'toggleBulletList':
      chain.toggleBulletList().run()
      break
    case 'toggleOrderedList':
      chain.toggleOrderedList().run()
      break
    case 'toggleTaskList':
      chain.toggleTaskList().run()
      break
    case 'toggleCodeBlock':
      chain.toggleCodeBlock().run()
      break
    case 'toggleBlockquote':
      chain.toggleBlockquote().run()
      break
    case 'setHorizontalRule':
      chain.setHorizontalRule().run()
      break
    case 'setParagraph':
      chain.setParagraph().run()
      break
    case 'insertTable':
      chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      break
    case 'insertHighlightBlock':
      chain.insertContent({ type: 'highlightBlock', attrs: { type: 'info' }, content: [{ type: 'paragraph' }] }).run()
      break
    default:
      console.log(`[SlashCommand] Placeholder: ${item.command}`)
      break
  }
}

/** 根据查询过滤菜单项（结果携带分组名称） */
export function filterMenuItems(groups: MenuItemGroup[], query: string): MenuItem[] {
  const q = query.toLowerCase()
  const results: MenuItem[] = []
  for (const group of groups) {
    for (const item of group.items) {
      if (item.placeholder) continue
      const match =
        item.label.toLowerCase().includes(q) ||
        (item.description?.toLowerCase().includes(q)) ||
        (item.keywords?.some(k => k.includes(q)))
      if (match) results.push({ ...item, group: group.label })
    }
  }
  return results
}

/** 斜杠命令扩展 */
export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        allowSpaces: false,
        startOfLine: false,
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run()
          executeMenuCommand(editor, props)
        },
        items: ({ query }) => {
          if (!query) return slashMenuItems.flatMap(g => g.items.filter(i => !i.placeholder).map(i => ({ ...i, group: g.label })))
          return filterMenuItems(slashMenuItems, query)
        },
      },
    }
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({ editor: this.editor, ...this.options.suggestion }),
    ]
  },
})
