import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import CodeBlockView from './CodeBlockView.vue'

const mermaidMocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(),
}))

vi.mock('mermaid', () => ({
  default: mermaidMocks,
}))

const SVG_FIXTURE = '<svg id="rendered-mermaid" viewBox="0 0 400 200"><rect width="400" height="200" /></svg>'

function createEditor(editable = false) {
  return {
    isEditable: editable,
    on: vi.fn(),
    off: vi.fn(),
    state: {
      selection: { from: 1 },
    },
    view: {
      coordsAtPos: vi.fn(() => ({ top: 0, bottom: 16 })),
    },
  }
}

function mountCodeBlock(language: string, editable = false, source?: string) {
  return mount(CodeBlockView, {
    attachTo: document.body,
    props: {
      node: {
        attrs: { language, fixedHeight: false },
        textContent: source ?? (language === 'mermaid' ? 'graph TD; A-->B' : 'const value = 1'),
        nodeSize: 20,
      },
      updateAttributes: vi.fn(),
      extension: {},
      editor: createEditor(editable) as any,
      getPos: () => 0,
    },
    global: {
      stubs: {
        NodeViewWrapper: {
          props: ['as'],
          template: '<div><slot /></div>',
        },
        NodeViewContent: {
          props: ['as'],
          template: '<code class="cb-code"></code>',
        },
      },
    },
  })
}

async function waitForMermaidRender() {
  await new Promise<void>((resolve) => setTimeout(resolve, 160))
  await flushPromises()
  await nextTick()
}

afterEach(() => {
  mermaidMocks.initialize.mockReset()
  mermaidMocks.render.mockReset()
  document.documentElement.classList.remove('be-mermaid-fullscreen-open')
  document.body.classList.remove('be-mermaid-fullscreen-open')
  document.documentElement.removeAttribute('data-theme')
  document.body.replaceChildren()
})

describe('CodeBlockView Mermaid fullscreen integration', () => {
  it('shows the fullscreen action only after Mermaid SVG rendering succeeds', async () => {
    let finishRender: ((result: { svg: string }) => void) | undefined
    mermaidMocks.render.mockReturnValue(new Promise((resolve) => {
      finishRender = resolve
    }))

    const wrapper = mountCodeBlock('mermaid')
    await waitForMermaidRender()
    expect(wrapper.find('[aria-label="全屏查看 Mermaid 流程图"]').exists()).toBe(false)

    finishRender?.({ svg: SVG_FIXTURE })
    await flushPromises()
    await nextTick()

    expect(wrapper.find('[aria-label="全屏查看 Mermaid 流程图"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('does not expose the fullscreen action for an ordinary code block', async () => {
    const wrapper = mountCodeBlock('typescript')
    await nextTick()

    expect(wrapper.find('[aria-label="全屏查看 Mermaid 流程图"]').exists()).toBe(false)
    expect(mermaidMocks.render).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('does not start a queued Mermaid render after immediate NodeView unmount', async () => {
    mermaidMocks.render.mockResolvedValue({ svg: SVG_FIXTURE })
    const wrapper = mountCodeBlock('mermaid')
    wrapper.unmount()
    await waitForMermaidRender()

    expect(mermaidMocks.render).not.toHaveBeenCalled()
  })

  it('opens the reusable viewer and closes it with Escape', async () => {
    mermaidMocks.render.mockResolvedValue({ svg: SVG_FIXTURE })
    const wrapper = mountCodeBlock('mermaid', true)
    await waitForMermaidRender()

    await wrapper.get('[aria-label="全屏查看 Mermaid 流程图"]').trigger('click')
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    expect(document.body.querySelector('#rendered-mermaid')).not.toBeNull()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()

    wrapper.unmount()
  })

  it('serializes multiple Mermaid renders and assigns unique SVG ids', async () => {
    let finishFirst: ((result: { svg: string }) => void) | undefined
    mermaidMocks.render
      .mockImplementationOnce((id: string, source: string) => new Promise((resolve) => {
        finishFirst = () => resolve({
          svg: `<svg id="${id}" data-source="${source}" viewBox="0 0 400 200"></svg>`,
        })
      }))
      .mockImplementation((id: string, source: string) => Promise.resolve({
        svg: `<svg id="${id}" data-source="${source}" viewBox="0 0 400 200"></svg>`,
      }))

    const first = mountCodeBlock('mermaid', false, 'graph TD; First-->Viewer')
    const second = mountCodeBlock('mermaid', false, 'graph TD; Second-->Viewer')
    await waitForMermaidRender()
    const callsBeforeFirstCompleted = mermaidMocks.render.mock.calls.length

    finishFirst?.({ svg: '' })
    await flushPromises()
    await nextTick()

    const ids = mermaidMocks.render.mock.calls.map(([id]) => id)
    expect(callsBeforeFirstCompleted).toBe(1)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
    expect(first.find('[data-source="graph TD; First-->Viewer"]').exists()).toBe(true)
    expect(second.find('[data-source="graph TD; Second-->Viewer"]').exists()).toBe(true)

    first.unmount()
    second.unmount()
  })

  it('keeps fullscreen open across theme rerender and cleans up on NodeView unmount', async () => {
    mermaidMocks.render.mockImplementation((id: string) => Promise.resolve({
      svg: `<svg id="${id}" viewBox="0 0 400 200"><rect width="400" height="200" /></svg>`,
    }))
    const wrapper = mountCodeBlock('mermaid')
    await waitForMermaidRender()
    await wrapper.get('[aria-label="全屏查看 Mermaid 流程图"]').trigger('click')
    const initialSvgId = document.body.querySelector('.be-mermaid-fullscreen__stage svg')?.id

    document.documentElement.setAttribute('data-theme', 'dark')
    await waitForMermaidRender()
    const updatedSvgId = document.body.querySelector('.be-mermaid-fullscreen__stage svg')?.id

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    expect(updatedSvgId).not.toBe(initialSvgId)
    expect(mermaidMocks.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'dark' }))

    wrapper.unmount()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(document.body.classList.contains('be-mermaid-fullscreen-open')).toBe(false)
  })
})
