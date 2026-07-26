import { describe, expect, it } from 'vitest'
import { edgePoint, fitView, projectPoint } from './minimap'

describe('fitView', () => {
  it('centres on the points and grows to hold the widest span', () => {
    const view = fitView([{ x: 0, z: 0 }, { x: 300, z: -200 }], 110, 1.3, 40)
    expect(view.cx).toBe(150)
    expect(view.cz).toBe(-100)
    // Widest span is 300 blocks → half 150, padded to 195, snapped up to 200.
    expect(view.half).toBe(200)
  })

  it('never zooms tighter than the minimum half-extent', () => {
    const view = fitView([{ x: 10, z: 10 }, { x: 12, z: 8 }], 110, 1.3, 40)
    expect(view.half).toBe(110)
  })

  it('keeps every point inside the canvas, however far apart they are', () => {
    const points = [
      { x: -12, z: 640 },
      { x: 415, z: -388 },
      { x: 0, z: 0 },
    ]
    const view = fitView(points)
    for (const p of points) {
      const { sx, sy, inside } = projectPoint(p, view, 660, 24)
      expect(inside).toBe(true)
      expect(sx).toBeGreaterThan(0)
      expect(sy).toBeGreaterThan(0)
    }
  })
})

describe('projectPoint', () => {
  const view = { cx: 0, cz: 0, half: 100 }

  it('puts the view centre in the middle of the canvas', () => {
    expect(projectPoint({ x: 0, z: 0 }, view, 200)).toMatchObject({ sx: 100, sy: 100, inside: true })
  })

  it('scales world blocks to pixels linearly', () => {
    expect(projectPoint({ x: 50, z: -25 }, view, 200).sx).toBe(150)
    expect(projectPoint({ x: 50, z: -25 }, view, 200).sy).toBe(75)
  })

  it('reports off-canvas points as outside rather than clamping them', () => {
    const p = projectPoint({ x: 900, z: 0 }, view, 200)
    expect(p.inside).toBe(false)
    expect(p.sx).toBe(1000) // the true (off-canvas) coordinate, not the border
  })

  it('treats points inside the margin band as outside', () => {
    expect(projectPoint({ x: 98, z: 0 }, view, 200, 10).inside).toBe(false)
    expect(projectPoint({ x: 80, z: 0 }, view, 200, 10).inside).toBe(true)
  })
})

describe('edgePoint', () => {
  it('lands on the inset border along the direction of the target', () => {
    const e = edgePoint(1000, 100, 200, 10) // due east of centre
    expect(e.x).toBeCloseTo(190)
    expect(e.y).toBeCloseTo(100)
    expect(e.angle).toBeCloseTo(0)
  })

  it('keeps diagonals on the border, not past the corner', () => {
    const e = edgePoint(400, 300, 200, 10)
    expect(Math.max(Math.abs(e.x - 100), Math.abs(e.y - 100))).toBeCloseTo(90)
    expect(e.angle).toBeCloseTo(Math.atan2(200, 300))
  })
})
