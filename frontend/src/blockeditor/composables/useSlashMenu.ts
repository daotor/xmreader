import { ref } from 'vue'
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import type { MenuItem } from '../types/editor'

/** 斜杠菜单状态管理 */
export function useSlashMenu() {
	const isOpen = ref(false)
	const items = ref<MenuItem[]>([])
	const selectedIndex = ref(0)
	const menuRef = ref<HTMLElement | null>(null)
	const commandFn = ref<((props: any) => void) | null>(null)

	function onStart(props: SuggestionProps) {
		items.value = props.items as MenuItem[]
		selectedIndex.value = 0
		isOpen.value = true
		commandFn.value = props.command
	}

	function onUpdate(props: SuggestionProps) {
		items.value = props.items as MenuItem[]
		selectedIndex.value = 0
		commandFn.value = props.command
	}

	function onExit() {
		isOpen.value = false
		items.value = []
		selectedIndex.value = 0
		commandFn.value = null
	}

	function onKeyDown({ event }: SuggestionKeyDownProps): boolean {
		if (!isOpen.value) return false
		if (event.key === 'ArrowUp') {
			selectedIndex.value = (selectedIndex.value - 1 + items.value.length) % items.value.length
			scrollToSelected()
			return true
		}
		if (event.key === 'ArrowDown') {
			selectedIndex.value = (selectedIndex.value + 1) % items.value.length
			scrollToSelected()
			return true
		}
		if (event.key === 'Enter') {
			const item = items.value[selectedIndex.value]
			if (item && commandFn.value) commandFn.value(item)
			return true
		}
		if (event.key === 'Escape') {
			isOpen.value = false
			return true
		}
		return false
	}

	function selectItem(index: number) {
		const item = items.value[index]
		if (item && commandFn.value) commandFn.value(item)
	}

	function scrollToSelected() {
		if (!menuRef.value) return
		const el = menuRef.value.querySelector(`[data-index="${selectedIndex.value}"]`)
		el?.scrollIntoView({ block: 'nearest' })
	}

	return { isOpen, items, selectedIndex, menuRef, onStart, onUpdate, onExit, onKeyDown, selectItem }
}
