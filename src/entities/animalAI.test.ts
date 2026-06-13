import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../core/rng'
import type { SolidSampler } from '../player/physics'
import type { Animal } from './animal'
import { stepAnimal, type AnimalContext } from './animalAI'

const floor: SolidSampler = (_x, y) => y < 10

function pig(): Animal {
  return {
    id: 'p1',
    kind: 'pig',
    pos: { x: 0.5, y: 10.01, z: 0.5 },
    vel: { x: 0, y: 0, z: 0 },
    yaw: 0,
    mode: 'wander',
    owner: null,
    onGround: true,
    decideIn: 0,
    walking: false,
    walkPhase: 0,
  }
}

function ctx(overrides: Partial<AnimalContext> = {}): AnimalContext {
  return { isSolid: floor, ownerPos: null, rand: mulberry32(7), ...overrides }
}

describe('stepAnimal', () => {
  it('is deterministic with a seeded rng', () => {
    const a = pig()
    const b = pig()
    const ca = ctx()
    const cb = ctx()
    for (let i = 0; i < 300; i++) {
      stepAnimal(a, 1 / 30, ca)
      stepAnimal(b, 1 / 30, cb)
    }
    expect(a.pos).toEqual(b.pos)
    expect(a.yaw).toBe(b.yaw)
  })

  it('wanders along the ground without sinking or flying', () => {
    const a = pig()
    const c = ctx()
    for (let i = 0; i < 600; i++) stepAnimal(a, 1 / 30, c)
    expect(a.pos.y).toBeGreaterThanOrEqual(10)
    expect(a.pos.y).toBeLessThan(12)
  })

  it('follows its owner when in follow mode', () => {
    const a = pig()
    a.mode = 'follow'
    a.owner = 'me'
    const c = ctx({ ownerPos: { x: 10.5, y: 10, z: 0.5 } })
    for (let i = 0; i < 600; i++) stepAnimal(a, 1 / 30, c)
    const d = Math.hypot(10.5 - a.pos.x, 0.5 - a.pos.z)
    expect(d).toBeLessThanOrEqual(3)
    expect(d).toBeGreaterThan(1) // stops at a respectful distance
  })

  it('teleports to the owner when left far behind', () => {
    const a = pig()
    a.mode = 'follow'
    const c = ctx({ ownerPos: { x: 100, y: 10, z: 100 } })
    stepAnimal(a, 1 / 30, c)
    expect(a.pos.x).toBe(100)
    expect(a.pos.z).toBe(100)
  })

  it('stays put in stay mode', () => {
    const a = pig()
    a.mode = 'stay'
    const c = ctx({ ownerPos: { x: 10, y: 10, z: 10 } })
    for (let i = 0; i < 100; i++) stepAnimal(a, 1 / 30, c)
    expect(a.pos.x).toBeCloseTo(0.5)
    expect(a.pos.z).toBeCloseTo(0.5)
  })

  it('hops when walking into a wall', () => {
    const wall: SolidSampler = (x, y) => y < 10 || x >= 2
    const a = pig()
    a.mode = 'follow'
    const c = ctx({ ownerPos: { x: 10, y: 10, z: 0.5 } })
    let everJumped = false
    for (let i = 0; i < 200; i++) {
      stepAnimal(a, 1 / 30, { ...c, isSolid: wall })
      if (a.vel.y > 0) everJumped = true
    }
    expect(everJumped).toBe(true)
  })
})
