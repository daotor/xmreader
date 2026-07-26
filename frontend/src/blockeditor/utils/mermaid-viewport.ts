export interface MermaidDiagramSize {
  width: number
  height: number
}

export interface MermaidViewportSize {
  width: number
  height: number
}

export interface MermaidViewportTransform {
  x: number
  y: number
  scale: number
}

export interface MermaidScaleLimits {
  min: number
  max: number
}

const DEFAULT_SCALE_LIMITS: MermaidScaleLimits = {
  min: 0.05,
  max: 8,
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

function readNumericAttribute(element: Element, name: string): number | null {
  const raw = element.getAttribute(name)?.trim()
  if (!raw || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) {
    return null
  }

  const value = Number(raw)
  return isPositiveFinite(value) ? value : null
}

export function readMermaidSvgSize(svg: string): MermaidDiagramSize | null {
  if (!svg.trim()) return null

  const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const root = document.documentElement
  if (root.localName.toLowerCase() !== 'svg' || document.querySelector('parsererror')) {
    return null
  }

  const viewBox = root.getAttribute('viewBox')?.trim()
  if (viewBox) {
    const values = viewBox.split(/[\s,]+/).map(Number)
    if (values.length === 4 && isPositiveFinite(values[2]) && isPositiveFinite(values[3])) {
      return { width: values[2], height: values[3] }
    }
  }

  const width = readNumericAttribute(root, 'width')
  const height = readNumericAttribute(root, 'height')
  return width && height ? { width, height } : null
}

export function calculateMermaidFitTransform(
  diagram: MermaidDiagramSize,
  viewport: MermaidViewportSize,
  padding: number,
  limits: MermaidScaleLimits = DEFAULT_SCALE_LIMITS,
): MermaidViewportTransform {
  const safePadding = Math.max(0, padding)
  const availableWidth = Math.max(0, viewport.width - safePadding * 2)
  const availableHeight = Math.max(0, viewport.height - safePadding * 2)
  const fitScale = Math.min(availableWidth / diagram.width, availableHeight / diagram.height)
  const scale = Math.min(limits.max, Math.max(limits.min, fitScale))

  return {
    x: (viewport.width - diagram.width * scale) / 2,
    y: (viewport.height - diagram.height * scale) / 2,
    scale,
  }
}
