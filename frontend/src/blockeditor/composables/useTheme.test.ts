import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { useTheme } from './useTheme'

const ThemeConsumer = defineComponent({
  setup() {
    useTheme()
    return () => null
  },
})

async function flushThemeUpdate() {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await nextTick()
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })))
  document.documentElement.setAttribute('data-theme', 'light')
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.removeAttribute('data-theme')
  document.body.className = ''
  document.body.replaceChildren()
})

describe('useTheme multi-instance lifecycle', () => {
  it('updates every editor and keeps observing while one consumer remains', async () => {
    const firstRoot = document.createElement('div')
    firstRoot.className = 'block-editor'
    document.body.appendChild(firstRoot)
    const secondRoot = document.createElement('div')
    secondRoot.className = 'block-editor'
    document.body.appendChild(secondRoot)

    const first = mount(ThemeConsumer, { attachTo: firstRoot })
    const second = mount(ThemeConsumer, { attachTo: secondRoot })
    document.documentElement.setAttribute('data-theme', 'dark')
    await flushThemeUpdate()

    expect(firstRoot.classList.contains('theme-dark')).toBe(true)
    expect(secondRoot.classList.contains('theme-dark')).toBe(true)
    expect(document.body.classList.contains('be-theme-dark')).toBe(true)

    first.unmount()
    document.documentElement.setAttribute('data-theme', 'light')
    await flushThemeUpdate()

    expect(secondRoot.classList.contains('theme-dark')).toBe(false)
    expect(document.body.classList.contains('be-theme-dark')).toBe(false)
    second.unmount()
  })
})
