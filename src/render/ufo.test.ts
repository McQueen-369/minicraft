import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { UfoFleet } from './ufo'

describe('UfoFleet', () => {
  it('puts saucers in the sky and keeps them there as the player moves', () => {
    const scene = new THREE.Scene()
    const fleet = new UfoFleet(scene, 123, 2)
    const root = scene.children[0] as THREE.Group
    expect(root.children).toHaveLength(2)

    fleet.update(0.016, 0, 0)
    for (const saucer of root.children) {
      expect(saucer.position.y).toBeGreaterThan(50) // well above the tree line
    }
    // The fleet follows the player, so it is always somewhere overhead.
    fleet.update(0.016, 400, -250)
    expect(root.position.x).toBe(400)
    expect(root.position.z).toBe(-250)
  })

  it('animates its lamps and beam, then cleans up after itself', () => {
    const scene = new THREE.Scene()
    const fleet = new UfoFleet(scene, 7, 1)
    const root = scene.children[0] as THREE.Group
    const saucer = root.children[0] as THREE.Group
    const before = saucer.position.clone()

    for (let i = 0; i < 120; i++) fleet.update(1 / 30, 0, 0)
    expect(saucer.position.distanceTo(before)).toBeGreaterThan(0.5) // it flies

    fleet.dispose()
    expect(scene.children).toHaveLength(0)
  })
})
