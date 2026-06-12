import { CHUNK_SIZE, WORLD_HEIGHT } from '../constants'

/** World coordinate -> chunk coordinate (floor division, handles negatives). */
export function worldToChunk(v: number): number {
  return Math.floor(v / CHUNK_SIZE)
}

/** World coordinate -> local 0..15 coordinate within its chunk (handles negatives). */
export function worldToLocal(v: number): number {
  return ((v % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
}

export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`
}

export function parseChunkKey(key: string): { cx: number; cz: number } {
  const i = key.indexOf(',')
  return { cx: Number(key.slice(0, i)), cz: Number(key.slice(i + 1)) }
}

export function blockKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`
}

export function parseBlockKey(key: string): { x: number; y: number; z: number } {
  const [x, y, z] = key.split(',').map(Number)
  return { x, y, z }
}

/** Index into a chunk's Uint8Array for local coords. */
export function localIndex(lx: number, y: number, lz: number): number {
  return lx + lz * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE
}

export function inWorldY(y: number): boolean {
  return y >= 0 && y < WORLD_HEIGHT
}
