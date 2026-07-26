type MermaidModule = typeof import('mermaid').default

let mermaidModulePromise: Promise<MermaidModule> | null = null
let mermaidRenderCounter = 0
let mermaidRenderQueue: Promise<void> = Promise.resolve()

function loadMermaid() {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import('mermaid').then((module) => module.default)
  }

  return mermaidModulePromise
}

export function renderMermaidSvg(source: string, theme: 'dark' | 'default'): Promise<string> {
  const renderTask = mermaidRenderQueue.then(async () => {
    const mermaid = await loadMermaid()
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      suppressErrorRendering: true,
      theme,
    })

    const renderId = `xmreader-mermaid-${++mermaidRenderCounter}`
    const { svg } = await mermaid.render(renderId, source)
    return svg
  })

  mermaidRenderQueue = renderTask.then(
    () => undefined,
    () => undefined,
  )

  return renderTask
}
