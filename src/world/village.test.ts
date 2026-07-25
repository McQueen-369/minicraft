import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { WATER_LEVEL } from '../constants'
import { BlockId, isSolid } from '../core/blocks'
import { chunkKey } from '../core/coords'
import { EntityManager } from '../entities/entityManager'
import { FurnitureManager } from '../entities/furnitureManager'
import { Terrain } from './terrain'
import {
  buildVillage,
  HOUSE_HD,
  HOUSE_HW,
  HOUSES,
  MARKET,
  villageAnchorForChunk,
  villageSite,
  type VillageSite,
} from './village'
import { World } from './world'

const SEARCH = 34

/** First village anchor within the search radius whose site matches a filter. */
function findVillage(seed: number, accept: (t: Terrain, site: VillageSite) => boolean): { cx: number; cz: number } {
  const terrain = new Terrain(seed)
  for (let cz = -SEARCH; cz <= SEARCH; cz++) {
    for (let cx = -SEARCH; cx <= SEARCH; cx++) {
      if (!villageAnchorForChunk(seed, cx, cz)) continue
      if (accept(terrain, villageSite(terrain, cx, cz))) return { cx, cz }
    }
  }
  throw new Error(`no matching village for seed ${seed}`)
}

/** How far the natural ground falls below the village floor across the site. */
function maxDropUnder(terrain: Terrain, site: VillageSite): number {
  let drop = 0
  for (let x = site.x0; x <= site.x1; x++) {
    for (let z = site.z0; z <= site.z1; z++) {
      if (!site.inside(x, z)) continue
      drop = Math.max(drop, site.floorY - terrain.heightAt(x, z))
    }
  }
  return drop
}

function stamp(seed: number, cx: number, cz: number, preloadChunks = false) {
  const world = new World(new Terrain(seed))
  const furniture = new FurnitureManager(new THREE.Scene())
  const entities = new EntityManager(new THREE.Scene(), world)
  if (preloadChunks) {
    // Mimic the runtime: neighbouring chunks are often already generated when
    // the anchor chunk arrives and triggers the build.
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) world.ensureChunk(cx + dx, cz + dz)
  }
  buildVillage(world, furniture, entities, cx, cz)
  return { world, furniture, entities, site: villageSite(world.terrain, cx, cz) }
}

/** Every column of the village that has a surface, checked for air underneath. */
function floatingColumns(world: World, site: VillageSite): string[] {
  const bad: string[] = []
  for (let x = site.x0; x <= site.x1; x++) {
    for (let z = site.z0; z <= site.z1; z++) {
      const top = world.getBlock(x, site.floorY, z)
      if (top === BlockId.Air) continue
      // Tree canopies outside the village legitimately overhang open air.
      if (top === BlockId.Leaves || top === BlockId.AppleLeaves) continue
      for (let y = world.terrain.heightAt(x, z) + 1; y < site.floorY; y++) {
        if (!isSolid(world.getBlock(x, y, z))) bad.push(`${x},${y},${z}`)
      }
    }
  }
  return bad
}

describe('village siting', () => {
  it('places every village building inside the levelled footprint', () => {
    const site = villageSite(new Terrain(7), 0, 0)
    for (const { ox, oz } of HOUSES) {
      for (const x of [ox - HOUSE_HW, ox + HOUSE_HW]) {
        for (const z of [oz - HOUSE_HD, oz + HOUSE_HD]) {
          expect(site.inside(site.sx + x, site.sz + z)).toBe(true)
          expect(site.sx + x).toBeGreaterThanOrEqual(site.x0)
          expect(site.sx + x).toBeLessThanOrEqual(site.x1)
        }
      }
    }
    expect(site.inside(site.sx + MARKET.ox, site.sz + MARKET.oz)).toBe(true)
  })
})

