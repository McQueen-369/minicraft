import { describe, expect, it } from 'vitest'
import { boxOverlapsVoxel, stepPhysics, type PhysicsState, type SolidSampler } from './physics'

const floorAt = (h: number): SolidSampler => (_x, y, _z) => y < h

function state(y: number): PhysicsState {
  return { pos: { x: 0.5, y, z: 0.5 }, vel: { x: 0, y: 0, z: 0 }, onGround: false }
}

const idle = { moveX: 0, moveZ: 0, jump: false, fly: false, flyMoveY: 0 }

describe('stepPhysics', () => {
  it('drops onto a floor and lands without tunneling', () => {
    const p = state(20)
    for (let i = 0; i < 400; i++) stepPhysics(p, idle, 1 / 60, floorAt(10))
    expect(p.pos.y).toBeGreaterThanOrEqual(10)
    expect(p.pos.y).toBeLessThan(10.05)
    expect(p.onGround).toBe(true)
    expect(p.vel.y).toBe(0)
  })

  it('does not tunnel through a floor at large dt', () => {
    const p = state(30)
    p.vel.y = -45
    for (let i = 0; i < 100; i++) stepPhysics(p, idle, 0.3, floorAt(10))
    expect(p.pos.y).toBeGreaterThanOrEqual(10)
  })

  it('jumps only from the ground', () => {
    const p = state(10.001)
    stepPhysics(p, idle, 1 / 60, floorAt(10))
    expect(p.onGround).toBe(true)
    stepPhysics(p, { ...idle, jump: true }, 1 / 60, floorAt(10))
    expect(p.vel.y).toBeGreaterThan(0)
    const risingVel = p.vel.y
    stepPhysics(p, { ...idle, jump: true }, 1 / 60, floorAt(10))
    expect(p.vel.y).toBeLessThan(risingVel) // no double jump boost mid-air
  })

  it('is stopped by a wall when walking', () => {
    // Wall occupying x >= 2 at all heights.
    const solid: SolidSampler = (x, y) => y < 10 || x >= 2
    const p = state(10.001)
    for (let i = 0; i < 120; i++) stepPhysics(p, { ...idle, moveX: 5 }, 1 / 60, solid)
    expect(p.pos.x).toBeLessThan(2)
    expect(p.pos.x).toBeGreaterThan(1.5)
  })

  it('paddles upward when swimming and jumping', () => {
    const p = state(15)
    // Sink slowly without input...
    for (let i = 0; i < 60; i++) stepPhysics(p, { ...idle, swim: true }, 1 / 60, floorAt(5))
    expect(p.vel.y).toBeGreaterThanOrEqual(-2.5)
    // ...and rise while holding jump.
    const before = p.pos.y
    for (let i = 0; i < 60; i++) stepPhysics(p, { ...idle, swim: true, jump: true }, 1 / 60, floorAt(5))
    expect(p.pos.y).toBeGreaterThan(before)
  })

  it('flies freely without gravity', () => {
    const p = state(20)
    stepPhysics(p, { ...idle, fly: true, flyMoveY: 5 }, 0.1, floorAt(10))
    expect(p.pos.y).toBeGreaterThan(20)
    expect(p.vel.y).toBe(5)
  })
})

describe('boxOverlapsVoxel', () => {
  it('detects overlap with the voxel at the feet', () => {
    expect(boxOverlapsVoxel({ x: 0.5, y: 10, z: 0.5 }, 0, 10, 0)).toBe(true)
    expect(boxOverlapsVoxel({ x: 0.5, y: 10, z: 0.5 }, 0, 11, 0)).toBe(true)
    expect(boxOverlapsVoxel({ x: 0.5, y: 10, z: 0.5 }, 0, 12, 0)).toBe(false)
    expect(boxOverlapsVoxel({ x: 0.5, y: 10, z: 0.5 }, 2, 10, 0)).toBe(false)
  })
})
