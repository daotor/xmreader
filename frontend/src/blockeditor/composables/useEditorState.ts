import { ref, watch, onBeforeUnmount } from 'vue'
import type { Editor } from '@tiptap/core'
import type { ShallowRef } from 'vue'

export function useEditorState(editor: ShallowRef<Editor | undefined>) {
	const isBold = ref(false)
	const isItalic = ref(false)
	const isUnderline = ref(false)
	const isStrike = ref(false)
	const isCode = ref(false)
	const isBulletList = ref(false)
	const isOrderedList = ref(false)
	const isTaskList = ref(false)
	const isBlockquote = ref(false)
	const isCodeBlock = ref(false)
	const currentHeading = ref<number | null>(null)
	const canUndo = ref(false)
	const canRedo = ref(false)
	const currentFontSize = ref<string | null>(null)
	const currentTextColor = ref<string | null>(null)
	const currentHighlightColor = ref<string | null>(null)
	const currentTextAlign = ref<string>('left')

	/** 限流标记，合并同一帧内的多次触发 */
	let rafId: number | null = null

	function scheduleUpdate() {
		if (rafId !== null) return
		rafId = requestAnimationFrame(() => {
			rafId = null
			updateState()
		})
	}

	function updateState() {
		const ed = editor.value
		if (!ed) return
		isBold.value = ed.isActive('bold')
		isItalic.value = ed.isActive('italic')
		isUnderline.value = ed.isActive('underline')
		isStrike.value = ed.isActive('strike')
		isCode.value = ed.isActive('code')
		isBulletList.value = ed.isActive('bulletList')
		isOrderedList.value = ed.isActive('orderedList')
		isTaskList.value = ed.isActive('taskList')
		isBlockquote.value = ed.isActive('blockquote')
		isCodeBlock.value = ed.isActive('codeBlock')
		canUndo.value = ed.can().undo()
		canRedo.value = ed.can().redo()
		currentHeading.value = ed.isActive('heading', { level: 1 }) ? 1
			: ed.isActive('heading', { level: 2 }) ? 2
				: ed.isActive('heading', { level: 3 }) ? 3
					: ed.isActive('heading', { level: 4 }) ? 4
						: ed.isActive('heading', { level: 5 }) ? 5
							: null

		// 字号
		const tsAttrs = ed.getAttributes('textStyle')
		currentFontSize.value = tsAttrs.fontSize || null

		// 文字颜色
		currentTextColor.value = tsAttrs.color || null

		// 背景高亮颜色
		const hlAttrs = ed.getAttributes('highlight')
		currentHighlightColor.value = hlAttrs.color || null

		// 文本对齐
		const pAttrs = ed.getAttributes('paragraph')
		const hAttrs = ed.getAttributes('heading')
		currentTextAlign.value = pAttrs.textAlign || hAttrs.textAlign || 'left'
	}

	// 使用 watch 替代 watchEffect，正确清理旧编辑器的事件监听
	watch(editor, (newEd, oldEd) => {
		// 移除旧编辑器上的事件监听
		if (oldEd) {
			oldEd.off('transaction', scheduleUpdate)
		}
		// 在新编辑器上注册事件监听（只监听 transaction 即可，它涵盖 update 和 selectionUpdate）
		if (newEd) {
			newEd.on('transaction', scheduleUpdate)
			updateState()
		}
	}, { immediate: true })

	// 组件卸载时清理
	onBeforeUnmount(() => {
		if (editor.value) {
			editor.value.off('transaction', scheduleUpdate)
		}
		if (rafId !== null) {
			cancelAnimationFrame(rafId)
			rafId = null
		}
	})

	return {
		isBold, isItalic, isUnderline, isStrike, isCode,
		isBulletList, isOrderedList, isTaskList, isBlockquote, isCodeBlock,
		currentHeading, canUndo, canRedo,
		currentFontSize, currentTextColor, currentHighlightColor, currentTextAlign,
	}
}
