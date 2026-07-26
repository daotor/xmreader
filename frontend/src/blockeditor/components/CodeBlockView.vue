<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/core'
import MermaidFullscreenViewer from './MermaidFullscreenViewer.vue'
import { renderMermaidSvg } from '../utils/mermaid-renderer'

const props = defineProps<{
	node: any
	updateAttributes: (attrs: Record<string, any>) => void
	extension: any
	editor: Editor
	getPos: () => number
}>()

// ==================== 语言选择 ====================
const showLangDropdown = ref(false)
const searchQuery = ref('')
const langSelectorRef = ref<HTMLElement | null>(null)

const languages = [
	{ value: 'plaintext', label: 'Plain Text' },
	{ value: 'javascript', label: 'JavaScript' },
	{ value: 'typescript', label: 'TypeScript' },
	{ value: 'python', label: 'Python' },
	{ value: 'go', label: 'Go' },
	{ value: 'rust', label: 'Rust' },
	{ value: 'java', label: 'Java' },
	{ value: 'c', label: 'C' },
	{ value: 'cpp', label: 'C++' },
	{ value: 'csharp', label: 'C#' },
	{ value: 'swift', label: 'Swift' },
	{ value: 'kotlin', label: 'Kotlin' },
	{ value: 'ruby', label: 'Ruby' },
	{ value: 'php', label: 'PHP' },
	{ value: 'lua', label: 'Lua' },
	{ value: 'perl', label: 'Perl' },
	{ value: 'r', label: 'R' },
	{ value: 'html', label: 'HTML' },
	{ value: 'xml', label: 'XML' },
	{ value: 'css', label: 'CSS' },
	{ value: 'scss', label: 'SCSS' },
	{ value: 'less', label: 'Less' },
	{ value: 'json', label: 'JSON' },
	{ value: 'yaml', label: 'YAML' },
	{ value: 'ini', label: 'INI' },
	{ value: 'markdown', label: 'Markdown' },
	{ value: 'mermaid', label: 'Mermaid' },
	{ value: 'bash', label: 'Bash' },
	{ value: 'shell', label: 'Shell' },
	{ value: 'sql', label: 'SQL' },
	{ value: 'graphql', label: 'GraphQL' },
	{ value: 'diff', label: 'Diff' },
	{ value: 'makefile', label: 'Makefile' },
	{ value: 'objectivec', label: 'Objective-C' },
	{ value: 'vbnet', label: 'VB.NET' },
	{ value: 'wasm', label: 'WebAssembly' },
	{ value: 'arduino', label: 'Arduino' },
]

const currentLanguage = computed(() => props.node.attrs.language || 'plaintext')
const currentLanguageLabel = computed(() => {
	return languages.find((lang) => lang.value === currentLanguage.value)?.label || currentLanguage.value
})

const filteredLanguages = computed(() => {
	if (!searchQuery.value) return languages
	const query = searchQuery.value.toLowerCase()
	return languages.filter((lang) =>
		lang.label.toLowerCase().includes(query) || lang.value.toLowerCase().includes(query),
	)
})

const isOverlayOpen = computed(() => showLangDropdown.value || showSettingsDropdown.value)

function selectLanguage(lang: string) {
	props.updateAttributes({ language: lang })
	showLangDropdown.value = false
	searchQuery.value = ''
}

function toggleLangDropdown() {
	showLangDropdown.value = !showLangDropdown.value
	showSettingsDropdown.value = false
	searchQuery.value = ''
}

// ==================== Mermaid 渲染 ====================
const isEditable = computed(() => props.editor?.isEditable ?? false)
const isMermaid = computed(() => currentLanguage.value.toLowerCase() === 'mermaid')
const mermaidSvg = ref('')
const mermaidError = ref('')
const isRenderingMermaid = ref(false)
const showSourceEditor = computed(() => !isMermaid.value || isEditable.value || !!mermaidError.value)
const isMermaidFullscreenOpen = ref(false)
const canOpenMermaidFullscreen = computed(() => (
	isMermaid.value
	&& !!mermaidSvg.value
	&& !mermaidError.value
	&& !isRenderingMermaid.value
))

