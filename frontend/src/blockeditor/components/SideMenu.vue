<script setup lang="ts">
import type { MenuItem, MenuItemGroup } from '../types/editor'

defineProps<{
  isOpen: boolean
  position: { top: number; left: number }
  typeItems: MenuItem[]
  actionItems: MenuItemGroup[]
}>()

const emit = defineEmits<{
  close: []
  executeCommand: [item: MenuItem]
  deleteBlock: []
  duplicateBlock: []
}>()

import { textIconMap, isTextIcon, getSvgContent } from '../config/icons'
</script>

<template>
  <Transition name="side-menu">
    <div v-if="isOpen" class="side-menu-overlay" @click.self="emit('close')">
      <div class="side-menu" :style="{ top: position.top + 'px', left: position.left + 'px' }">
        <!-- 块类型转换区 -->
        <div class="side-menu-types">
          <button
            v-for="item in typeItems"
            :key="item.id"
            class="side-menu-type-btn"
            :title="item.label"
            @click="emit('executeCommand', item)"
          >
            <span v-if="isTextIcon(item.icon ?? '')" class="side-menu-type-text">{{ textIconMap[item.icon ?? ''] }}</span>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="getSvgContent(item.icon ?? '')" />
          </button>
        </div>

        <div class="side-menu-divider" />

        <!-- 操作项 -->
        <template v-for="(group, gi) in actionItems" :key="gi">
          <button
            v-for="item in group.items"
            :key="item.id"
            class="side-menu-action"
            :class="{ 'is-placeholder': item.placeholder }"
            @click="emit('executeCommand', item)"
          >
            <svg class="side-menu-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="getSvgContent(item.icon ?? '')" />
            <span class="side-menu-action-label">{{ item.label }}</span>
            <span v-if="item.hasSubMenu" class="side-menu-arrow">›</span>
          </button>
          <div v-if="gi < actionItems.length - 1" class="side-menu-divider" />
        </template>

        <div class="side-menu-divider" />

        <!-- 复制 / 删除 -->
        <button class="side-menu-action" @click="emit('duplicateBlock')">
          <svg class="side-menu-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="getSvgContent('Copy')" />
          <span class="side-menu-action-label">复制</span>
        </button>
        <button class="side-menu-action side-menu-action--danger" @click="emit('deleteBlock')">
          <svg class="side-menu-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="getSvgContent('Trash')" />
          <span class="side-menu-action-label">删除</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.side-menu-overlay { position: fixed; inset: 0; z-index: 999; }

.side-menu {
  position: absolute;
  z-index: 1000;
  background: var(--be-bg, #fff);
  border: 1px solid var(--be-border, #e5e7eb);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 5px;
  width: 196px;
}

/* === 块类型网格 === */
.side-menu-types {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2px;
  padding: 4px 2px;
}

.side-menu-type-btn {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 5px;
  color: var(--be-text, #1a1a1a);
  transition: background 0.1s, color 0.1s;
}

.side-menu-type-btn svg {
  width: 16px;
  height: 16px;
}

.side-menu-type-text {
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.3px;
}

.side-menu-type-btn:hover {
  background: var(--be-primary-light, #eff6ff);
  color: var(--be-primary, #3b82f6);
}

/* === 分割线 === */
.side-menu-divider {
  height: 1px;
  background: var(--be-border, #e5e7eb);
  margin: 3px 0;
}

/* === 操作项 === */
.side-menu-action {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 5px;
  text-align: left;
  font-size: 13px;
  color: var(--be-text, #1a1a1a);
  transition: background 0.1s;
}

.side-menu-action:hover {
  background: var(--be-primary-light, #eff6ff);
}

.side-menu-action.is-placeholder {
  opacity: 0.45;
  cursor: default;
}

.side-menu-action--danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

.side-menu-action-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  color: var(--be-text-secondary, #6b7280);
}

.side-menu-action-label { flex: 1; }

.side-menu-arrow {
  color: var(--be-text-secondary, #6b7280);
  font-size: 14px;
}

/* === 动画 === */
.side-menu-enter-active,
.side-menu-leave-active { transition: opacity 0.12s; }
.side-menu-enter-from,
.side-menu-leave-to { opacity: 0; }
</style>
