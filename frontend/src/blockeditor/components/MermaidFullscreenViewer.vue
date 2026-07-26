<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { select, type Selection } from 'd3-selection'
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from 'd3-zoom'
import {
  calculateMermaidFitTransform,
  readMermaidSvgSize,
  type MermaidDiagramSize,
  type MermaidViewportTransform,
} from '../utils/mermaid-viewport'
import {
  acquireMermaidFullscreenScrollLock,
  registerMermaidFullscreenLayer,
  type MermaidFullscreenLayerRegistration,
} from '../utils/mermaid-fullscreen-lock'

const props = withDefaults(defineProps<{
  svg: string
  title?: string
}>(), {
  title: 'Mermaid 流程图',
})

const emit = defineEmits<{
  close: []
}>()

const MIN_SCALE = 0.05
const MAX_SCALE = 8
const FIT_PADDING = 48
const ZOOM_STEP = 1.2
const FULLSCREEN_Z_INDEX = 2000

const dialogRef = ref<HTMLElement | null>(null)
const viewportRef = ref<HTMLElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const diagramSize = ref<MermaidDiagramSize | null>(readMermaidSvgSize(props.svg))
const transform = ref<MermaidViewportTransform>({ x: 0, y: 0, scale: 1 })
const isDragging = ref(false)

const zoomPercent = computed(() => `${Math.round(transform.value.scale * 100)}%`)
const stageStyle = computed(() => {
  const size = diagramSize.value
  return {
    width: size ? `${size.width}px` : '0px',
    height: size ? `${size.height}px` : '0px',
    transform: `translate(${transform.value.x}px, ${transform.value.y}px) scale(${transform.value.scale})`,
  }
})

let zoomBehavior: ZoomBehavior<HTMLElement, unknown> | null = null
let viewportSelection: Selection<HTMLElement, unknown, null, undefined> | null = null
let resizeObserver: ResizeObserver | null = null
let fitFrame: number | null = null
let previouslyFocusedElement: HTMLElement | null = null
let releaseScrollLock: (() => void) | null = null
let layerRegistration: MermaidFullscreenLayerRegistration | null = null
let isDisposed = false

function getViewportSize() {
  const rect = viewportRef.value?.getBoundingClientRect()
  return {
    width: rect?.width ?? 0,
    height: rect?.height ?? 0,
  }
}

function updateTransform(event: D3ZoomEvent<HTMLElement, unknown>) {
  transform.value = {
    x: event.transform.x,
    y: event.transform.y,
    scale: event.transform.k,
  }
}

function initializeZoom() {
  const viewport = viewportRef.value
  if (!viewport) return

  viewportSelection = select<HTMLElement, unknown>(viewport)
  zoomBehavior = zoom<HTMLElement, unknown>()
    .extent(() => {
      const size = getViewportSize()
      return [[0, 0], [size.width, size.height]] as [[number, number], [number, number]]
    })
    .scaleExtent([MIN_SCALE, MAX_SCALE])
    .filter((event: Event) => {
      if (event.type === 'wheel') return true
      return event.type === 'mousedown' && (event as MouseEvent).button === 0
    })
    .on('start', (event: D3ZoomEvent<HTMLElement, unknown>) => {
      if (event.sourceEvent?.type === 'mousedown') {
        isDragging.value = true
      }
    })
    .on('zoom', updateTransform)
    .on('end', () => {
      isDragging.value = false
    })

  viewportSelection.call(zoomBehavior)
  viewportSelection.on('dblclick.zoom', null)
}

function fitDiagram() {
  if (!zoomBehavior || !viewportSelection || !diagramSize.value) return

  const viewport = getViewportSize()
  if (viewport.width <= 0 || viewport.height <= 0) return

  const nextTransform = calculateMermaidFitTransform(
    diagramSize.value,
    viewport,
    FIT_PADDING,
    { min: MIN_SCALE, max: MAX_SCALE },
  )

  viewportSelection.call(
    zoomBehavior.transform,
    zoomIdentity
      .translate(nextTransform.x, nextTransform.y)
      .scale(nextTransform.scale),
  )
}

function scheduleFit() {
  if (isDisposed) return
  if (fitFrame !== null) {
    cancelAnimationFrame(fitFrame)
  }

  void nextTick(() => {
    if (isDisposed) return
    fitFrame = requestAnimationFrame(() => {
      fitFrame = null
      if (isDisposed) return
      fitDiagram()
    })
  })
}

function zoomBy(factor: number) {
  if (!zoomBehavior || !viewportSelection) return
  const viewport = getViewportSize()
  viewportSelection.call(
    zoomBehavior.scaleBy,
    factor,
    [viewport.width / 2, viewport.height / 2],
  )
}

function close() {
  emit('close')
}

function getFocusableElements(): HTMLElement[] {
  if (!dialogRef.value) return []
  return Array.from(dialogRef.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
  ))
}

function trapFocus(event: KeyboardEvent) {
  const focusable = getFocusableElements()
  if (focusable.length === 0) {
    event.preventDefault()
    dialogRef.value?.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const activeElement = document.activeElement
  if (!dialogRef.value?.contains(activeElement) || activeElement === dialogRef.value) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
    return
  }
  if (event.shiftKey && activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (!layerRegistration?.isTopmost()) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopImmediatePropagation()
    close()
  } else if (event.key === 'Tab') {
    trapFocus(event)
  }
}

function handleWindowResize() {
  scheduleFit()
}

watch(() => props.svg, (svg) => {
  diagramSize.value = readMermaidSvgSize(svg)
  scheduleFit()
})