let mermaidRenderToken = 0
let mermaidRenderTimer: ReturnType<typeof setTimeout> | null = null
let themeObserver: MutationObserver | null = null
let mermaidRefreshFrame: number | null = null
let lastMermaidRenderSignature = ''
let isNodeViewDisposed = false

function getMermaidTheme() {
	return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default'
}

function getMermaidSource() {
	return (props.node.textContent || '').trim()
}

function getMermaidRenderSignature() {
	if (!isMermaid.value) {
		return ''
	}

	return JSON.stringify({
		language: currentLanguage.value.toLowerCase(),
		theme: getMermaidTheme(),
		source: getMermaidSource(),
	})
}

async function renderMermaidDiagram() {
	if (!isMermaid.value) {
		mermaidSvg.value = ''
		mermaidError.value = ''
		isRenderingMermaid.value = false
		return
	}

	const source = getMermaidSource()
	if (!source) {
		mermaidSvg.value = ''
		mermaidError.value = ''
		isRenderingMermaid.value = false
		return
	}

	const token = ++mermaidRenderToken
	isRenderingMermaid.value = true
	mermaidError.value = ''

	try {
		const svg = await renderMermaidSvg(source, getMermaidTheme())
		if (token !== mermaidRenderToken) return

		mermaidSvg.value = svg
	} catch (error) {
		if (token !== mermaidRenderToken) return

		mermaidSvg.value = ''
		mermaidError.value = error instanceof Error ? error.message : 'Mermaid 渲染失败'
		console.error('[CodeBlockView] Mermaid render failed:', error)
	} finally {
		if (token === mermaidRenderToken) {
			isRenderingMermaid.value = false
		}
	}
}

function scheduleMermaidRender() {
	if (mermaidRenderTimer) {
		clearTimeout(mermaidRenderTimer)
	}

	if (!isMermaid.value) {
		void renderMermaidDiagram()
		return
	}

	mermaidRenderTimer = setTimeout(() => {
		mermaidRenderTimer = null
		void renderMermaidDiagram()
	}, isEditable.value ? 120 : 0)
}

function requestMermaidRender(force = false) {
	if (!isMermaid.value) {
		lastMermaidRenderSignature = ''
		scheduleMermaidRender()
		return
	}

	const signature = getMermaidRenderSignature()
	if (!force && signature === lastMermaidRenderSignature) {
		return
	}

	lastMermaidRenderSignature = signature
	scheduleMermaidRender()
}

function queueMermaidRender(force = false) {
	if (isNodeViewDisposed) return
	nextTick(() => {
		if (isNodeViewDisposed) return
		if (mermaidRefreshFrame !== null) {
			cancelAnimationFrame(mermaidRefreshFrame)
		}

		mermaidRefreshFrame = requestAnimationFrame(() => {
			mermaidRefreshFrame = null
			if (isNodeViewDisposed) return
			requestMermaidRender(force)
		})
	})
}

function openMermaidFullscreen() {
	if (!canOpenMermaidFullscreen.value) return
	isMermaidFullscreenOpen.value = true
}

function closeMermaidFullscreen() {
	isMermaidFullscreenOpen.value = false
}

// ==================== 固定高度 ====================
const fixedHeight = computed(() => props.node.attrs.fixedHeight ?? false)

function toggleFixedHeight() {
	props.updateAttributes({ fixedHeight: !fixedHeight.value })
}

// ==================== 设置下拉 ====================
const showSettingsDropdown = ref(false)
const settingsRef = ref<HTMLElement | null>(null)
const wordWrap = ref(false)

function toggleSettingsDropdown() {
	showSettingsDropdown.value = !showSettingsDropdown.value
	showLangDropdown.value = false
}

function toggleWordWrap() {
	wordWrap.value = !wordWrap.value
	syncLineHeights()
}

// ==================== 复制 ====================
const copySuccess = ref(false)