describe('buildVillage grounding', () => {
  it('leaves no air under a village built on uneven ground', () => {
    // Pick a village whose site spans a real slope, so the fill actually works.
    const { cx, cz } = findVillage(4242, (t, s) => maxDropUnder(t, s) >= 4)
    const { world, site } = stamp(4242, cx, cz)
    expect(floatingColumns(world, site)).toEqual([])
  })

  it('packs the embankment under a village raised above the waterline', () => {
    const { cx, cz } = findVillage(1337, (t, s) => t.heightAt(s.sx, s.sz) < WATER_LEVEL + 1)
    const { world, site } = stamp(1337, cx, cz)
    expect(site.floorY).toBe(WATER_LEVEL + 1)
    expect(floatingColumns(world, site)).toEqual([])
  })

  it('stands every house wall on solid ground', () => {
    const { cx, cz } = findVillage(4242, (t, s) => maxDropUnder(t, s) >= 4)
    const { world, site } = stamp(4242, cx, cz)
    for (const { ox, oz } of HOUSES) {
      const hx = site.sx + ox
      const hz = site.sz + oz
      for (let x = hx - HOUSE_HW; x <= hx + HOUSE_HW; x++) {
        for (let z = hz - HOUSE_HD; z <= hz + HOUSE_HD; z++) {
          // Floor block present…
          expect(isSolid(world.getBlock(x, site.floorY, z))).toBe(true)
          // …and supported all the way down to the natural surface.
          for (let y = world.terrain.heightAt(x, z) + 1; y < site.floorY; y++) {
            expect(isSolid(world.getBlock(x, y, z))).toBe(true)
          }
        }
      }
    }
  })

  it('stands the market stall on a solid forecourt', () => {
    const { cx, cz } = findVillage(4242, (t, s) => maxDropUnder(t, s) >= 4)
    const { world, furniture, site } = stamp(4242, cx, cz)
    const mx = site.sx + MARKET.ox
    const mz = site.sz + MARKET.oz
    const stall = [...furniture.items.values()].find((f) => f.kind === 'market')
    expect(stall).toBeDefined()
    expect(stall!.y).toBe(site.floorY + 1)
    // The stall model is ~2 wide and 1 deep; its whole footprint needs floor.
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        expect(world.getBlock(mx + dx, site.floorY, mz + dz)).toBe(BlockId.Stone)
        expect(world.getBlock(mx + dx, site.floorY + 1, mz + dz)).toBe(BlockId.Air)
      }
    }
  })

  it('materialises in chunks that were already loaded when it was built', () => {
    const { cx, cz } = findVillage(4242, (t, s) => maxDropUnder(t, s) >= 4)
    const { world, site } = stamp(4242, cx, cz, true)
    // Sample the far corners of the site, which land in the preloaded neighbours.
    for (const { ox, oz } of HOUSES) {
      const chunk = world.getChunk(Math.floor((site.sx + ox) / 16), Math.floor((site.sz + oz) / 16))
      expect(chunk).toBeDefined()
      expect(isSolid(world.getBlock(site.sx + ox, site.floorY, site.sz + oz))).toBe(true)
    }
    expect(floatingColumns(world, site)).toEqual([])
    expect(world.dirtyChunks.has(chunkKey(cx, cz))).toBe(true)
  })

  it('spawns villagers standing on the village floor', () => {
    const { cx, cz } = findVillage(4242, (t, s) => maxDropUnder(t, s) >= 4)
    const { world, entities, site } = stamp(4242, cx, cz)
    const villagers = [...entities.animals.values()].filter((a) => a.kind === 'villager')
    expect(villagers.length).toBeGreaterThanOrEqual(5)
    for (const v of villagers) {
      expect(v.pos.y).toBeCloseTo(site.floorY + 1, 1)
      expect(isSolid(world.getBlock(Math.floor(v.pos.x), site.floorY, Math.floor(v.pos.z)))).toBe(true)
      expect(world.getBlock(Math.floor(v.pos.x), site.floorY + 1, Math.floor(v.pos.z))).toBe(BlockId.Air)
    }
  })

  it('gives every house a door opening that is actually walkable', () => {
    const { cx, cz } = findVillage(4242, (t, s) => maxDropUnder(t, s) >= 4)
    const { world, site } = stamp(4242, cx, cz)
    for (const { ox, oz, yaw } of HOUSES) {
      const hx = site.sx + ox
      const front = site.sz + oz + (yaw === 0 ? HOUSE_HD : -HOUSE_HD)
      expect(world.getBlock(hx, site.floorY + 1, front)).toBe(BlockId.Air)
      expect(world.getBlock(hx, site.floorY + 2, front)).toBe(BlockId.Air)
      // Porch outside and floor inside are both at the same walking level.
      const outward = yaw === 0 ? 1 : -1
      expect(isSolid(world.getBlock(hx, site.floorY, front + outward))).toBe(true)
      expect(isSolid(world.getBlock(hx, site.floorY, front - outward))).toBe(true)
    }
  })
})
