<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, toRef } from 'vue'
import type { Editor } from '@tiptap/core'
import type { ShallowRef } from 'vue'
import { useEditorState } from '../composables/useEditorState'
import { headingOptions, fontSizes, alignOptions } from '../config/toolbar'
import ToolbarColorPicker from './toolbar/ToolbarColorPicker.vue'
import ToolbarMoreMenu from './toolbar/ToolbarMoreMenu.vue'

const props = defineProps<{
  editor: Editor | null
  documentUrl?: string
}>()

const emit = defineEmits<{
  openImagePicker: []
}>()

// ==================== 内部状态管理（取代 17 个 props） ====================
const editorRef = computed(() => props.editor ?? undefined) as unknown as ShallowRef<Editor | undefined>
const state = useEditorState(editorRef)

// ==================== 下拉状态 ====================
const activeDropdown = ref<string | null>(null)
const headingMenuRef = ref<HTMLElement | null>(null)
const fontSizeMenuRef = ref<HTMLElement | null>(null)
const colorPickerRef = ref<HTMLElement | null>(null)
const alignMenuRef = ref<HTMLElement | null>(null)
const moreMenuRef = ref<HTMLElement | null>(null)

function toggleDropdown(name: string) {
  activeDropdown.value = activeDropdown.value === name ? null : name
}

function closeAllDropdowns() {
  activeDropdown.value = null
}

// ==================== 标题 ====================
const currentHeadingLabel = computed(() => {
  const h = state.currentHeading.value
  return headingOptions.find(o => o.value === (h ?? 0))?.label ?? '正文'
})

function selectHeading(value: number) {
  if (!props.editor) return
  if (value === 0) {
    props.editor.chain().focus().setParagraph().run()
  } else {
    props.editor.chain().focus().toggleHeading({ level: value as 1 | 2 | 3 | 4 | 5 }).run()
  }
  closeAllDropdowns()
}

// ==================== 字号 ====================
const currentFontSizeLabel = computed(() => {
  return state.currentFontSize.value?.replace('px', '') || '16'
})

function selectFontSize(size: string | null) {
  if (!props.editor) return
  if (size) {
    props.editor.chain().focus().setFontSize(size).run()
  } else {
    props.editor.chain().focus().unsetFontSize().run()
  }
  closeAllDropdowns()
}

// ==================== 颜色 ====================
function selectTextColor(color: string | null) {
  if (!props.editor) return
  if (color) {
    props.editor.chain().focus().setColor(color).run()
  } else {
    props.editor.chain().focus().unsetColor().run()
  }
  closeAllDropdowns()
}

function selectBgColor(color: string | null) {
  if (!props.editor) return
  if (color) {
    props.editor.chain().focus().toggleHighlight({ color }).run()
  } else {
    props.editor.chain().focus().unsetHighlight().run()
  }
  closeAllDropdowns()
}

// ==================== 对齐 ====================
function selectAlign(value: string) {
  if (!props.editor) return
  props.editor.chain().focus().setTextAlign(value).run()
  closeAllDropdowns()
}

// ==================== 点击外部关闭 ====================
const allDropdownRefs = () => [headingMenuRef.value, fontSizeMenuRef.value, colorPickerRef.value, alignMenuRef.value, moreMenuRef.value]

function handleClickOutside(e: MouseEvent) {
  if (!activeDropdown.value) return
  const target = e.target as Node
  for (const el of allDropdownRefs()) {
    if (el?.contains(target)) return
  }
  closeAllDropdowns()
}

onMounted(() => document.addEventListener('click', handleClickOutside, true))
onUnmounted(() => document.removeEventListener('click', handleClickOutside, true))

// ==================== 命令 ====================
function cmd(name: string, args?: any) {
  if (!props.editor) return
  const chain = props.editor.chain().focus()
  switch (name) {
    case 'bold': chain.toggleBold().run(); break
    case 'italic': chain.toggleItalic().run(); break
    case 'underline': chain.toggleUnderline().run(); break
    case 'strike': chain.toggleStrike().run(); break
    case 'code': chain.toggleCode().run(); break
    case 'bulletList': chain.toggleBulletList().run(); break
    case 'orderedList': chain.toggleOrderedList().run(); break
    case 'taskList': chain.toggleTaskList().run(); break
    case 'blockquote': chain.toggleBlockquote().run(); break
    case 'codeBlock': chain.toggleCodeBlock().run(); break
    case 'horizontalRule': chain.setHorizontalRule().run(); break
    case 'undo': chain.undo().run(); break
    case 'redo': chain.redo().run(); break
    case 'table': chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break
    case 'highlightBlock':
      chain.run()
      props.editor.commands.setHighlightBlock({ type: args || 'info' })
      break
  }
}
</script>