function copyCode() {
	const text = props.node.textContent
	navigator.clipboard.writeText(text).then(() => {
		copySuccess.value = true
		setTimeout(() => {
			copySuccess.value = false
		}, 2000)
	})
}

// ==================== 行号 ====================
const lineCount = computed(() => {
	const text = props.node.textContent || ''
	return Math.max(text.split('\n').length, 1)
})

// ==================== 换行模式行号高度同步 ====================
const lineNumbersRef = ref<HTMLElement | null>(null)
const cbBodyRef = ref<HTMLElement | null>(null)

function syncLineHeights() {
	nextTick(() => requestAnimationFrame(() => {
		const numsEl = lineNumbersRef.value
		if (!numsEl) return

		const spans = numsEl.querySelectorAll<HTMLElement>('span')
		if (!wordWrap.value) {
			spans.forEach((span) => {
				span.style.height = ''
			})
			return
		}

		const view = props.editor?.view
		const nodePos = props.getPos()
		if (!view || typeof nodePos !== 'number') return

		const text = props.node.textContent || ''
		const lines = text.split('\n')
		let offset = 0

		for (let index = 0; index < lines.length && index < spans.length; index++) {
			const startPos = nodePos + 1 + offset
			try {
				const startY = view.coordsAtPos(startPos).top
				let height: number

				if (index < lines.length - 1) {
					height = view.coordsAtPos(startPos + lines[index].length + 1).top - startY
				} else {
					height = view.coordsAtPos(Math.max(startPos + lines[index].length, startPos)).bottom - startY
				}

				spans[index].style.height = height > 0 ? `${height}px` : ''
			} catch {
				spans[index].style.height = ''
			}

			offset += lines[index].length + 1
		}
	}))
}

// ==================== 固定高度时自动滚动到光标 ====================
function scrollToCursor() {
	if (!fixedHeight.value || !cbBodyRef.value) return

	const editor = props.editor
	if (!editor) return

	const pos = props.getPos()
	const nodeSize = props.node.nodeSize
	const { from } = editor.state.selection
	if (from < pos || from > pos + nodeSize) return

	requestAnimationFrame(() => {
		const body = cbBodyRef.value
		if (!body) return

		try {
			const coords = editor.view.coordsAtPos(from)
			const bodyRect = body.getBoundingClientRect()
			const cursorRelativeTop = coords.top - bodyRect.top + body.scrollTop
			const cursorRelativeBottom = coords.bottom - bodyRect.top + body.scrollTop

			if (cursorRelativeBottom > body.scrollTop + body.clientHeight) {
				body.scrollTop = cursorRelativeBottom - body.clientHeight + 4
			} else if (cursorRelativeTop < body.scrollTop) {
				body.scrollTop = cursorRelativeTop - 4
			}
		} catch {
			// coordsAtPos 可能在极端情况下抛异常，忽略
		}
	})
}

function onEditorTransaction() {
	scrollToCursor()
}

function onEditorUpdate() {
	if (isMermaid.value) {
		queueMermaidRender()
	}

	if (wordWrap.value) syncLineHeights()
}

let resizeObserver: ResizeObserver | null = null

watch(() => props.node.textContent, () => {
	queueMermaidRender()
})

watch(currentLanguage, () => {
	queueMermaidRender(true)
})

watch([isMermaid, mermaidSvg, mermaidError], ([mermaid, svg, error]) => {
	if (!mermaid || !svg || !!error) {
		closeMermaidFullscreen()
	}
})

onMounted(() => {
	isNodeViewDisposed = false
	props.editor?.on('selectionUpdate', onEditorTransaction)
	props.editor?.on('update', onEditorTransaction)
	props.editor?.on('update', onEditorUpdate)

	const preEl = cbBodyRef.value?.querySelector('.cb-pre') as HTMLElement | null
	if (preEl) {
		resizeObserver = new ResizeObserver(() => {
			if (wordWrap.value) syncLineHeights()
		})
		resizeObserver.observe(preEl)
	}

	themeObserver = new MutationObserver(() => {
		if (isMermaid.value) {
			queueMermaidRender(true)
		}
	})
	themeObserver.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['data-theme'],
	})

	queueMermaidRender(true)
	document.addEventListener('click', handleClickOutside, true)
})

