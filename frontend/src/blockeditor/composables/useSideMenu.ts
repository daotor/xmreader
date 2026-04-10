import { ref, computed } from 'vue'
import type { Editor } from '@tiptap/core'
import type { MenuItem } from '../types/editor'
import { blockTypeItems, blockActionItems } from '../config/menu-items'
import { executeMenuCommand } from '../extensions/plugins/slash-command'

/** 侧边菜单（菜单 B）状态管理 */
export function useSideMenu() {
	const isOpen = ref(false)
	const position = ref({ top: 0, left: 0 })
	const currentNodePos = ref<number | null>(null)
	const typeItems = computed(() => blockTypeItems.flatMap(g => g.items))
	const actionItems = computed(() => blockActionItems)

	function open(pos: { top: number; left: number }, nodePos: number) {
		position.value = pos
		currentNodePos.value = nodePos
		isOpen.value = true
	}

	function close() {
		isOpen.value = false
		currentNodePos.value = null
	}

	function executeCommand(editor: Editor, item: MenuItem) {
		executeMenuCommand(editor, item)
		close()
	}

	function deleteBlock(editor: Editor) {
		if (currentNodePos.value === null) return
		const pos = currentNodePos.value
		const node = editor.state.doc.nodeAt(pos)
		if (node) editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
		close()
	}

	function duplicateBlock(editor: Editor) {
		if (currentNodePos.value === null) return
		const pos = currentNodePos.value
		const node = editor.state.doc.nodeAt(pos)
		if (node) editor.chain().focus().insertContentAt(pos + node.nodeSize, node.toJSON()).run()
		close()
	}

	return { isOpen, position, currentNodePos, typeItems, actionItems, open, close, executeCommand, deleteBlock, duplicateBlock }
}
