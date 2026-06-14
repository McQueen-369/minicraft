import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { DecorationManager } from './decorations'
import { Terrain } from '../world/terrain'
import { World } from '../world/world'

describe('DecorationManager', () => {
  it('spawns a fixed flock of butterflies and keeps it stable', () => {
    const scene = new THREE.Scene()
    const world = new World(new Terrain(123))
    const deco = new DecorationManager(scene, 123)
    const viewer = { x: 0, y: 40, z: 0 }

    deco.update(world, viewer, 0.5)
    const after = scene.children.length
    expect(after).toBeGreaterThanOrEqual(8) // 8 butterflies (+ any flowers)

    // A second tick does not keep adding butterflies unboundedly.
    deco.update(world, viewer, 0.1)
    expect(scene.children.length).toBeLessThanOrEqual(after + 4)
  })
})