onUnmounted(() => {
	isNodeViewDisposed = true
	mermaidRenderToken += 1
	closeMermaidFullscreen()
	props.editor?.off('selectionUpdate', onEditorTransaction)
	props.editor?.off('update', onEditorTransaction)
	props.editor?.off('update', onEditorUpdate)
	resizeObserver?.disconnect()
	themeObserver?.disconnect()
	if (mermaidRenderTimer) {
		clearTimeout(mermaidRenderTimer)
	}
	if (mermaidRefreshFrame !== null) {
		cancelAnimationFrame(mermaidRefreshFrame)
	}
	document.removeEventListener('click', handleClickOutside, true)
})

// ==================== 点击外部关闭 ====================
function handleClickOutside(event: MouseEvent) {
	const target = event.target as Node
	if (showLangDropdown.value && langSelectorRef.value && !langSelectorRef.value.contains(target)) {
		showLangDropdown.value = false
		searchQuery.value = ''
	}
	if (showSettingsDropdown.value && settingsRef.value && !settingsRef.value.contains(target)) {
		showSettingsDropdown.value = false
	}
}
</script>

<template>
	<NodeViewWrapper
		class="cb"
		:class="{
			'cb--wrap': wordWrap,
			'cb--fixed-height': fixedHeight,
			'cb--mermaid': isMermaid,
			'cb--overlay-active': isOverlayOpen,
		}"
		as="div"
	>
		<div class="cb-toolbar" contenteditable="false">
			<div class="cb-lang" ref="langSelectorRef">
				<button class="cb-lang-btn" tabindex="-1" @click.stop="toggleLangDropdown">
					{{ currentLanguageLabel }}
					<svg
						class="cb-lang-arrow"
						:class="{ open: showLangDropdown }"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="6 9 12 15 18 9" />
					</svg>
				</button>
				<Transition name="cb-drop">
					<div v-if="showLangDropdown" class="cb-lang-dropdown">
						<input
							v-model="searchQuery"
							class="cb-lang-search"
							placeholder="搜索语言…"
							@keydown.stop
							@click.stop
						/>
						<div class="cb-lang-list">
							<button
								v-for="lang in filteredLanguages"
								:key="lang.value"
								class="cb-lang-item"
								:class="{ 'is-active': currentLanguage === lang.value }"
								@click.stop="selectLanguage(lang.value)"
							>
								{{ lang.label }}
							</button>
							<div v-if="filteredLanguages.length === 0" class="cb-lang-empty">无匹配语言</div>
						</div>
					</div>
				</Transition>
			</div>

			<div class="cb-actions">
				<button
					class="cb-action-btn"
					:class="{ 'is-active': fixedHeight }"
					tabindex="-1"
					:title="fixedHeight ? '切换为自动高度' : '切换为固定高度'"
					@click.stop="toggleFixedHeight"
				>
					<svg
						v-if="fixedHeight"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="12" y1="3" x2="12" y2="21" />
						<polyline points="8 7 12 3 16 7" />
						<polyline points="8 17 12 21 16 17" />
						<line x1="4" y1="9" x2="20" y2="9" />
						<line x1="4" y1="15" x2="20" y2="15" />
					</svg>
					<svg
						v-else
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="12" y1="3" x2="12" y2="21" />
						<polyline points="8 7 12 3 16 7" />
						<polyline points="8 17 12 21 16 17" />
					</svg>
					<span class="cb-action-label">{{ fixedHeight ? '固定' : '自动' }}</span>
				</button>

				<button
					v-if="canOpenMermaidFullscreen"
					class="cb-action-btn"
					tabindex="-1"
					title="全屏查看流程图"
					aria-label="全屏查看 Mermaid 流程图"
					@click.stop="openMermaidFullscreen"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
					</svg>
					<span class="cb-action-label">全屏</span>
				</button>

				<button class="cb-action-btn" tabindex="-1" :title="copySuccess ? '已复制' : '复制代码'" @click.stop="copyCode">
					<svg
						v-if="!copySuccess"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<rect x="9" y="9" width="13" height="13" rx="2" />
						<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
					</svg>
					<svg
						v-else
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="20 6 9 17 4 12" />
					</svg>
					<span class="cb-action-label">{{ copySuccess ? '已复制' : '复制' }}</span>
				</button>

				<div class="cb-settings" ref="settingsRef">
					<button class="cb-action-btn" tabindex="-1" @click.stop="toggleSettingsDropdown">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="12" cy="12" r="3" />
							<path
								d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
							/>
						</svg>
						<span class="cb-action-label">设置</span>
					</button>
					<Transition name="cb-drop">
						<div v-if="showSettingsDropdown" class="cb-settings-dropdown">
							<label class="cb-settings-item" @click.stop>
								<span>自动换行</span>
								<button class="cb-toggle" :class="{ on: wordWrap }" tabindex="-1" @click.stop="toggleWordWrap">
									<span class="cb-toggle-thumb" />
								</button>
							</label>
						</div>
					</Transition>
				</div>
			</div>
		</div>

		<div
			v-if="isMermaid"
			class="cb-mermaid-panel"
			:class="{ 'cb-mermaid-panel--solo': !showSourceEditor }"
			contenteditable="false"
		>
			<div v-if="isRenderingMermaid" class="cb-mermaid-state">流程图渲染中...</div>
			<div v-else-if="mermaidError" class="cb-mermaid-error">
				<div class="cb-mermaid-error-title">Mermaid 渲染失败</div>
				<div class="cb-mermaid-error-text">{{ mermaidError }}</div>
			</div>
			<div v-else-if="mermaidSvg" class="cb-mermaid-preview" v-html="mermaidSvg" />
		</div>

		<div v-if="showSourceEditor" class="cb-body" ref="cbBodyRef">
			<div class="cb-line-numbers" ref="lineNumbersRef" contenteditable="false" aria-hidden="true">
				<span v-for="n in lineCount" :key="n">{{ n }}</span>
			</div>
			<pre class="cb-pre"><NodeViewContent as="code" class="cb-code" /></pre>
		</div>
	</NodeViewWrapper>

	<MermaidFullscreenViewer
		v-if="isMermaidFullscreenOpen"
		:svg="mermaidSvg"
		title="Mermaid 流程图"
		@close="closeMermaidFullscreen"
	/>
