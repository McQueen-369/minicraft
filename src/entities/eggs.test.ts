import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { Terrain } from '../world/terrain'
import { World } from '../world/world'
import { EGG_INTERVAL_DAYS, EntityManager } from './entityManager'

function makeManager(): EntityManager {
  return new EntityManager(new THREE.Scene(), new World(new Terrain(5)))
}

describe('chicken egg laying', () => {
  it('tamed chickens lay an egg every EGG_INTERVAL_DAYS days', () => {
    const em = makeManager()
    const chicken = em.release('chicken', { x: 0, y: 40, z: 0 }, 'me')
    const viewer = { x: 0, y: 40, z: 0 }
    let readyEvents = 0
    em.onEggReady = () => readyEvents++

    em.update(0.016, viewer, new Map(), true, 0)
    expect(chicken.eggReady).toBeFalsy()
    expect(chicken.nextEggDay).toBe(EGG_INTERVAL_DAYS)

    em.update(0.016, viewer, new Map(), true, EGG_INTERVAL_DAYS - 1)
    expect(chicken.eggReady).toBeFalsy()

    em.update(0.016, viewer, new Map(), true, EGG_INTERVAL_DAYS)
    expect(chicken.eggReady).toBe(true)
    expect(readyEvents).toBe(1)

    // Collecting resets the cycle.
    expect(em.collectEgg(chicken.id, EGG_INTERVAL_DAYS)).toBe(true)
    expect(chicken.eggReady).toBe(false)
    expect(chicken.nextEggDay).toBe(EGG_INTERVAL_DAYS * 2)
    expect(em.collectEgg(chicken.id, EGG_INTERVAL_DAYS)).toBe(false)
  })

  it('wild chickens and other animals never lay eggs', () => {
    const em = makeManager()
    const wild = em.release('chicken', { x: 0, y: 40, z: 0 }, null)
    const pig = em.release('pig', { x: 2, y: 40, z: 2 }, 'me')
    for (let day = 0; day <= 10; day++) em.update(0.016, { x: 0, y: 40, z: 0 }, new Map(), true, day)
    expect(wild.eggReady).toBeFalsy()
    expect(pig.eggReady).toBeFalsy()
  })

  it('persists egg state across serialize/load', () => {
    const em = makeManager()
    const chicken = em.release('chicken', { x: 0, y: 40, z: 0 }, 'me')
    em.update(0.016, { x: 0, y: 40, z: 0 }, new Map(), true, 5)
    chicken.eggReady = true
    const data = em.serialize()
    const em2 = makeManager()
    em2.load(data)
    const restored = em2.animals.get(chicken.id)!
    expect(restored.eggReady).toBe(true)
    expect(restored.nextEggDay).toBe(chicken.nextEggDay)
  })
})
