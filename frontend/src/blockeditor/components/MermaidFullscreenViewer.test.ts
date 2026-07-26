import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { select } from 'd3-selection'
import MermaidFullscreenViewer from './MermaidFullscreenViewer.vue'

const SVG_FIXTURE = '<svg id="diagram" viewBox="0 0 400 200"><rect width="400" height="200" /></svg>'

function setViewportRect(width = 800, height = 600) {
  return vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if ((this as HTMLElement).classList.contains('be-mermaid-fullscreen__viewport')) {
      return {
        width,
        height,
        top: 0,
        right: width,
        bottom: height,
        left: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }
    }

    return {
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }
  })
}

async function waitForAnimationFrame() {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await nextTick()
}

afterEach(() => {
  document.documentElement.classList.remove('be-mermaid-fullscreen-open')
  document.body.classList.remove('be-mermaid-fullscreen-open')
  document.body.replaceChildren()
})

describe('MermaidFullscreenViewer', () => {
  it('teleports a modal dialog and reuses the supplied SVG', async () => {
    setViewportRect()
    const wrapper = mount(MermaidFullscreenViewer, {
      attachTo: document.body,
      props: { svg: SVG_FIXTURE, title: '架构图' },
    })

    await waitForAnimationFrame()

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(dialog?.querySelector('h2')?.textContent).toBe('架构图')
    expect(dialog?.querySelector('#diagram')).not.toBeNull()
    expect(getComputedStyle(dialog!).zIndex).toBe('2000')

    wrapper.unmount()
  })

  it('emits close from the toolbar button and Escape', async () => {
    setViewportRect()
    const wrapper = mount(MermaidFullscreenViewer, {
      attachTo: document.body,
      props: { svg: SVG_FIXTURE },
    })
    await waitForAnimationFrame()

    document.body.querySelector<HTMLButtonElement>('[aria-label="退出全屏"]')?.click()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(wrapper.emitted('close')).toHaveLength(2)
    wrapper.unmount()
  })

  it('handles global keys only in the topmost viewer', async () => {
    setViewportRect()
    const first = mount(MermaidFullscreenViewer, {
      attachTo: document.body,
      props: { svg: SVG_FIXTURE, title: 'first' },
    })
    const second = mount(MermaidFullscreenViewer, {
      attachTo: document.body,
      props: { svg: SVG_FIXTURE, title: 'second' },
    })
    await waitForAnimationFrame()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(first.emitted('close')).toBeUndefined()
    expect(second.emitted('close')).toHaveLength(1)

    second.unmount()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(first.emitted('close')).toHaveLength(1)
    first.unmount()
  })

  it('keeps reverse and forward tab navigation inside the dialog', async () => {
    setViewportRect()
    const wrapper = mount(MermaidFullscreenViewer, {
      attachTo: document.body,
      props: { svg: SVG_FIXTURE },
    })
    await waitForAnimationFrame()

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')
    const first = document.body.querySelector<HTMLButtonElement>('[aria-label="缩小流程图"]')
    const last = document.body.querySelector<HTMLButtonElement>('[aria-label="退出全屏"]')
    dialog?.focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    expect(document.activeElement).toBe(last)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(first)
    wrapper.unmount()
  })

  it('locks document scrolling while mounted and restores focus on unmount', async () => {
    setViewportRect()
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()

    const wrapper = mount(MermaidFullscreenViewer, {
      attachTo: document.body,
      props: { svg: SVG_FIXTURE },
    })
    await waitForAnimationFrame()

    expect(document.documentElement.classList.contains('be-mermaid-fullscreen-open')).toBe(true)
    expect(document.body.classList.contains('be-mermaid-fullscreen-open')).toBe(true)
    expect(document.activeElement?.getAttribute('role')).toBe('dialog')

    wrapper.unmount()

    expect(document.documentElement.classList.contains('be-mermaid-fullscreen-open')).toBe(false)
    expect(document.body.classList.contains('be-mermaid-fullscreen-open')).toBe(false)
    expect(document.activeElement).toBe(opener)
  })

  it('keeps document scrolling locked until the last viewer unmounts', async () => {
    setViewportRect()
    const first = mount(MermaidFullscreenViewer, {
      attachTo: document.body,
      props: { svg: SVG_FIXTURE, title: 'first' },
    })
    const second = mount(MermaidFullscreenViewer, {
      attachTo: document.body,
      props: { svg: SVG_FIXTURE, title: 'second' },
    })
    await waitForAnimationFrame()

    first.unmount()
    expect(document.documentElement.classList.contains('be-mermaid-fullscreen-open')).toBe(true)
    expect(document.body.classList.contains('be-mermaid-fullscreen-open')).toBe(true)

    second.unmount()
    expect(document.documentElement.classList.contains('be-mermaid-fullscreen-open')).toBe(false)
    expect(document.body.classList.contains('be-mermaid-fullscreen-open')).toBe(false)
  })

  it('fits the diagram and updates zoom percentage through toolbar controls', async () => {
    setViewportRect()
    const wrapper = mount(MermaidFullscreenViewer, {
      attachTo: document.body,
      props: { svg: SVG_FIXTURE },
    })
    await waitForAnimationFrame()

    const stage = document.body.querySelector<HTMLElement>('.be-mermaid-fullscreen__stage')
    const zoomValue = document.body.querySelector<HTMLElement>('.be-mermaid-fullscreen__zoom-value')
    expect(stage?.style.transform).toBe('translate(48px, 124px) scale(1.76)')
    expect(zoomValue?.textContent).toBe('176%')

    document.body.querySelector<HTMLButtonElement>('[aria-label="放大流程图"]')?.click()
    await nextTick()
    expect(zoomValue?.textContent).toBe('211%')

    document.body.querySelector<HTMLButtonElement>('[aria-label="缩小流程图"]')?.click()
    await nextTick()
    expect(zoomValue?.textContent).toBe('176%')

    wrapper.unmount()
  })

  it('recalculates fit when the reused SVG changes', async () => {
    setViewportRect()
    const wrapper = mount(MermaidFullscreenViewer, {
      attachTo: document.body,
      props: { svg: SVG_FIXTURE },
    })
    await waitForAnimationFrame()

    await wrapper.setProps({
      svg: '<svg id="updated-diagram" viewBox="0 0 200 400"><rect width="200" height="400" /></svg>',
    })
    await waitForAnimationFrame()

    const stage = document.body.querySelector<HTMLElement>('.be-mermaid-fullscreen__stage')
    expect(document.body.querySelector('#updated-diagram')).not.toBeNull()
    expect(stage?.style.transform).toBe('translate(274px, 48px) scale(1.26)')
    wrapper.unmount()
  })

  it('uses grabbing state only while a left-button drag is active', async () => {
    setViewportRect()
    const wrapper = mount(MermaidFullscreenViewer, {
      attachTo: document.body,
      props: { svg: SVG_FIXTURE },
    })
    await waitForAnimationFrame()

    const viewport = document.body.querySelector<HTMLElement>('.be-mermaid-fullscreen__viewport')
    const eventWindow = viewport?.ownerDocument.defaultView
    const mouseDown = new eventWindow!.MouseEvent('mousedown', {
      bubbles: true,
      button: 0,
      clientX: 100,
      clientY: 100,
    })
    Object.defineProperty(mouseDown, 'view', { value: eventWindow })
    viewport?.dispatchEvent(mouseDown)
    await nextTick()
    expect(viewport?.classList.contains('is-dragging')).toBe(true)
    expect(select(eventWindow!).on('mousemove.zoom')).toBeTypeOf('function')

    const mouseUp = new eventWindow!.MouseEvent('mouseup', {
      bubbles: true,
      button: 0,
      clientX: 120,
      clientY: 120,
    })
    Object.defineProperty(mouseUp, 'view', { value: eventWindow })
    eventWindow?.dispatchEvent(mouseUp)
    await nextTick()
    expect(viewport?.classList.contains('is-dragging')).toBe(false)
    expect(select(eventWindow!).on('mousemove.zoom')).toBeUndefined()
    wrapper.unmount()
  })

  it('removes active D3 window handlers when unmounted during a drag', async () => {
    setViewportRect()
    const wrapper = mount(MermaidFullscreenViewer, {
      attachTo: document.body,
      props: { svg: SVG_FIXTURE },
    })
    await waitForAnimationFrame()

    const viewport = document.body.querySelector<HTMLElement>('.be-mermaid-fullscreen__viewport')!
    const eventWindow = viewport.ownerDocument.defaultView!
    const mouseDown = new eventWindow.MouseEvent('mousedown', {
      bubbles: true,
      button: 0,
      clientX: 100,
      clientY: 100,
    })
    Object.defineProperty(mouseDown, 'view', { value: eventWindow })
    viewport.dispatchEvent(mouseDown)
    await nextTick()
    expect(select(eventWindow).on('mousemove.zoom')).toBeTypeOf('function')

    wrapper.unmount()
    expect(select(eventWindow).on('mousemove.zoom')).toBeUndefined()
  })

  it('does not schedule a fit frame after immediate unmount', async () => {
    setViewportRect()
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame')
    const wrapper = mount(MermaidFullscreenViewer, {
      attachTo: document.body,
      props: { svg: SVG_FIXTURE },
    })
    wrapper.unmount()
    await nextTick()

    expect(requestFrame).not.toHaveBeenCalled()
  })
})