<template>
  <div class="editor-toolbar" v-if="editor">
    <div class="toolbar-inner">
      <!-- 撤销/重做 -->
      <div class="toolbar-group">
        <button class="toolbar-btn" :disabled="!state.canUndo.value" title="撤销 (Ctrl+Z)" @click="cmd('undo')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h10a5 5 0 0 1 0 10H9"/><polyline points="7 14 3 10 7 6"/></svg>
        </button>
        <button class="toolbar-btn" :disabled="!state.canRedo.value" title="重做 (Ctrl+Y)" @click="cmd('redo')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10H11a5 5 0 0 0 0 10h4"/><polyline points="17 14 21 10 17 6"/></svg>
        </button>
      </div>

      <div class="toolbar-sep" />

      <!-- 标题选择 -->
      <div class="toolbar-dropdown" ref="headingMenuRef">
        <button class="toolbar-dropdown-trigger" :class="{ open: activeDropdown === 'heading' }" @click="toggleDropdown('heading')">
          <span class="toolbar-dropdown-label">{{ currentHeadingLabel }}</span>
          <svg class="toolbar-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <Transition name="dropdown">
          <div v-if="activeDropdown === 'heading'" class="dropdown-panel heading-menu">
            <button v-for="opt in headingOptions" :key="opt.value" class="heading-menu-item" :class="{ 'is-active': (state.currentHeading.value ?? 0) === opt.value }" @click="selectHeading(opt.value)">
              <span class="heading-menu-check">
                <svg v-if="(state.currentHeading.value ?? 0) === opt.value" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              <span class="heading-menu-icon">{{ opt.icon }}</span>
              <span class="heading-menu-label">{{ opt.label }}</span>
            </button>
          </div>
        </Transition>
      </div>

      <!-- 字号选择 -->
      <div class="toolbar-dropdown" ref="fontSizeMenuRef">
        <button class="toolbar-dropdown-trigger toolbar-dropdown-trigger--compact" :class="{ open: activeDropdown === 'fontSize' }" @click="toggleDropdown('fontSize')" title="字号">
          <span class="toolbar-dropdown-label">{{ currentFontSizeLabel }}</span>
          <svg class="toolbar-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <Transition name="dropdown">
          <div v-if="activeDropdown === 'fontSize'" class="dropdown-panel fontsize-menu">
            <button class="fontsize-menu-item" :class="{ 'is-active': !state.currentFontSize.value }" @click="selectFontSize(null)">
              <span class="fontsize-value">16</span>
              <span class="fontsize-label">默认</span>
            </button>
            <button v-for="size in fontSizes" :key="size" class="fontsize-menu-item" :class="{ 'is-active': state.currentFontSize.value === size }" @click="selectFontSize(size)">
              <span class="fontsize-value">{{ size.replace('px', '') }}</span>
            </button>
          </div>
        </Transition>
      </div>

      <div class="toolbar-sep" />

      <!-- 文字格式 -->
      <div class="toolbar-group">
        <button class="toolbar-btn toolbar-btn--text" :class="{ active: state.isBold.value }" title="粗体 (Ctrl+B)" @click="cmd('bold')"><span class="icon-bold">B</span></button>
        <button class="toolbar-btn toolbar-btn--text" :class="{ active: state.isItalic.value }" title="斜体 (Ctrl+I)" @click="cmd('italic')"><span class="icon-italic">I</span></button>
        <button class="toolbar-btn toolbar-btn--text" :class="{ active: state.isUnderline.value }" title="下划线 (Ctrl+U)" @click="cmd('underline')"><span class="icon-underline">U</span></button>
        <button class="toolbar-btn toolbar-btn--text" :class="{ active: state.isStrike.value }" title="删除线" @click="cmd('strike')"><span class="icon-strike">S</span></button>

        <!-- 颜色选择器 -->
        <div ref="colorPickerRef">
          <ToolbarColorPicker
            :is-open="activeDropdown === 'textColor'"
            :current-text-color="state.currentTextColor.value"
            :current-highlight-color="state.currentHighlightColor.value"
            @toggle="toggleDropdown('textColor')"
            @select-text-color="selectTextColor"
            @select-bg-color="selectBgColor"
          />
        </div>

        <button class="toolbar-btn" :class="{ active: state.isCode.value }" title="行内代码" @click="cmd('code')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </button>
      </div>

      <div class="toolbar-sep" />

      <!-- 列表与引用 -->
      <div class="toolbar-group">
        <button class="toolbar-btn" :class="{ active: state.isBulletList.value }" title="无序列表" @click="cmd('bulletList')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>
        </button>
        <button class="toolbar-btn" :class="{ active: state.isOrderedList.value }" title="有序列表" @click="cmd('orderedList')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="3" y="8" font-size="7" font-weight="600" fill="currentColor" stroke="none" font-family="sans-serif">1</text><text x="3" y="14.5" font-size="7" font-weight="600" fill="currentColor" stroke="none" font-family="sans-serif">2</text><text x="3" y="21" font-size="7" font-weight="600" fill="currentColor" stroke="none" font-family="sans-serif">3</text></svg>
        </button>
        <button class="toolbar-btn" :class="{ active: state.isTaskList.value }" title="任务列表" @click="cmd('taskList')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="6" height="6" rx="1"/><polyline points="5 8 6.5 9.5 9 6.5" stroke-width="1.5"/><line x1="13" y1="8" x2="21" y2="8"/><rect x="3" y="14" width="6" height="6" rx="1"/><line x1="13" y1="17" x2="21" y2="17"/></svg>
        </button>
        <button class="toolbar-btn" :class="{ active: state.isBlockquote.value }" title="引用" @click="cmd('blockquote')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="4" x2="3" y2="20"/><line x1="9" y1="7" x2="21" y2="7"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="17" x2="17" y2="17"/></svg>
        </button>
        <button class="toolbar-btn" :class="{ active: state.isCodeBlock.value }" title="代码块" @click="cmd('codeBlock')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="3"/><polyline points="8 9 5 12 8 15"/><polyline points="16 9 19 12 16 15"/></svg>
        </button>

        <!-- 对齐 -->
        <div class="toolbar-dropdown toolbar-dropdown--inline" ref="alignMenuRef">
          <button class="toolbar-btn" :class="{ active: activeDropdown === 'align' }" title="对齐方式" @click="toggleDropdown('align')">
            <svg v-if="state.currentTextAlign.value === 'center'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
            <svg v-else-if="state.currentTextAlign.value === 'right'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
          </button>
          <Transition name="dropdown">
            <div v-if="activeDropdown === 'align'" class="dropdown-panel align-menu">
              <button v-for="opt in alignOptions" :key="opt.value" class="align-menu-item" :class="{ 'is-active': state.currentTextAlign.value === opt.value }" @click="selectAlign(opt.value)">
                <span class="align-menu-check">
                  <svg v-if="state.currentTextAlign.value === opt.value" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <svg v-if="opt.value === 'left'" class="align-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
                <svg v-else-if="opt.value === 'center'" class="align-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
                <svg v-else class="align-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
                <span class="align-menu-label">{{ opt.label }}</span>
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <div class="toolbar-sep" />

      <!-- 插入 -->
      <div class="toolbar-group">
        <button class="toolbar-btn" title="分割线" @click="cmd('horizontalRule')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"/></svg>
        </button>
        <button class="toolbar-btn" title="表格" @click="cmd('table')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
        </button>
        <button class="toolbar-btn" title="图片" @click="emit('openImagePicker')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </button>
        <button class="toolbar-btn" title="高亮块" @click="cmd('highlightBlock', 'info')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
        </button>
      </div>

      <div class="toolbar-sep" />

      <!-- 更多菜单 -->
      <div ref="moreMenuRef">
        <ToolbarMoreMenu
          :is-open="activeDropdown === 'more'"
          :document-url="props.documentUrl"
          @toggle="toggleDropdown('more')"
          @close="closeAllDropdowns"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-toolbar { display: flex; align-items: center; justify-content: center; padding: 6px 16px; background: var(--be-bg, #ffffff); min-height: 48px; user-select: none; position: relative; z-index: 100; }
.toolbar-inner { display: flex; align-items: center; gap: 2px; background: var(--be-toolbar-bg, #f5f5f5); border-radius: 10px; padding: 4px 8px; }
.toolbar-group { display: flex; align-items: center; gap: 2px; }
.toolbar-sep { width: 1px; height: 22px; background: var(--be-border, #e5e7eb); margin: 0 6px; flex-shrink: 0; }

/* ============ 按钮基础 ============ */
.toolbar-btn { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; padding: 0; border: none; background: none; cursor: pointer; border-radius: 6px; color: var(--be-icon, #444); transition: background 0.12s, color 0.12s; }
.toolbar-btn svg { width: 18px; height: 18px; flex-shrink: 0; }
.toolbar-btn:hover:not(:disabled) { background: var(--be-hover-bg, #f3f4f6); color: var(--be-icon-hover, #1a1a1a); }
.toolbar-btn.active { background: var(--be-active-bg, #e8f0fe); color: var(--be-primary, #3b82f6); }
.toolbar-btn:disabled { opacity: 0.3; cursor: not-allowed; }

/* ============ B/I/U/S 文字按钮 ============ */
.toolbar-btn--text { font-family: 'Georgia', 'Times New Roman', serif; font-size: 16px; line-height: 1; }
.icon-bold { font-weight: 700; }
.icon-italic { font-style: italic; }
.icon-underline { text-decoration: underline; text-underline-offset: 2px; }
.icon-strike { text-decoration: line-through; }

/* ============ 通用下拉 ============ */
.toolbar-dropdown { position: relative; }
.toolbar-dropdown--inline { display: inline-flex; }

.toolbar-dropdown-trigger { display: flex; align-items: center; gap: 4px; height: 34px; padding: 0 8px; border: none; background: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; color: var(--be-text, #1a1a1a); transition: background 0.12s; white-space: nowrap; }
.toolbar-dropdown-trigger--compact { padding: 0 6px; min-width: 44px; justify-content: center; }
.toolbar-dropdown-trigger:hover, .toolbar-dropdown-trigger.open { background: var(--be-hover-bg, #f3f4f6); }

.toolbar-dropdown-arrow { width: 12px; height: 12px; color: var(--be-text-secondary, #6b7280); transition: transform 0.15s; flex-shrink: 0; }
.toolbar-dropdown-trigger.open .toolbar-dropdown-arrow { transform: rotate(180deg); }

.dropdown-panel { position: absolute; top: calc(100% + 6px); left: 0; background: var(--be-bg, #fff); border: 1px solid var(--be-border, #e5e7eb); border-radius: 10px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); padding: 6px; z-index: 200; }
.dropdown-enter-active, .dropdown-leave-active { transition: opacity 0.15s, transform 0.15s; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px); }

/* ============ 标题菜单 ============ */
.heading-menu { min-width: 180px; }
.heading-menu-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px; border: none; background: none; cursor: pointer; border-radius: 6px; font-size: 15px; color: var(--be-text, #1a1a1a); transition: background 0.1s; text-align: left; }
.heading-menu-item:hover { background: var(--be-hover-bg, #f3f4f6); }
.heading-menu-item.is-active { color: var(--be-primary, #3b82f6); }
.heading-menu-check { display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; flex-shrink: 0; }
.heading-menu-check svg { width: 16px; height: 16px; color: var(--be-primary, #3b82f6); }
.heading-menu-icon { font-size: 14px; font-weight: 600; color: var(--be-text-secondary, #6b7280); min-width: 24px; }
.heading-menu-item.is-active .heading-menu-icon { color: var(--be-primary, #3b82f6); }
.heading-menu-label { font-weight: 400; }

/* ============ 字号菜单 ============ */
.fontsize-menu { min-width: 100px; max-height: 320px; overflow-y: auto; }
.fontsize-menu-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border: none; background: none; cursor: pointer; border-radius: 6px; font-size: 14px; color: var(--be-text, #1a1a1a); transition: background 0.1s; text-align: left; }
.fontsize-menu-item:hover { background: var(--be-hover-bg, #f3f4f6); }
.fontsize-menu-item.is-active { color: var(--be-primary, #3b82f6); font-weight: 600; }
.fontsize-value { min-width: 24px; font-variant-numeric: tabular-nums; }
.fontsize-label { color: var(--be-text-secondary, #6b7280); font-size: 12px; }

/* ============ 对齐菜单 ============ */
.align-menu { min-width: 160px; }
.align-menu-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px; border: none; background: none; cursor: pointer; border-radius: 6px; font-size: 14px; color: var(--be-text, #1a1a1a); transition: background 0.1s; text-align: left; }
.align-menu-item:hover { background: var(--be-hover-bg, #f3f4f6); }
.align-menu-item.is-active { color: var(--be-primary, #3b82f6); }
.align-menu-check { display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; flex-shrink: 0; }
.align-menu-check svg { width: 16px; height: 16px; color: var(--be-primary, #3b82f6); }
.align-menu-icon { width: 18px; height: 18px; flex-shrink: 0; color: var(--be-text-secondary, #6b7280); }
.align-menu-item.is-active .align-menu-icon { color: var(--be-primary, #3b82f6); }
.align-menu-label { font-weight: 400; }
</style>
