<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { EditorContent } from "@tiptap/vue-3";
import { resolveBlockEditorContent, useBlockEditor } from "../composables/useBlockEditor";
import { useSlashMenu } from "../composables/useSlashMenu";
import { useSideMenu } from "../composables/useSideMenu";
import { useImageUpload } from "../composables/useImageUpload";
import { useTheme } from "../composables/useTheme";
import EditorToolbar from "./EditorToolbar.vue";
import BubbleToolbar from "./BubbleToolbar.vue";
import SlashMenu from "./SlashMenu.vue";
import SideMenu from "./SideMenu.vue";
import type { BlockEditorProps, MenuItem } from "../types/editor";
import { serializeToMarkdown } from "../utils/markdown-serializer";
import { markdownToHtml } from "../utils/markdown-parser";
import { textIconMap, svgIconMap, isTextIcon, getBlockIconKey } from "../config/icons";

const props = withDefaults(defineProps<BlockEditorProps>(), {
  contentFormat: "json",
  editable: true,
  placeholder: '输入 "/" 插入内容块…',
  readerMode: false,
});

const emit = defineEmits<{
  "update:content": [json: string];
  save: [json: string];
  ready: [editor: any];
}>();

// ==================== 斜杠菜单 ====================
const slash = useSlashMenu();
const slashMenuPos = ref({ top: 0, left: 0 });
const isInteractive = computed(() => !props.readerMode && props.editable);

// ==================== 主题 ====================
useTheme(); // 初始化主题监听，同步外层页面主题

// ==================== 编辑器核心 ====================
const { editor } = useBlockEditor({
  content: props.content,
  contentFormat: props.contentFormat,
  editable: isInteractive.value,
  placeholder: props.placeholder,
  documentUrl: props.documentUrl,
  openLinksOnClick: props.openLinksOnClick,
  onUpdate: (json) => emit("update:content", JSON.stringify(json)),
  onSave: (json) => emit("save", JSON.stringify(json)),
  slashSuggestion: {
    render: () => ({
      onStart: (suggestionProps: any) => {
        slash.onStart(suggestionProps);
        updateSlashMenuPosition();
      },
      onUpdate: (suggestionProps: any) => {
        slash.onUpdate(suggestionProps);
        updateSlashMenuPosition();
      },
      onExit: () => slash.onExit(),
      onKeyDown: (suggestionKeyProps: any) => slash.onKeyDown(suggestionKeyProps),
    }),
  },
});

// ==================== 图片上传 ====================
const imageUpload = useImageUpload(() => editor.value || undefined);

// ==================== 侧边菜单 ====================
const sideMenu = useSideMenu();
const dragHandlePos = ref<{ top: number; left: number } | null>(null);
const hoveredNodePos = ref<number | null>(null);
const hoveredBlockIcon = ref("T");
const isHoveringHandle = ref(false);
const plusButtonPos = ref<{ top: number; left: number } | null>(null);

// ==================== 拖拽排序状态 ====================
const isDragging = ref(false);
const dragSourceBlockPos = ref<number | null>(null);
const dragStartPoint = ref<{ x: number; y: number } | null>(null);
const dropIndicator = ref<{ top: number; left: number; width: number } | null>(null);
const dropTargetPos = ref<number | null>(null);
const DRAG_THRESHOLD = 5;
let dragSourceDOM: HTMLElement | null = null;

// 图标工具函数从 @/config/icons 导入（textIconMap, svgIconMap, isTextIcon, getBlockIconKey）

function updateSlashMenuPosition() {
  if (!editor.value) return;
  const { state: s, view } = editor.value;
  const coords = view.coordsAtPos(s.selection.from);
  slashMenuPos.value = { top: coords.bottom + 4, left: coords.left };
}

