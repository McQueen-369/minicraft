/** Deterministic PRNG (mulberry32). Returns a function yielding floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Hash a string to a 32-bit unsigned int (FNV-1a). */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Deterministic hash of integer coordinates + seed to a float in [0, 1). */
export function hash2D(seed: number, x: number, z: number): number {
  let h = seed >>> 0
  h = Math.imul(h ^ (x | 0), 0x85ebca6b)
  h = Math.imul(h ^ (z | 0), 0xc2b2ae35)
  h ^= h >>> 16
  h = Math.imul(h, 0x27d4eb2f)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}
