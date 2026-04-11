import { useEditor } from '@tiptap/vue-3'
import { onBeforeUnmount } from 'vue'
import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model'
import { getExtensions } from '../extensions'
import { markdownToHtml, isLikelyMarkdown } from '../utils/markdown-parser'
import type { BlockEditorOptions } from '../types/editor'
import type { SuggestionOptions } from '@tiptap/suggestion'

export interface UseBlockEditorOptions extends BlockEditorOptions {
	slashSuggestion?: Partial<SuggestionOptions>
}

export function resolveBlockEditorContent(options: Pick<UseBlockEditorOptions, 'content' | 'contentFormat' | 'documentUrl'>) {
	if (!options.content) {
		return ''
	}

	if (options.contentFormat === 'markdown') {
		return markdownToHtml(options.content, { documentUrl: options.documentUrl })
	}

	try {
		return JSON.parse(options.content)
	} catch (error) {
		console.warn('[BlockEditor] failed to parse JSON content, fallback to markdown/html:', error)
		return markdownToHtml(options.content, { documentUrl: options.documentUrl })
	}
}

export function useBlockEditor(options: UseBlockEditorOptions) {
	const editor = useEditor({
		extensions: getExtensions({
			placeholder: options.placeholder,
			slashSuggestion: options.slashSuggestion,
			openLinksOnClick: options.openLinksOnClick ?? !(options.editable ?? true),
		}),
		content: resolveBlockEditorContent(options),
		editable: options.editable ?? true,
		editorProps: {
			attributes: { class: 'block-editor-content' },
			handleKeyDown: (_view, event) => {
				if ((event.ctrlKey || event.metaKey) && event.key === 's') {
					event.preventDefault()
					if (options.onSave && editor.value) {
						options.onSave(editor.value.getJSON())
					}
					return true
				}
				return false
			},
			handlePaste: (view, event) => {
				// 光标在代码块内时，保持默认行为（粘贴为纯文本）
				const { $from } = view.state.selection
				for (let d = $from.depth; d > 0; d--) {
					if ($from.node(d).type.name === 'codeBlock') return false
				}

				const plainText = event.clipboardData?.getData('text/plain')
				if (!plainText) return false

				// 剪贴板已包含语义化 HTML（如从富文本编辑器或网页复制），让 TipTap 原生处理
				const htmlText = event.clipboardData?.getData('text/html')
				if (htmlText && /<(h[1-6]|ul|ol|li|blockquote|table|thead|tbody|tr|td|th)\b/i.test(htmlText)) {
					return false
				}

				// 纯文本不像 Markdown，走默认粘贴
				if (!isLikelyMarkdown(plainText)) return false

				// 将 Markdown 转为 HTML，再解析为 ProseMirror Slice 插入
				const convertedHtml = markdownToHtml(plainText)
				const wrapper = document.createElement('div')
				wrapper.innerHTML = convertedHtml

				const parser = ProseMirrorDOMParser.fromSchema(view.state.schema)
				const slice = parser.parseSlice(wrapper)
				const tr = view.state.tr.replaceSelection(slice)
				view.dispatch(tr)
				return true
			},
		},
		onUpdate: ({ editor: ed }) => {
			options.onUpdate?.(ed.getJSON())
		},
	})

	onBeforeUnmount(() => editor.value?.destroy())

	return { editor }
}