function handleEditorMouseMove(event: MouseEvent) {
  if (!isInteractive.value) return;
  if (!editor.value) return;
  // 拖拽进行中时不更新手柄位置
  if (isDragging.value) return;
  // 鼠标正悬停在手柄/加号按钮上时，不清除手柄位置
  if (isHoveringHandle.value) return;

  const view = editor.value.view;
  const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!pos) {
    dragHandlePos.value = null;
    return;
  }

  const $pos = view.state.doc.resolve(pos.pos);
  if ($pos.depth < 1) {
    dragHandlePos.value = null;
    return;
  }

  const blockPos = $pos.before(1);
  const node = view.state.doc.nodeAt(blockPos);
  const dom = view.nodeDOM(blockPos);
  if (dom && dom instanceof HTMLElement) {
    const rect = dom.getBoundingClientRect();
    const editorRect = view.dom.getBoundingClientRect();
    hoveredNodePos.value = blockPos;
    hoveredBlockIcon.value = getBlockIconKey(node);

    // 空段落只显示 + 号，不显示拖拽手柄
    const isEmptyParagraph = node?.type.name === 'paragraph' && !node.textContent;
    dragHandlePos.value = isEmptyParagraph ? null : { top: rect.top, left: editorRect.left - 48 };
  }
}

function handleHandleEnter() {
  isHoveringHandle.value = true;
}
function handleHandleLeave() {
  isHoveringHandle.value = false;
}

/** 根据当前 hoveredNodePos 重新计算手柄的视口坐标 */
function refreshDragHandlePos() {
  if (!editor.value || hoveredNodePos.value === null) return;
  const view = editor.value.view;
  const dom = view.nodeDOM(hoveredNodePos.value);
  if (dom && dom instanceof HTMLElement) {
    const rect = dom.getBoundingClientRect();
    const editorRect = view.dom.getBoundingClientRect();
    dragHandlePos.value = { top: rect.top, left: editorRect.left - 48 };
  } else {
    // 节点已不在可视区域或被删除
    dragHandlePos.value = null;
    hoveredNodePos.value = null;
  }
}

function handleEditorScroll() {
  if (!isInteractive.value) return;
  if (dragHandlePos.value) refreshDragHandlePos();
  if (plusButtonPos.value) updatePlusButton();
}

function handleDragHandleClick() {
  if (!isInteractive.value) return;
  if (dragHandlePos.value && hoveredNodePos.value !== null) {
    isHoveringHandle.value = false;
    const menuWidth = 200;
    const handleTop = dragHandlePos.value.top;
    const handleLeft = dragHandlePos.value.left;
    const viewportH = window.innerHeight;

    // 垂直：下方空间足够则顶部对齐，否则菜单底部对齐手柄底部
    const handleBottom = handleTop + 28;
    const menuH = 340;
    let top = handleTop;
    if (handleTop + menuH > viewportH - 8) {
      top = handleBottom - menuH + 18;
    }

    // 水平：紧贴手柄左侧，间距 6px
    let left = handleLeft - menuWidth - 12;
    if (left < 8) {
      left = handleLeft + 52;
    }

    sideMenu.open({ top, left }, hoveredNodePos.value);
  }
}

function handleSideMenuCommand(item: MenuItem) {
  if (!isInteractive.value) return;
  if (editor.value) sideMenu.executeCommand(editor.value, item);
}

// ==================== 拖拽排序逻辑 ====================
function handleHandleMouseDown(event: MouseEvent) {
  if (!isInteractive.value) return;
  if (!editor.value || hoveredNodePos.value === null) return;
  event.preventDefault();
  dragStartPoint.value = { x: event.clientX, y: event.clientY };
  dragSourceBlockPos.value = hoveredNodePos.value;
  document.addEventListener('mousemove', onDragMouseMove);
  document.addEventListener('mouseup', onDragMouseUp);
}

