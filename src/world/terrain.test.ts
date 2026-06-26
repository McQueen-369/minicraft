import { describe, expect, it } from 'vitest'
import { CHUNK_SIZE, WATER_LEVEL, WORLD_HEIGHT } from '../constants'
import { BlockId } from '../core/blocks'
import { localIndex } from '../core/coords'
import { Terrain } from './terrain'

describe('Terrain', () => {
  it('is deterministic for the same seed and differs across seeds', () => {
    const a1 = new Terrain(42)
    const a2 = new Terrain(42)
    const b = new Terrain(43)
    let differs = false
    for (let x = -40; x < 40; x += 3) {
      for (let z = -40; z < 40; z += 3) {
        expect(a1.heightAt(x, z)).toBe(a2.heightAt(x, z))
        if (a1.heightAt(x, z) !== b.heightAt(x, z)) differs = true
      }
    }
    expect(differs).toBe(true)
  })

  it('keeps heights within world bounds', () => {
    const t = new Terrain(7)
    for (let x = -200; x < 200; x += 7) {
      for (let z = -200; z < 200; z += 7) {
        const h = t.heightAt(x, z)
        expect(h).toBeGreaterThanOrEqual(2)
        expect(h).toBeLessThan(WORLD_HEIGHT)
      }
    }
  })

  it('generates chunk data matching generateBlock everywhere, incl. negatives', () => {
    const t = new Terrain(1234)
    for (const [cx, cz] of [
      [0, 0],
      [-1, -1],
      [3, -2],
    ]) {
      const data = t.generateChunkData(cx, cz)
      for (let y = 0; y < WORLD_HEIGHT; y += 1) {
        for (let lz = 0; lz < CHUNK_SIZE; lz += 3) {
          for (let lx = 0; lx < CHUNK_SIZE; lx += 3) {
            const x = cx * CHUNK_SIZE + lx
            const z = cz * CHUNK_SIZE + lz
            expect(data[localIndex(lx, y, lz)]).toBe(t.generateBlock(x, y, z))
          }
        }
      }
    }
  })

  it('puts grass or sand on the surface and stone deep down', () => {
    const t = new Terrain(5)
    const h = t.heightAt(10, 10)
    const surface = t.generateBlock(10, h, 10)
    if (h <= WATER_LEVEL + 1) expect(surface).toBe(BlockId.Sand)
    else expect([BlockId.Grass, BlockId.Sand]).toContain(surface)
    expect(t.generateBlock(10, 1, 10)).toBe(BlockId.Stone)
    expect(t.generateBlock(10, WORLD_HEIGHT - 1, 10)).toBe(BlockId.Air)
  })

  it('grows some trees with trunks and leaves', () => {
    const t = new Terrain(99)
    let trees = 0
    for (let x = -300; x < 300 && trees === 0; x++) {
      for (let z = -300; z < 300; z++) {
        const tree = t.treeAt(x, z)
        if (!tree) continue
        trees++
        const h = t.heightAt(x, z)
        expect(t.generateBlock(x, h + 1, z)).toBe(BlockId.Wood)
        const canopy = t.generateBlock(x, h + tree.trunkHeight + 1, z)
        expect([BlockId.Leaves, BlockId.AppleLeaves]).toContain(canopy)
        break
      }
    }
    expect(trees).toBeGreaterThan(0)
  })
})
