const SCROLL_LOCK_CLASS = 'be-mermaid-fullscreen-open'

let activeLocks = 0
const activeLayers: symbol[] = []

export interface MermaidFullscreenLayerRegistration {
  isTopmost: () => boolean
  release: () => void
}

export function acquireMermaidFullscreenScrollLock(): () => void {
  let released = false
  activeLocks += 1

  if (activeLocks === 1) {
    document.documentElement.classList.add(SCROLL_LOCK_CLASS)
    document.body.classList.add(SCROLL_LOCK_CLASS)
  }

  return () => {
    if (released) return
    released = true
    activeLocks = Math.max(0, activeLocks - 1)

    if (activeLocks === 0) {
      document.documentElement.classList.remove(SCROLL_LOCK_CLASS)
      document.body.classList.remove(SCROLL_LOCK_CLASS)
    }
  }
}

export function registerMermaidFullscreenLayer(): MermaidFullscreenLayerRegistration {
  const token = Symbol('mermaid-fullscreen-layer')
  let released = false
  activeLayers.push(token)

  return {
    isTopmost: () => activeLayers[activeLayers.length - 1] === token,
    release: () => {
      if (released) return
      released = true
      const index = activeLayers.lastIndexOf(token)
      if (index >= 0) {
        activeLayers.splice(index, 1)
      }
    },
  }
}