function onDragMouseMove(event: MouseEvent) {
  if (!dragStartPoint.value || !editor.value) return;

  if (!isDragging.value) {
    const dx = event.clientX - dragStartPoint.value.x;
    const dy = event.clientY - dragStartPoint.value.y;
    if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
    // 超过阈值，正式开始拖拽
    isDragging.value = true;
    sideMenu.close();
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    // 给被拖拽的源块添加半透明效果
    if (dragSourceBlockPos.value !== null) {
      const dom = editor.value.view.nodeDOM(dragSourceBlockPos.value);
      if (dom instanceof HTMLElement) {
        dragSourceDOM = dom;
        dom.style.opacity = '0.4';
        dom.style.transition = 'opacity 0.15s';
      }
    }
  }

  const view = editor.value.view;
  const doc = view.state.doc;
  const editorRect = view.dom.getBoundingClientRect();
  const sourcePos = dragSourceBlockPos.value!;
  const sourceNode = doc.nodeAt(sourcePos);
  const sourceSize = sourceNode ? sourceNode.nodeSize : 0;

  let closestDist = Infinity;
  let bestTop = 0;
  let bestPos = 0;

  doc.forEach((node, offset) => {
    const dom = view.nodeDOM(offset);
    if (!(dom instanceof HTMLElement)) return;
    const rect = dom.getBoundingClientRect();

    // 块顶部边缘 = 插入到该块之前
    const distTop = Math.abs(event.clientY - rect.top);
    if (distTop < closestDist) {
      closestDist = distTop;
      bestTop = rect.top;
      bestPos = offset;
    }

    // 块底部边缘 = 插入到该块之后
    const distBottom = Math.abs(event.clientY - rect.bottom);
    if (distBottom < closestDist) {
      closestDist = distBottom;
      bestTop = rect.bottom;
      bestPos = offset + node.nodeSize;
    }
  });

  // 目标位置在源块范围内，属于无效移动，隐藏指示器
  if (bestPos >= sourcePos && bestPos <= sourcePos + sourceSize) {
    dropIndicator.value = null;
    dropTargetPos.value = null;
    return;
  }

  dropIndicator.value = { top: bestTop, left: editorRect.left, width: editorRect.width };
  dropTargetPos.value = bestPos;
}

function onDragMouseUp() {
  document.removeEventListener('mousemove', onDragMouseMove);
  document.removeEventListener('mouseup', onDragMouseUp);

  if (isDragging.value) {
    performBlockMove();
  } else {
    // 未拖拽，视为点击，打开侧边菜单
    handleDragHandleClick();
  }

  // 重置所有拖拽状态
  if (dragSourceDOM) {
    dragSourceDOM.style.opacity = '';
    dragSourceDOM.style.transition = '';
    dragSourceDOM = null;
  }
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  isDragging.value = false;
  isHoveringHandle.value = false;
  dragStartPoint.value = null;
  dragSourceBlockPos.value = null;
  dropIndicator.value = null;
  dropTargetPos.value = null;
  dragHandlePos.value = null;
}

function performBlockMove() {
  if (!editor.value || dragSourceBlockPos.value === null || dropTargetPos.value === null) return;

  const { state } = editor.value.view;
  const { doc } = state;
  const tr = state.tr;
  const sourcePos = dragSourceBlockPos.value;
  const node = doc.nodeAt(sourcePos);
  if (!node) return;

  const nodeSize = node.nodeSize;
  const targetPos = dropTargetPos.value;

  // 目标在源块范围内，不移动
  if (targetPos >= sourcePos && targetPos <= sourcePos + nodeSize) return;

  // 先删除源块，再在映射后的目标位置插入
  tr.delete(sourcePos, sourcePos + nodeSize);
  const mappedTarget = tr.mapping.map(targetPos);
  tr.insert(mappedTarget, node);

  editor.value.view.dispatch(tr);
}

function updatePlusButton() {
  if (!isInteractive.value) {
    plusButtonPos.value = null;
    return;
  }
  if (!editor.value) return;
  const { state: s, view } = editor.value;
  const $pos = s.doc.resolve(s.selection.from);
  const node = $pos.parent;
  if (node.type.name === "paragraph" && node.content.size === 0) {
    const coords = view.coordsAtPos(s.selection.from);
    const editorRect = view.dom.getBoundingClientRect();
    plusButtonPos.value = { top: coords.top, left: editorRect.left - 32 };
  } else {
    plusButtonPos.value = null;
  }
}

function handlePlusClick() {
  if (!isInteractive.value) return;
  if (!editor.value) return;
  editor.value.chain().focus().insertContent("/").run();
}

// ==================== 图片拖拽和粘贴 ====================
function onDrop(event: DragEvent) {
  if (!isInteractive.value) return;
  event.preventDefault();
  imageUpload.handleDrop(event);
}
function onPaste(event: ClipboardEvent) {
  if (!isInteractive.value) return;
  imageUpload.handlePaste(event);
}
function onDragOver(event: DragEvent) {
  if (!isInteractive.value) return;
  event.preventDefault();
}

