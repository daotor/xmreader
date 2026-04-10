<script setup lang="ts">
import { textColorPresets, bgColorPresets } from '../../config/toolbar'

defineProps<{
  isOpen: boolean
  currentTextColor: string | null
  currentHighlightColor: string | null
}>()

const emit = defineEmits<{
  toggle: []
  selectTextColor: [color: string | null]
  selectBgColor: [color: string | null]
}>()
</script>

<template>
  <div class="toolbar-dropdown toolbar-dropdown--inline">
    <button class="toolbar-btn toolbar-btn--color" :class="{ active: isOpen }" title="颜色" @click="emit('toggle')">
      <span class="color-icon-letter">A</span>
      <span class="color-icon-bar" :style="{ background: currentTextColor || '#1a1a1a' }"></span>
    </button>
    <Transition name="dropdown">
      <div v-if="isOpen" class="dropdown-panel color-panel color-panel--combined">
        <div class="color-section">
          <div class="color-panel-title">字体颜色</div>
          <div class="color-grid">
            <button
              v-for="c in textColorPresets" :key="'tc-' + c.label"
              class="color-swatch"
              :class="{ 'is-active': (currentTextColor || null) === c.value, 'is-default': !c.value }"
              :style="c.value ? { background: c.value } : {}"
              :title="c.label"
              @click="emit('selectTextColor', c.value)"
            >
              <svg v-if="!c.value" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/></svg>
            </button>
          </div>
        </div>
        <div class="color-section-divider" />
        <div class="color-section">
          <div class="color-panel-title">背景颜色</div>
          <div class="color-grid">
            <button
              v-for="c in bgColorPresets" :key="'bg-' + c.label"
              class="color-swatch"
              :class="{ 'is-active': (currentHighlightColor || null) === c.value, 'is-default': !c.value }"
              :style="c.value ? { background: c.value } : {}"
              :title="c.label"
              @click="emit('selectBgColor', c.value)"
            >
              <svg v-if="!c.value" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/></svg>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* 复用父级工具栏基础样式，通过 :deep 或全局共享；这里保留颜色面板专有样式 */
.toolbar-dropdown { position: relative; }
.toolbar-dropdown--inline { display: inline-flex; }

.toolbar-btn { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; padding: 0; border: none; background: none; cursor: pointer; border-radius: 6px; color: var(--be-icon, #444); transition: background 0.12s, color 0.12s; }
.toolbar-btn:hover:not(:disabled) { background: var(--be-hover-bg, #f3f4f6); color: var(--be-icon-hover, #1a1a1a); }
.toolbar-btn.active { background: var(--be-active-bg, #e8f0fe); color: var(--be-primary, #3b82f6); }

.toolbar-btn--color { flex-direction: column; gap: 1px; padding: 3px 0 2px; }
.color-icon-letter { font-family: 'Georgia', 'Times New Roman', serif; font-size: 15px; font-weight: 700; line-height: 1; }
.color-icon-bar { width: 18px; height: 3px; border-radius: 1px; flex-shrink: 0; }

.dropdown-panel { position: absolute; top: calc(100% + 6px); left: 0; background: var(--be-bg, #fff); border: 1px solid var(--be-border, #e5e7eb); border-radius: 10px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); padding: 6px; z-index: 200; }
.dropdown-enter-active, .dropdown-leave-active { transition: opacity 0.15s, transform 0.15s; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px); }

.color-panel { min-width: 200px; padding: 10px; }
.color-panel--combined { min-width: 210px; padding: 10px; }
.color-section { padding: 0; }
.color-section-divider { height: 1px; background: var(--be-border, #e5e7eb); margin: 10px 0; }
.color-panel-title { font-size: 12px; font-weight: 500; color: var(--be-text-secondary, #6b7280); margin-bottom: 8px; padding: 0 2px; }
.color-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }

.color-swatch {
  width: 32px; height: 32px; border-radius: 6px;
  border: 2px solid transparent; cursor: pointer;
  transition: transform 0.1s, border-color 0.1s;
  display: flex; align-items: center; justify-content: center; padding: 0;
}
.color-swatch:hover { transform: scale(1.12); }
.color-swatch.is-active { border-color: var(--be-primary, #3b82f6); }
.color-swatch.is-default { background: #fff; border-color: var(--be-border, #e5e7eb); }
.color-swatch.is-default:hover { border-color: var(--be-text-secondary, #6b7280); }
.color-swatch.is-default svg { width: 14px; height: 14px; color: var(--be-text-secondary, #999); }
</style>
