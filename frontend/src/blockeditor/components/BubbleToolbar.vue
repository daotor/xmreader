<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Editor } from '@tiptap/core'

const props = defineProps<{
  editor: Editor | null
}>()

const isVisible = ref(false)
const position = ref({ top: 0, left: 0 })
const linkUrl = ref('')
const showLinkInput = ref(false)

// 文字格式状态
const isBold = ref(false)
const isItalic = ref(false)
const isUnderline = ref(false)
const isStrike = ref(false)
const isCode = ref(false)
const hasLink = ref(false)

function updateState() {
  const ed = props.editor
  if (!ed) return

  const { from, to, empty } = ed.state.selection
  if (empty || from === to) {
    isVisible.value = false
    return
  }

  // 代码块内不显示浮动工具条
  if (ed.isActive('codeBlock')) {
    isVisible.value = false
    return
  }

  // 更新格式状态
  isBold.value = ed.isActive('bold')
  isItalic.value = ed.isActive('italic')
  isUnderline.value = ed.isActive('underline')
  isStrike.value = ed.isActive('strike')
  isCode.value = ed.isActive('code')
  hasLink.value = ed.isActive('link')

  // 计算位置
  const coords = ed.view.coordsAtPos(from)
  const endCoords = ed.view.coordsAtPos(to)
  position.value = {
    top: coords.top - 48,
    left: (coords.left + endCoords.left) / 2,
  }
  isVisible.value = true
}

function cmd(name: string) {
  if (!props.editor) return
  const chain = props.editor.chain().focus()
  switch (name) {
    case 'bold': chain.toggleBold().run(); break
    case 'italic': chain.toggleItalic().run(); break
    case 'underline': chain.toggleUnderline().run(); break
    case 'strike': chain.toggleStrike().run(); break
    case 'code': chain.toggleCode().run(); break
    case 'link':
      if (hasLink.value) {
        props.editor.chain().focus().unsetLink().run()
      } else {
        showLinkInput.value = true
        linkUrl.value = ''
      }
      break
  }
}

function applyLink() {
  if (!props.editor || !linkUrl.value) return
  props.editor.chain().focus().setLink({ href: linkUrl.value }).run()
  showLinkInput.value = false
  linkUrl.value = ''
}

function cancelLink() {
  showLinkInput.value = false
  linkUrl.value = ''
}

watch(() => props.editor, (ed) => {
  if (!ed) return
  ed.on('selectionUpdate', updateState)
  ed.on('blur', () => {
    // 延迟关闭，允许点击 bubble toolbar
    setTimeout(() => { isVisible.value = false }, 200)
  })
}, { immediate: true })
</script>

<template>
  <Teleport to="body">
    <Transition name="bubble">
      <div
        v-if="isVisible && !showLinkInput"
        class="bubble-toolbar"
        :style="{ top: position.top + 'px', left: position.left + 'px' }"
      >
        <button class="bubble-btn" :class="{ active: isBold }" title="粗体" @click="cmd('bold')"><b>B</b></button>
        <button class="bubble-btn" :class="{ active: isItalic }" title="斜体" @click="cmd('italic')"><i>I</i></button>
        <button class="bubble-btn" :class="{ active: isUnderline }" title="下划线" @click="cmd('underline')"><u>U</u></button>
        <button class="bubble-btn" :class="{ active: isStrike }" title="删除线" @click="cmd('strike')"><s>S</s></button>
        <button class="bubble-btn" :class="{ active: isCode }" title="行内代码" @click="cmd('code')">&lt;/&gt;</button>
        <div class="bubble-sep" />
        <button class="bubble-btn" :class="{ active: hasLink }" title="链接" @click="cmd('link')">🔗</button>
      </div>
    </Transition>

    <!-- 链接输入 -->
    <Transition name="bubble">
      <div
        v-if="isVisible && showLinkInput"
        class="bubble-toolbar bubble-link-input"
        :style="{ top: position.top + 'px', left: position.left + 'px' }"
      >
        <input
          v-model="linkUrl"
          class="link-input"
          type="url"
          placeholder="输入链接地址…"
          @keydown.enter="applyLink"
          @keydown.escape="cancelLink"
          autofocus
        />
        <button class="bubble-btn" title="确认" @click="applyLink">✓</button>
        <button class="bubble-btn" title="取消" @click="cancelLink">✕</button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.bubble-toolbar {
  position: fixed;
  z-index: 1100;
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 4px;
  background: #1a1a1a;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  transform: translateX(-50%);
}

.bubble-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  color: #d1d5db;
  transition: background 0.1s, color 0.1s;
}

.bubble-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.bubble-btn.active {
  background: rgba(255, 255, 255, 0.15);
  color: #60a5fa;
}

.bubble-sep {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 2px;
}

.bubble-link-input {
  gap: 4px;
}

.link-input {
  width: 220px;
  height: 28px;
  padding: 0 8px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 13px;
  outline: none;
}

.link-input::placeholder {
  color: #6b7280;
}

/* Transition */
.bubble-enter-active,
.bubble-leave-active {
  transition: opacity 0.12s, transform 0.12s;
}
.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}
</style>