// ==================== 生命周期 ====================
watch(
  [editor, () => props.content, () => props.contentFormat, () => props.documentUrl],
  ([ed, content, contentFormat, documentUrl]) => {
    if (!ed) return;
    const nextContent = resolveBlockEditorContent({
      content,
      contentFormat,
      documentUrl,
    });
    ed.commands.setContent(nextContent, { emitUpdate: false });
  },
  { immediate: true },
);

watch(
  [editor, isInteractive],
  ([ed, interactive]) => {
    if (!ed) return;
    ed.setEditable(interactive);
    if (!interactive) {
      plusButtonPos.value = null;
      dragHandlePos.value = null;
      sideMenu.close();
      slash.onExit();
    }
  },
  { immediate: true },
);

watch(
  editor,
  (ed) => {
    if (ed) {
      emit("ready", ed);
      ed.on("selectionUpdate", updatePlusButton);
      ed.on("update", updatePlusButton);
    }
  },
  { immediate: true },
);

// ==================== 对外 API ====================
defineExpose({
  getJSON: () => editor.value?.getJSON() ?? {},
  getHTML: () => editor.value?.getHTML() ?? "",
  getMarkdown: () => {
    if (!editor.value) return "";
    return serializeToMarkdown(editor.value.getJSON() as any);
  },
  setMarkdown: (md: string) => {
    if (!editor.value) return;
    const html = markdownToHtml(md, { documentUrl: props.documentUrl });
    editor.value.commands.setContent(html, { emitUpdate: false });
  },
  setJSON: (json: object) => {
    if (!editor.value) return;
    editor.value.commands.setContent(json, { emitUpdate: false });
  },
  focus: () => editor.value?.commands.focus(),
  isEmpty: () => editor.value?.isEmpty ?? true,
});
</script>

<template>
  <div class="block-editor" :class="{ 'block-editor--reader': !isInteractive }" @mousemove="handleEditorMouseMove">
    <!-- 顶部工具条 -->
    <EditorToolbar
      v-if="isInteractive"
      :editor="editor ?? null"
      :document-url="props.documentUrl"
      @open-image-picker="imageUpload.openFilePicker"
    />

    <!-- 主编辑区 -->
    <div class="block-editor-main" @drop="onDrop" @paste="onPaste" @dragover="onDragOver"
      @scroll="handleEditorScroll">
      <EditorContent v-if="editor" :editor="editor" class="block-editor-wrapper" />

      <!-- 上传进度 -->
      <div v-if="isInteractive && imageUpload.isUploading.value" class="upload-overlay">
        <div class="upload-progress">
          <span>正在上传图片…</span>
        </div>
      </div>
    </div>

    <!-- 选中文本气泡工具条 -->
    <BubbleToolbar v-if="isInteractive" :editor="editor ?? null" />

    <!-- 拖拽手柄 -->
    <div v-if="isInteractive && dragHandlePos && !isDragging" class="drag-handle" :style="{
      top: dragHandlePos.top + 'px',
      left: dragHandlePos.left + 'px',
    }" @mousedown.prevent="handleHandleMouseDown" @mouseenter="handleHandleEnter" @mouseleave="handleHandleLeave"
      title="点击打开菜单，拖动调整顺序">
      <span v-if="isTextIcon(hoveredBlockIcon)" class="drag-handle-icon drag-handle-icon--text">{{ textIconMap[hoveredBlockIcon] }}</span>
      <svg v-else class="drag-handle-icon drag-handle-icon--svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="svgIconMap[hoveredBlockIcon] || ''"></svg>
      <span class="drag-handle-grip">⠿</span>
    </div>

    <!-- 拖拽放置指示器 -->
    <div v-if="isInteractive && isDragging && dropIndicator" class="drop-indicator" :style="{
      top: dropIndicator.top + 'px',
      left: dropIndicator.left + 'px',
      width: dropIndicator.width + 'px',
    }"></div>

    <!-- "+" 按钮 -->
    <button v-if="isInteractive && plusButtonPos && !slash.isOpen.value" class="plus-button" :style="{
      top: plusButtonPos.top + 'px',
      left: plusButtonPos.left + 'px',
    }" @click="handlePlusClick" @mouseenter="handleHandleEnter" @mouseleave="handleHandleLeave" title="点击插入内容块">
      +
    </button>

    <!-- 斜杠菜单 (菜单 A) -->
    <Teleport to="body">
      <div v-if="isInteractive && slash.isOpen.value" :style="{
        position: 'fixed',
        top: slashMenuPos.top + 'px',
        left: slashMenuPos.left + 'px',
        zIndex: 1000,
      }">
        <SlashMenu :items="slash.items.value" :selected-index="slash.selectedIndex.value" :is-open="slash.isOpen.value"
          @select="slash.selectItem" />
      </div>
    </Teleport>

    <!-- 侧边菜单 (菜单 B) -->
    <Teleport to="body">
      <SideMenu v-if="isInteractive" :is-open="sideMenu.isOpen.value" :position="sideMenu.position.value"
        :type-items="sideMenu.typeItems.value" :action-items="sideMenu.actionItems.value" @close="sideMenu.close"
        @execute-command="handleSideMenuCommand" @delete-block="() => editor && sideMenu.deleteBlock(editor)"
        @duplicate-block="() => editor && sideMenu.duplicateBlock(editor)" />
    </Teleport>
  </div>
