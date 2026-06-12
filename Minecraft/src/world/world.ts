import { CHUNK_SIZE, RENDER_DISTANCE, UNLOAD_DISTANCE } from '../constants'
import { BlockId } from '../core/blocks'
import { blockKey, chunkKey, inWorldY, parseChunkKey, worldToChunk, worldToLocal } from '../core/coords'
import type { ChestContents } from '../items/items'
import { Chunk } from './chunk'
import type { Terrain } from './terrain'

export class World {
  readonly chunks = new Map<string, Chunk>()
  /** Player edits that differ from generated terrain, keyed by "x,y,z". */
  readonly edits: Map<string, number>
  /** Chest inventories keyed by "x,y,z". */
  readonly chests: Map<string, ChestContents>
  /** Chunk keys whose mesh needs rebuilding; drained by the renderer. */
  readonly dirtyChunks = new Set<string>()

  constructor(
    readonly terrain: Terrain,
    opts: {
      edits?: Map<string, number>
      chests?: Map<string, ChestContents>
      /** Loot for naturally generated chests. */
      chestLoot?: (x: number, y: number, z: number) => ChestContents
    } = {},
  ) {
    this.edits = opts.edits ?? new Map()
    this.chests = opts.chests ?? new Map()
    this.chestLoot = opts.chestLoot ?? (() => [])
  }

  private readonly chestLoot: (x: number, y: number, z: number) => ChestContents

  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(chunkKey(cx, cz))
  }

  hasChunk(cx: number, cz: number): boolean {
    return this.chunks.has(chunkKey(cx, cz))
  }

  ensureChunk(cx: number, cz: number): Chunk {
    const key = chunkKey(cx, cz)
    let chunk = this.chunks.get(key)
    if (chunk) return chunk
    chunk = new Chunk(cx, cz, this.terrain.generateChunkData(cx, cz))
    // Apply saved edits falling inside this chunk.
    const x0 = cx * CHUNK_SIZE
    const z0 = cz * CHUNK_SIZE
    for (const [k, id] of this.edits) {
      const [x, y, z] = k.split(',').map(Number)
      if (x >= x0 && x < x0 + CHUNK_SIZE && z >= z0 && z < z0 + CHUNK_SIZE && inWorldY(y)) {
        chunk.set(x - x0, y, z - z0, id)
      }
    }
    // Stock naturally generated chests that still exist and have no contents yet.
    for (const pos of this.terrain.naturalChestsIn(cx, cz)) {
      const bk = blockKey(pos.x, pos.y, pos.z)
      if (!this.chests.has(bk) && chunk.get(pos.x - x0, pos.y, pos.z - z0) === BlockId.Chest) {
        this.chests.set(bk, this.chestLoot(pos.x, pos.y, pos.z))
      }
    }
    this.chunks.set(key, chunk)
    this.dirtyChunks.add(key)
    return chunk
  }

  /** Block at a world position; falls back to edits + generated terrain when unloaded. */
  getBlock(x: number, y: number, z: number): number {
    if (!inWorldY(y)) return BlockId.Air
    const chunk = this.getChunk(worldToChunk(x), worldToChunk(z))
    if (chunk) return chunk.get(worldToLocal(x), y, worldToLocal(z))
    const edited = this.edits.get(blockKey(x, y, z))
    if (edited !== undefined) return edited
    return this.terrain.generateBlock(x, y, z)
  }

  /**
   * Set a block, record the edit diff, and mark affected chunk meshes dirty.
   */
  setBlock(x: number, y: number, z: number, id: number): void {
    if (!inWorldY(y)) return
    const key = blockKey(x, y, z)
    if (this.terrain.generateBlock(x, y, z) === id) this.edits.delete(key)
    else this.edits.set(key, id)
    if (id !== BlockId.Chest) this.chests.delete(key)

    const cx = worldToChunk(x)
    const cz = worldToChunk(z)
    const chunk = this.getChunk(cx, cz)
    if (!chunk) return
    const lx = worldToLocal(x)
    const lz = worldToLocal(z)
    chunk.set(lx, y, lz, id)
    this.dirtyChunks.add(chunkKey(cx, cz))
    if (lx === 0) this.dirtyChunks.add(chunkKey(cx - 1, cz))
    if (lx === CHUNK_SIZE - 1) this.dirtyChunks.add(chunkKey(cx + 1, cz))
    if (lz === 0) this.dirtyChunks.add(chunkKey(cx, cz - 1))
    if (lz === CHUNK_SIZE - 1) this.dirtyChunks.add(chunkKey(cx, cz + 1))
  }

  getChestContents(x: number, y: number, z: number): ChestContents {
    const key = blockKey(x, y, z)
    let contents = this.chests.get(key)
    if (!contents) {
      contents = []
      this.chests.set(key, contents)
    }
    return contents
  }

  /**
   * Generate chunks around the player (one ring beyond render distance so
   * meshing always has neighbors) and unload far chunks with hysteresis.
   * Generation is nearest-first and capped at maxGenerate per call to keep
   * frames smooth; pass Infinity to force the whole ring (e.g. at spawn).
   */
  updateLoadedChunks(px: number, pz: number, maxGenerate = Infinity): { unloaded: string[] } {
    const pcx = worldToChunk(Math.floor(px))
    const pcz = worldToChunk(Math.floor(pz))
    let budget = maxGenerate
    for (const [dx, dz] of genOffsets()) {
      if (budget <= 0) break
      if (!this.hasChunk(pcx + dx, pcz + dz)) {
        this.ensureChunk(pcx + dx, pcz + dz)
        budget--
      }
    }
    const unloaded: string[] = []
    const dropDist = UNLOAD_DISTANCE + 1
    for (const key of this.chunks.keys()) {
      const { cx, cz } = parseChunkKey(key)
      const dx = cx - pcx
      const dz = cz - pcz
      if (dx * dx + dz * dz > dropDist * dropDist) {
        this.chunks.delete(key)
        this.dirtyChunks.delete(key)
        unloaded.push(key)
      }
    }
    return { unloaded }
  }
}

let cachedOffsets: [number, number][] | null = null

/** Chunk offsets within the generation disk, sorted nearest-first. */
function genOffsets(): [number, number][] {
  if (cachedOffsets) return cachedOffsets
  const genDist = RENDER_DISTANCE + 1
  const out: [number, number][] = []
  for (let dz = -genDist; dz <= genDist; dz++) {
    for (let dx = -genDist; dx <= genDist; dx++) {
      if (dx * dx + dz * dz <= genDist * genDist) out.push([dx, dz])
    }
  }
  out.sort((a, b) => a[0] * a[0] + a[1] * a[1] - (b[0] * b[0] + b[1] * b[1]))
  cachedOffsets = out
  return out
}
