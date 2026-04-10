import type { Extensions } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Highlight from '@tiptap/extension-highlight'
import Color from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight, common } from 'lowlight'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { Component } from 'vue'
import CodeBlockView from '../components/CodeBlockView.vue'
import { SlashCommand } from './plugins/slash-command'
import { HighlightBlock } from './nodes/highlight-block'
import { FontSize } from './marks/font-size'
import type { SuggestionOptions } from '@tiptap/suggestion'

const lowlight = createLowlight(common)

export interface StarterKitOptions {
	placeholder?: string
	slashSuggestion?: Partial<SuggestionOptions>
}

export function getExtensions(options: StarterKitOptions = {}): Extensions {
	return [
		StarterKit.configure({
			heading: { levels: [1, 2, 3, 4, 5] },
			codeBlock: false, // 禁用内置 codeBlock，改用 CodeBlockLowlight
		}),
		CodeBlockLowlight.extend({
			addAttributes() {
				return {
					...this.parent?.(),
					fixedHeight: {
						default: false,
						parseHTML: (element) => element.getAttribute('data-fixed-height') === 'true',
						renderHTML: (attributes) => {
							if (!attributes.fixedHeight) return {}
							return { 'data-fixed-height': 'true' }
						},
					},
				}
			},
			addNodeView() {
				return VueNodeViewRenderer(CodeBlockView as unknown as Component)
			},
			addKeyboardShortcuts() {
				return {
					Enter: ({ editor }) => {
						if (!editor.isActive('codeBlock')) return false

						const { state } = editor.view
						const { $from } = state.selection

						// 向上查找 codeBlock 节点所在的深度
						let cbDepth = $from.depth
						while (cbDepth > 0 && $from.node(cbDepth).type.name !== 'codeBlock') {
							cbDepth--
						}
						const codeBlockNode = $from.node(cbDepth)
						if (!codeBlockNode || codeBlockNode.type.name !== 'codeBlock') return false

						const codeText = codeBlockNode.textContent
						const contentEnd = $from.end(cbDepth) // 代码块内容结束位置

						// 仅当光标在内容末尾时才检测
						if ($from.pos < contentEnd) return false

						// 检查末尾是否已有连续 2 个空行（即 \n\n）
						if (codeText.endsWith('\n\n')) {
							// 删除末尾多余空行
							const trimmed = codeText.replace(/\n{2,}$/, '')
							const contentStart = $from.start(cbDepth)
							const deleteFrom = contentStart + trimmed.length
							const deleteTo = contentEnd

							const { tr } = state
							if (deleteFrom < deleteTo) {
								tr.delete(deleteFrom, deleteTo)
							}

							// 在代码块后方插入一个空段落
							const afterCodeBlock = tr.mapping.map($from.after(cbDepth))
							const paragraphNode = state.schema.nodes.paragraph.createAndFill()
							if (paragraphNode) {
								tr.insert(afterCodeBlock, paragraphNode)
								tr.setSelection(TextSelection.near(tr.doc.resolve(afterCodeBlock + 1)))
							}

							editor.view.dispatch(tr)
							return true
						}

						return false
					},
					Tab: ({ editor }) => {
						if (!editor.isActive('codeBlock')) return false
						const { state, dispatch } = editor.view
						const { from, to } = state.selection
						dispatch(state.tr.insertText('    ', from, to))
						return true
					},
					'Shift-Tab': ({ editor }) => {
						if (!editor.isActive('codeBlock')) return false
						const { state, dispatch } = editor.view
						const { from } = state.selection
						const lineStart = state.doc.resolve(from).start()
						const text = state.doc.textBetween(lineStart, Math.min(lineStart + 4, state.doc.content.size), '')
						const spaces = text.match(/^ {1,4}/)?.[0].length ?? 0
						if (spaces > 0) {
							dispatch(state.tr.delete(lineStart, lineStart + spaces))
						}
						return true
					},
				}
			},
		}).configure({
			lowlight,
			defaultLanguage: 'plaintext',
		}),
		Underline,
		TaskList,
		TaskItem.configure({ nested: true }),
		Table.configure({ resizable: true }),
		TableRow,
		TableCell,
		TableHeader,
		Link.configure({ openOnClick: false, autolink: true }),
		Image.configure({ inline: false, allowBase64: true }),
		Highlight.configure({ multicolor: true }),
		TextStyle,
		Color,
		TextAlign.configure({ types: ['heading', 'paragraph'] }),
		Placeholder.configure({
			placeholder: ({ node }) => {
				if (node.type.name === 'heading') return `标题 ${node.attrs.level}`
				return options.placeholder || '输入 "/" 插入内容块…'
			},
		}),
		FontSize,
		HighlightBlock,
		SlashCommand.configure({ suggestion: options.slashSuggestion ?? {} }),
	]
}