</template>

<style scoped>
.block-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  background: var(--be-bg, #ffffff);
  color: var(--be-text, #1a1a1a);
}

.block-editor-main {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  position: relative;
}

.block-editor-wrapper {
  max-width: 720px;
  margin: 0 auto;
}

.block-editor--reader {
  min-height: 100%;
}

.block-editor--reader .block-editor-main {
  overflow: visible;
  padding: 28px 32px 40px;
}

.block-editor--reader .block-editor-wrapper {
  max-width: 860px;
}

.drag-handle {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 2px;
  height: 28px;
  padding: 0 4px 0 6px;
  border: 1px solid var(--be-border, #e5e7eb);
  background: var(--be-bg, #fff);
  border-radius: 6px;
  cursor: grab;
  color: var(--be-text-secondary, #999);
  opacity: 0;
  transition:
    opacity 0.15s,
    box-shadow 0.15s;
  z-index: 50;
  user-select: none;
}

/* 手柄出现时渐显 */
.drag-handle {
  opacity: 0.75;
}

.drag-handle:hover {
  opacity: 1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  border-color: var(--be-border, #d1d5db);
}

/* 向右扩展透明热区，消除手柄与编辑区之间的鼠标"死区" */
.drag-handle::after {
  content: "";
  position: absolute;
  top: -6px;
  bottom: -6px;
  left: -6px;
  right: -28px;
}

.drag-handle-icon--text {
  font-size: 13px;
  font-weight: 700;
  color: var(--be-text, #1a1a1a);
  line-height: 1;
  min-width: 14px;
  text-align: center;
}

.drag-handle-icon--svg {
  width: 14px;
  height: 14px;
  color: var(--be-text, #1a1a1a);
  flex-shrink: 0;
}

.drag-handle-grip {
  font-size: 12px;
  line-height: 1;
  color: var(--be-text-secondary, #b0b0b0);
  letter-spacing: -1px;
}

/* 拖拽放置指示器 */
.drop-indicator {
  position: fixed;
  height: 3px;
  background: var(--be-primary, #3b82f6);
  border-radius: 2px;
  z-index: 100;
  pointer-events: none;
  transform: translateY(-1.5px);
}

.drop-indicator::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--be-primary, #3b82f6);
}

.plus-button {
  position: fixed;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  font-size: 18px;
  font-weight: 300;
  color: var(--be-text-secondary, #6b7280);
  opacity: 0.4;
  transition:
    opacity 0.15s,
    background 0.15s;
  z-index: 50;
}

.plus-button::after {
  content: "";
  position: absolute;
  top: -6px;
  bottom: -6px;
  left: -6px;
  right: -28px;
}

.plus-button:hover {
  opacity: 1;
  background: var(--be-code-bg, #f3f4f6);
  color: var(--be-primary, #3b82f6);
}

.upload-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  z-index: 100;
}

.upload-progress {
  padding: 12px 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  color: var(--be-text-secondary, #6b7280);
}
</style>
