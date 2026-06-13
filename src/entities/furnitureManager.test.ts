import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { FurnitureManager } from './furnitureManager'

function manager(): FurnitureManager {
  return new FurnitureManager(new THREE.Scene())
}

describe('FurnitureManager', () => {
  it('places, reports occupancy, and removes furniture', () => {
    const fm = manager()
    const f = fm.place('chair', 2, 30, 5, 0)
    expect(fm.items.size).toBe(1)
    expect(fm.occupied(2, 30, 5)).toBe(true)
    expect(fm.occupied(3, 30, 5)).toBe(false)
    fm.remove(f.id)
    expect(fm.items.size).toBe(0)
  })

  it('toggles only doors', () => {
    const fm = manager()
    const door = fm.place('door', 0, 0, 0, 0)
    const chair = fm.place('chair', 1, 0, 0, 0)
    expect(fm.toggleDoor(door.id)).toBe(true)
    expect(fm.items.get(door.id)!.open).toBe(true)
    expect(fm.toggleDoor(chair.id)).toBe(false)
  })

  it('raycasts the nearest furniture', () => {
    const fm = manager()
    const f = fm.place('desk', 0, 0, 0, 0)
    const hit = fm.raycast(new THREE.Vector3(0.5, 0.5, -3), new THREE.Vector3(0, 0, 1), 6)
    expect(hit?.furniture.id).toBe(f.id)
    const miss = fm.raycast(new THREE.Vector3(20, 0.5, -3), new THREE.Vector3(0, 0, 1), 6)
    expect(miss).toBeNull()
  })

  it('round-trips through serialize / load', () => {
    const fm = manager()
    fm.place('bed', 1, 2, 3, Math.PI)
    fm.place('sofa', 4, 5, 6, 0)
    const data = fm.serialize()
    const fm2 = manager()
    fm2.load(data)
    expect(fm2.items.size).toBe(2)
    expect([...fm2.items.values()].map((f) => f.kind).sort()).toEqual(['bed', 'sofa'])
  })
})
