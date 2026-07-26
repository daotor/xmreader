import { describe, expect, it } from 'vitest'
import {
  calculateMermaidFitTransform,
  readMermaidSvgSize,
} from './mermaid-viewport'

describe('readMermaidSvgSize', () => {
  it('uses a valid viewBox before width and height attributes', () => {
    const svg = '<svg viewBox="10 20 1200 600" width="300" height="150"></svg>'

    expect(readMermaidSvgSize(svg)).toEqual({ width: 1200, height: 600 })
  })

  it('falls back to numeric width and height attributes', () => {
    const svg = '<svg width="640" height="480"></svg>'

    expect(readMermaidSvgSize(svg)).toEqual({ width: 640, height: 480 })
  })

  it.each([
    '',
    '<div></div>',
    '<svg viewBox="0 0 0 100"></svg>',
    '<svg width="100%" height="480"></svg>',
  ])('returns null for SVG without positive intrinsic dimensions', (svg) => {
    expect(readMermaidSvgSize(svg)).toBeNull()
  })
})

describe('calculateMermaidFitTransform', () => {
  it('fits and centers a landscape diagram', () => {
    expect(calculateMermaidFitTransform(
      { width: 1000, height: 500 },
      { width: 800, height: 600 },
      50,
    )).toEqual({ x: 50, y: 125, scale: 0.7 })
  })

  it('fits and centers a portrait diagram', () => {
    expect(calculateMermaidFitTransform(
      { width: 500, height: 1000 },
      { width: 800, height: 600 },
      50,
    )).toEqual({ x: 275, y: 50, scale: 0.5 })
  })

  it('clamps an oversized fit scale to the configured maximum', () => {
    expect(calculateMermaidFitTransform(
      { width: 10, height: 10 },
      { width: 1000, height: 800 },
      40,
      { min: 0.05, max: 8 },
    )).toEqual({ x: 460, y: 360, scale: 8 })
  })

  it('clamps an undersized fit scale to the configured minimum', () => {
    expect(calculateMermaidFitTransform(
      { width: 100000, height: 100000 },
      { width: 100, height: 100 },
      10,
      { min: 0.05, max: 8 },
    )).toEqual({ x: -2450, y: -2450, scale: 0.05 })
  })
})
