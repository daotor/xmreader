<script setup lang="ts">
import { useTheme } from '../../composables/useTheme'

const props = defineProps<{
	isOpen: boolean
	documentUrl?: string
}>()

const emit = defineEmits<{
	toggle: []
	close: []
}>()

const { isDark, toggleTheme: doToggleTheme } = useTheme()

function handleToggleTheme() {
	doToggleTheme()
	emit('close')
}

function copyDocumentLink() {
	const url = props.documentUrl || window.location.href
	navigator.clipboard.writeText(url).then(() => {
		console.log('[Toolbar] 链接已复制')
	}).catch(err => {
		console.error('[Toolbar] 复制失败:', err)
	})
	emit('close')
}
</script>

<template>
	<div class="toolbar-dropdown">
		<button class="toolbar-btn toolbar-btn--more" :class="{ active: isOpen }" title="更多" @click="emit('toggle')">
			<svg viewBox="0 0 24 24" fill="currentColor">
				<circle cx="5" cy="12" r="2" />
				<circle cx="12" cy="12" r="2" />
				<circle cx="19" cy="12" r="2" />
			</svg>
		</button>
		<Transition name="dropdown">
			<div v-if="isOpen" class="dropdown-panel more-menu">
				<button class="more-menu-item" @click="handleToggleTheme">
					<svg v-if="!isDark" class="more-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
						stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
					</svg>
					<svg v-else class="more-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
						stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="5" />
						<line x1="12" y1="1" x2="12" y2="3" />
						<line x1="12" y1="21" x2="12" y2="23" />
						<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
						<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
						<line x1="1" y1="12" x2="3" y2="12" />
						<line x1="21" y1="12" x2="23" y2="12" />
						<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
						<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
					</svg>
					<span>{{ isDark ? '浅色模式' : '深色模式' }}</span>
				</button>
				<div class="more-menu-divider" />
				<button class="more-menu-item" @click="copyDocumentLink">
					<svg class="more-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
						stroke-linecap="round" stroke-linejoin="round">
						<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
						<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
					</svg>
					<span>复制链接</span>
				</button>
			</div>
		</Transition>
	</div>
</template>

<style scoped>
.toolbar-dropdown {
	position: relative;
}

.toolbar-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	padding: 0;
	border: none;
	background: none;
	cursor: pointer;
	border-radius: 6px;
	color: var(--be-icon, #444);
	transition: background 0.12s, color 0.12s;
}

.toolbar-btn svg {
	width: 18px;
	height: 18px;
	flex-shrink: 0;
}

.toolbar-btn:hover:not(:disabled) {
	background: var(--be-hover-bg, #f3f4f6);
	color: var(--be-icon-hover, #1a1a1a);
}

.toolbar-btn.active {
	background: var(--be-active-bg, #e8f0fe);
	color: var(--be-primary, #3b82f6);
}

.toolbar-btn--more {
	color: var(--be-text-secondary, #6b7280);
}

.dropdown-panel {
	position: absolute;
	top: calc(100% + 6px);
	left: 0;
	background: var(--be-bg, #fff);
	border: 1px solid var(--be-border, #e5e7eb);
	border-radius: 10px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
	padding: 6px;
	z-index: 200;
}

.dropdown-enter-active,
.dropdown-leave-active {
	transition: opacity 0.15s, transform 0.15s;
}

.dropdown-enter-from,
.dropdown-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}

.more-menu {
	right: 0;
	left: auto;
	min-width: 168px;
}

.more-menu-item {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 8px 12px;
	border: none;
	background: none;
	cursor: pointer;
	border-radius: 6px;
	font-size: 14px;
	color: var(--be-text, #1a1a1a);
	transition: background 0.1s;
	text-align: left;
}

.more-menu-item:hover {
	background: var(--be-hover-bg, #f3f4f6);
}

.more-menu-divider {
	height: 1px;
	background: var(--be-border, #e5e7eb);
	margin: 3px 0;
}

.more-menu-icon {
	flex-shrink: 0;
	width: 16px;
	height: 16px;
	color: var(--be-text-secondary, #6b7280);
}
</style>