onMounted(() => {
  isDisposed = false
  previouslyFocusedElement = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null

  releaseScrollLock = acquireMermaidFullscreenScrollLock()
  layerRegistration = registerMermaidFullscreenLayer()
  window.addEventListener('keydown', handleKeydown, true)
  window.addEventListener('resize', handleWindowResize)

  initializeZoom()
  const viewport = viewportRef.value
  if (viewport && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(scheduleFit)
    resizeObserver.observe(viewport)
  }

  dialogRef.value?.focus()
  scheduleFit()
})

onBeforeUnmount(() => {
  isDisposed = true
  if (fitFrame !== null) {
    cancelAnimationFrame(fitFrame)
    fitFrame = null
  }

  resizeObserver?.disconnect()
  viewportSelection?.on('.zoom', null)
  if (isDragging.value) {
    select(window).on('.zoom', null)
  }
  window.removeEventListener('keydown', handleKeydown, true)
  window.removeEventListener('resize', handleWindowResize)
  releaseScrollLock?.()
  releaseScrollLock = null
  layerRegistration?.release()
  layerRegistration = null
  isDragging.value = false
  if (previouslyFocusedElement?.isConnected) {
    previouslyFocusedElement.focus()
  }
})
</script>

<template>
  <Teleport to="body">
    <section
      ref="dialogRef"
      class="be-mermaid-fullscreen"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      :style="{ zIndex: FULLSCREEN_Z_INDEX }"
      tabindex="-1"
    >
      <header class="be-mermaid-fullscreen__toolbar">
        <h2>{{ title }}</h2>
        <div class="be-mermaid-fullscreen__controls">
          <button type="button" aria-label="缩小流程图" title="缩小" @click="zoomBy(1 / ZOOM_STEP)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg>
          </button>
          <output class="be-mermaid-fullscreen__zoom-value" aria-label="当前缩放比例">{{ zoomPercent }}</output>
          <button type="button" aria-label="放大流程图" title="放大" @click="zoomBy(ZOOM_STEP)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          <button type="button" aria-label="适合窗口" title="适合窗口" @click="fitDiagram">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
            </svg>
          </button>
          <span class="be-mermaid-fullscreen__divider" aria-hidden="true" />
          <button type="button" aria-label="退出全屏" title="退出全屏" @click="close">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </header>

      <div
        ref="viewportRef"
        class="be-mermaid-fullscreen__viewport"
        :class="{ 'is-dragging': isDragging }"
        @contextmenu.prevent
      >
        <div v-if="diagramSize" ref="stageRef" class="be-mermaid-fullscreen__stage" :style="stageStyle" v-html="svg" />
        <div v-else class="be-mermaid-fullscreen__error" role="alert">无法读取流程图尺寸</div>
      </div>
    </section>
  </Teleport>
</template>

<style scoped>
:global(html.be-mermaid-fullscreen-open),
:global(body.be-mermaid-fullscreen-open) {
  overflow: hidden !important;
}

.be-mermaid-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  grid-template-rows: 52px minmax(0, 1fr);
  width: 100vw;
  height: 100vh;
  color: var(--be-text, #1f2937);
  background: var(--be-bg, #fff);
  outline: none;
}

.be-mermaid-fullscreen__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding: 0 12px 0 18px;
  border-bottom: 1px solid var(--be-border, #d9dde4);
  background: var(--be-toolbar-bg, #f7f8fa);
}

.be-mermaid-fullscreen__toolbar h2 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--be-text, #1f2937);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.be-mermaid-fullscreen__controls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.be-mermaid-fullscreen__controls button {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 5px;
  color: var(--be-text-secondary, #667085);
  background: transparent;
  cursor: pointer;
}

.be-mermaid-fullscreen__controls button:hover {
  border-color: var(--be-border, #d9dde4);
  color: var(--be-text, #1f2937);
  background: var(--be-hover-bg, #eceff3);
}

.be-mermaid-fullscreen__controls button:focus-visible {
  border-color: var(--be-primary, #2563eb);
  outline: 2px solid color-mix(in srgb, var(--be-primary, #2563eb) 32%, transparent);
  outline-offset: 1px;
}

.be-mermaid-fullscreen__controls svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.be-mermaid-fullscreen__zoom-value {
  width: 48px;
  color: var(--be-text-secondary, #667085);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.be-mermaid-fullscreen__divider {
  width: 1px;
  height: 22px;
  margin: 0 3px;
  background: var(--be-border, #d9dde4);
}

.be-mermaid-fullscreen__viewport {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--be-code-body-bg, #f1f3f5);
  cursor: grab;
  touch-action: none;
  overscroll-behavior: contain;
  user-select: none;
}

.be-mermaid-fullscreen__viewport.is-dragging {
  cursor: grabbing;
}

.be-mermaid-fullscreen__stage {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  will-change: transform;
}

.be-mermaid-fullscreen__stage :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
}

.be-mermaid-fullscreen__error {
  position: absolute;
  top: 50%;
  left: 50%;
  padding: 10px 14px;
  border: 1px solid rgba(220, 38, 38, 0.28);
  border-radius: 6px;
  color: #b42318;
  background: rgba(254, 226, 226, 0.92);
  font-size: 13px;
  transform: translate(-50%, -50%);
}

@media (max-width: 640px) {
  .be-mermaid-fullscreen {
    grid-template-rows: 48px minmax(0, 1fr);
  }

  .be-mermaid-fullscreen__toolbar {
    padding: 0 6px 0 12px;
  }

  .be-mermaid-fullscreen__controls {
    gap: 1px;
  }

  .be-mermaid-fullscreen__controls button {
    width: 32px;
    height: 32px;
  }

  .be-mermaid-fullscreen__zoom-value {
    width: 42px;
  }

  .be-mermaid-fullscreen__divider {
    margin: 0 1px;
  }
}
</style>
