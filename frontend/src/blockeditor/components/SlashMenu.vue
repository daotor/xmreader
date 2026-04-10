<script setup lang="ts">
import { computed } from 'vue'
import type { MenuItem } from '../types/editor'
import { textIconMap, isTextIcon, getSvgContent } from '../config/icons'

const props = defineProps<{
  items: MenuItem[]
  selectedIndex: number
  isOpen: boolean
}>()

const emit = defineEmits<{ select: [index: number] }>()

/** 按 group 字段将扁平列表分段，保留原始索引用于选中 & 点击 */
const groupedItems = computed(() => {
  const groups: { label: string; entries: { item: MenuItem; index: number }[] }[] = []
  let currentLabel: string | null = null

  props.items.forEach((item, index) => {
    const label = item.group ?? ''
    if (label !== currentLabel) {
      groups.push({ label, entries: [] })
      currentLabel = label
    }
    groups[groups.length - 1].entries.push({ item, index })
  })

  return groups
})
</script>

<template>
  <Transition name="slash-menu">
    <div v-if="isOpen && items.length > 0" class="slash-menu">
      <div class="slash-menu-list">
        <template v-for="(group, gi) in groupedItems" :key="gi">
          <!-- 分组标题 -->
          <div v-if="group.label" class="slash-menu-group-title">{{ group.label }}</div>

          <button
            v-for="{ item, index } in group.entries"
            :key="item.id"
            :data-index="index"
            :class="['slash-menu-item', { 'is-selected': index === selectedIndex }]"
            @click="emit('select', index)"
          >
            <span class="slash-menu-icon">
              <span v-if="isTextIcon(item.icon ?? '')" class="slash-menu-icon-text">{{ textIconMap[item.icon ?? ''] }}</span>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="getSvgContent(item.icon ?? '')" />
            </span>
            <span class="slash-menu-text">
              <span class="slash-menu-label">{{ item.label }}</span>
              <span v-if="item.description" class="slash-menu-desc">{{ item.description }}</span>
            </span>
          </button>
        </template>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slash-menu {
  position: fixed;
  z-index: 1000;
  background: var(--be-bg, #fff);
  border: 1px solid var(--be-border, #e5e7eb);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  padding: 6px;
  min-width: 260px;
  max-height: 380px;
  overflow-y: auto;
}

/* 滚动条美化 */
.slash-menu::-webkit-scrollbar { width: 5px; }
.slash-menu::-webkit-scrollbar-track { background: transparent; }
.slash-menu::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.12); border-radius: 3px; }
.slash-menu::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.2); }

.slash-menu-list {
  display: flex;
  flex-direction: column;
}

/* 分组标题 */
.slash-menu-group-title {
  padding: 8px 10px 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--be-text-secondary, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  user-select: none;
}

/* 菜单项 */
.slash-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 6px;
  text-align: left;
  font-size: 14px;
  color: var(--be-text, #1a1a1a);
  transition: background 0.1s;
}

.slash-menu-item:hover,
.slash-menu-item.is-selected {
  background: var(--be-primary-light, #eff6ff);
}

/* 图标容器 */
.slash-menu-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--be-code-bg, #f3f4f6);
  border: 1px solid var(--be-border, #e5e7eb);
  border-radius: 6px;
}

.slash-menu-icon svg {
  width: 18px;
  height: 18px;
  color: var(--be-text-secondary, #6b7280);
}

.slash-menu-icon-text {
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.3px;
  color: var(--be-text-secondary, #6b7280);
}

/* 文字区 */
.slash-menu-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.slash-menu-label {
  font-weight: 500;
  line-height: 1.3;
}

.slash-menu-desc {
  font-size: 12px;
  color: var(--be-text-secondary, #9ca3af);
  line-height: 1.3;
}

/* 进出动画 */
.slash-menu-enter-active,
.slash-menu-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.slash-menu-enter-from,
.slash-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