</template>

<style scoped>
.cb {
	position: relative;
	z-index: 0;
	margin: 0.5em 0;
	border-radius: 8px;
	background: var(--be-code-bg, #f3f4f6);
	border: 1px solid var(--be-border, #e5e7eb);
}

.cb--overlay-active {
	z-index: 40;
}

.cb-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px;
	border-bottom: 1px solid var(--be-border, #e5e7eb);
	background: var(--be-code-bg, #f3f4f6);
	border-radius: 8px 8px 0 0;
	user-select: none;
	position: relative;
	z-index: 10;
}

.cb-lang {
	position: relative;
}

.cb-lang-btn {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 3px 8px;
	border: 1px solid var(--be-border, #e5e7eb);
	background: var(--be-bg, #fff);
	cursor: pointer;
	font-size: 12px;
	color: var(--be-text, #1a1a1a);
	border-radius: 5px;
	transition: background 0.12s, border-color 0.12s;
	white-space: nowrap;
}

.cb-lang-btn:hover {
	border-color: var(--be-text-secondary, #9ca3af);
}

.cb-lang-arrow {
	width: 12px;
	height: 12px;
	color: var(--be-text-secondary, #6b7280);
	transition: transform 0.15s;
	flex-shrink: 0;
}

.cb-lang-arrow.open {
	transform: rotate(180deg);
}

.cb-lang-dropdown {
	position: absolute;
	top: calc(100% + 4px);
	left: 0;
	width: 190px;
	background: var(--be-bg, #fff);
	border: 1px solid var(--be-border, #e5e7eb);
	border-radius: 8px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
	z-index: 200;
	overflow: hidden;
}

.cb-lang-search {
	width: 100%;
	padding: 8px 10px;
	border: none;
	border-bottom: 1px solid var(--be-border, #e5e7eb);
	font-size: 13px;
	outline: none;
	background: transparent;
	color: var(--be-text, #1a1a1a);
	box-sizing: border-box;
}

.cb-lang-search::placeholder {
	color: var(--be-placeholder, #9ca3af);
}

.cb-lang-list {
	max-height: 220px;
	overflow-y: auto;
	padding: 4px;
}

.cb-lang-item {
	display: block;
	width: 100%;
	padding: 6px 10px;
	border: none;
	background: none;
	cursor: pointer;
	font-size: 13px;
	color: var(--be-text, #1a1a1a);
	text-align: left;
	border-radius: 4px;
	transition: background 0.1s;
}

.cb-lang-item:hover {
	background: var(--be-hover-bg, #f3f4f6);
}

.cb-lang-item.is-active {
	color: var(--be-primary, #3b82f6);
	font-weight: 600;
}

.cb-lang-empty {
	padding: 12px 10px;
	font-size: 13px;
	color: var(--be-text-secondary, #6b7280);
	text-align: center;
}

.cb-actions {
	display: flex;
	align-items: center;
	gap: 2px;
}

.cb-action-btn {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 3px 8px;
	border: none;
	background: none;
	cursor: pointer;
	font-size: 12px;
	border-radius: 5px;
	color: var(--be-text-secondary, #6b7280);
	transition: background 0.12s, color 0.12s;
	white-space: nowrap;
}

.cb-action-btn svg {
	width: 14px;
	height: 14px;
	flex-shrink: 0;
}

.cb-action-btn:hover {
	background: var(--be-hover-bg, rgba(0, 0, 0, 0.06));
	color: var(--be-text, #1a1a1a);
}

.cb-action-btn.is-active {
	color: var(--be-primary, #3b82f6);
}

.cb-action-label {
	line-height: 1;
}

.cb-settings {
	position: relative;
}

.cb-settings-dropdown {
	position: absolute;
	top: calc(100% + 4px);
	right: 0;
	width: 180px;
	background: var(--be-bg, #fff);
	border: 1px solid var(--be-border, #e5e7eb);
	border-radius: 8px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
	z-index: 200;
	padding: 6px;
}

.cb-settings-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 10px;
	font-size: 13px;
	color: var(--be-text, #1a1a1a);
	border-radius: 6px;
	cursor: default;
}

.cb-settings-item:hover {
	background: var(--be-hover-bg, #f3f4f6);
}

.cb-toggle {
	position: relative;
	width: 36px;
	height: 20px;
	border-radius: 10px;
	border: none;
	cursor: pointer;
	background: var(--be-border, #d1d5db);
	transition: background 0.2s;
	padding: 0;
	flex-shrink: 0;
}

.cb-toggle.on {
	background: var(--be-primary, #3b82f6);
}

.cb-toggle-thumb {
	position: absolute;
	top: 2px;
	left: 2px;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	background: #fff;
	transition: transform 0.2s;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.cb-toggle.on .cb-toggle-thumb {
	transform: translateX(16px);
}

.cb-mermaid-panel {
	padding: 16px;
	background: var(--be-code-body-bg, #eaebee);
	border-bottom: 1px solid var(--be-border, #e5e7eb);
}

.cb-mermaid-panel--solo {
	border-bottom: none;
	border-radius: 0 0 8px 8px;
}

.cb-mermaid-state,
.cb-mermaid-error {
	padding: 14px 16px;
	border-radius: 8px;
}

.cb-mermaid-state {
	background: rgba(59, 130, 246, 0.1);
	color: var(--be-text-secondary, #6b7280);
	text-align: center;
	font-size: 13px;
}

.cb-mermaid-error {
	background: rgba(239, 68, 68, 0.08);
	border: 1px solid rgba(239, 68, 68, 0.25);
	color: var(--be-text, #1a1a1a);
}

.cb-mermaid-error-title {
	font-size: 13px;
	font-weight: 700;
	margin-bottom: 6px;
}

.cb-mermaid-error-text {
	font-size: 12px;
	line-height: 1.55;
	color: var(--be-text-secondary, #6b7280);
	word-break: break-word;
}

.cb-mermaid-preview {
	display: flex;
	justify-content: center;
	align-items: center;
	overflow: auto;
	padding: 8px;
	background: var(--be-bg, #fff);
	border: 1px solid var(--be-border, #e5e7eb);
	border-radius: 8px;
}

.cb-mermaid-preview :deep(svg) {
	max-width: 100%;
	height: auto;
}

.cb-body {
	display: flex;
	overflow-x: auto;
	border-radius: 0 0 8px 8px;
	background: var(--be-code-body-bg, #eaebee);
}

.cb-line-numbers {
	display: flex;
	flex-direction: column;
	padding: 0.5em 0;
	min-width: 40px;
	text-align: right;
	color: var(--be-text-secondary, #9ca3af);
	font-family: 'JetBrains Mono', 'Fira Code', monospace;
	font-size: 0.9em;
	line-height: 1.6;
	user-select: none;
	border-right: 1px solid var(--be-border, #e5e7eb);
	flex-shrink: 0;
}

.cb-line-numbers span {
	padding: 0 10px 0 8px;
}

.cb-pre {
	flex: 1;
	min-width: 0;
	margin: 0;
	padding: 0.5em 1em;
	overflow-x: auto;
	background: transparent;
	font-family: 'JetBrains Mono', 'Fira Code', monospace;
	font-size: 0.9em;
	line-height: 1.6;
	border-radius: 0;
}

.cb :deep(.cb-code) {
	background: none;
	padding: 0;
	border-radius: 0;
	font-size: inherit;
	color: inherit;
	white-space: pre !important;
}

.cb--wrap .cb-pre {
	white-space: pre-wrap;
	word-break: break-all;
}

.cb--wrap :deep(.cb-code) {
	white-space: pre-wrap !important;
	word-break: break-all;
}

.cb--fixed-height .cb-body {
	max-height: calc(15 * 1.6 * 0.9em + 1em);
	overflow-y: auto;
	overflow-x: hidden;
	align-items: flex-start;
	scrollbar-gutter: stable;
}

.cb--fixed-height .cb-body::-webkit-scrollbar,
.cb .cb-pre::-webkit-scrollbar,
.cb-mermaid-preview::-webkit-scrollbar {
	width: 6px;
	height: 6px;
}

.cb--fixed-height .cb-body::-webkit-scrollbar-track,
.cb .cb-pre::-webkit-scrollbar-track,
.cb-mermaid-preview::-webkit-scrollbar-track {
	background: transparent;
}

.cb--fixed-height .cb-body::-webkit-scrollbar-thumb,
.cb .cb-pre::-webkit-scrollbar-thumb,
.cb-mermaid-preview::-webkit-scrollbar-thumb {
	background: transparent;
	border-radius: 3px;
}

.cb:hover .cb-body::-webkit-scrollbar-thumb,
.cb:hover .cb-pre::-webkit-scrollbar-thumb,
.cb:hover .cb-mermaid-preview::-webkit-scrollbar-thumb {
	background: rgba(0, 0, 0, 0.2);
}

.cb:hover .cb-body::-webkit-scrollbar-thumb:hover,
.cb:hover .cb-pre::-webkit-scrollbar-thumb:hover,
.cb:hover .cb-mermaid-preview::-webkit-scrollbar-thumb:hover {
	background: rgba(0, 0, 0, 0.35);
}

.cb--fixed-height .cb-body,
.cb .cb-pre,
.cb-mermaid-preview {
	scrollbar-width: thin;
	scrollbar-color: transparent transparent;
}

.cb:hover .cb-body,
.cb:hover .cb-pre,
.cb:hover .cb-mermaid-preview {
	scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.cb-drop-enter-active,
.cb-drop-leave-active {
	transition: opacity 0.15s, transform 0.15s;
}

.cb-drop-enter-from,
.cb-drop-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}
</style>
