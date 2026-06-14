import type { SavedAnimal } from '../entities/entityManager'
import { FURNITURE_KINDS, type SavedFurniture } from '../entities/furniture'
import { itemDef, type ChestContents, type Slot } from '../items/items'

export interface SaveData {
  version: 1
  seed: number
  player: { x: number; y: number; z: number; yaw: number; pitch: number; fly: boolean }
  inventory: (Slot | null)[]
  edits: Record<string, number>
  chests: Record<string, ChestContents>
  animals: { animals: SavedAnimal[]; spawnedChunks: string[] }
  furniture: SavedFurniture[]
  skyTime: number
}

export function serialize(data: SaveData): string {
  return JSON.stringify(data)
}

/** Parse and validate a save; returns null for corrupt/incompatible data. */
export function deserialize(json: string | null): SaveData | null {
  if (!json) return null
  try {
    const data = JSON.parse(json) as SaveData
    if (data.version !== 1) return null
    if (typeof data.seed !== 'number' || typeof data.player?.x !== 'number') return null
    return {
      version: 1,
      seed: data.seed,
      player: {
        x: data.player.x,
        y: data.player.y,
        z: data.player.z,
        yaw: data.player.yaw ?? 0,
        pitch: data.player.pitch ?? 0,
        fly: data.player.fly ?? false,
      },
      inventory: sanitizeSlots(data.inventory ?? []),
      edits: typeof data.edits === 'object' && data.edits !== null ? data.edits : {},
      chests: sanitizeChests(data.chests ?? {}),
      animals: {
        animals: Array.isArray(data.animals?.animals) ? data.animals.animals : [],
        spawnedChunks: Array.isArray(data.animals?.spawnedChunks) ? data.animals.spawnedChunks : [],
      },
      furniture: sanitizeFurniture(data.furniture),
      skyTime: typeof data.skyTime === 'number' ? data.skyTime : 0.25,
    }
  } catch {
    return null
  }
}

function sanitizeSlots(slots: (Slot | null)[]): (Slot | null)[] {
  return slots.map((s) =>
    s && typeof s.itemId === 'number' && typeof s.count === 'number' && s.count > 0 && itemDef(s.itemId)
      ? { itemId: s.itemId, count: s.count }
      : null,
  )
}

function sanitizeFurniture(list: unknown): SavedFurniture[] {
  if (!Array.isArray(list)) return []
  const out: SavedFurniture[] = []
  for (const f of list) {
    if (
      f &&
      typeof f.id === 'string' &&
      FURNITURE_KINDS.includes(f.kind) &&
      isFinite(f.x) &&
      isFinite(f.y) &&
      isFinite(f.z)
    ) {
      out.push({ id: f.id, kind: f.kind, x: f.x, y: f.y, z: f.z, yaw: Number(f.yaw) || 0, open: !!f.open })
    }
  }
  return out
}

function sanitizeChests(chests: Record<string, ChestContents>): Record<string, ChestContents> {
  const out: Record<string, ChestContents> = {}
  for (const [key, contents] of Object.entries(chests)) {
    if (Array.isArray(contents)) out[key] = sanitizeSlots(contents)
  }
  return out
}

export interface StringStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export class SaveStore {
  constructor(
    private readonly storage: StringStorage,
    private readonly key: string,
  ) {}

  load(): SaveData | null {
    try {
      return deserialize(this.storage.getItem(this.key))
    } catch {
      return null
    }
  }

  save(data: SaveData): boolean {
    try {
      this.storage.setItem(this.key, serialize(data))
      return true
    } catch {
      return false // quota exceeded or unavailable
    }
  }

  clear(): void {
    try {
      this.storage.removeItem(this.key)
    } catch {
      // ignore
    }
  }
}

export const MAX_LOCAL_SLOTS = 5

export interface LocalWorldMeta {
  name: string
  savedAt: string
}

const SLOTS_INDEX_KEY = 'minicraft-slots-v1'
const SLOT_KEY_PREFIX = 'minicraft-slot-v1-'
const LEGACY_SAVE_KEY = 'minicraft-world-v1'

export class MultiWorldStore {
  constructor(private readonly storage: StringStorage) {}

  /** Returns a 5-element array; null means the slot is empty. */
  listSlots(): (LocalWorldMeta | null)[] {
    this.ensureIndex()
    try {
      const raw = this.storage.getItem(SLOTS_INDEX_KEY)
      const parsed: (LocalWorldMeta | null)[] = raw ? (JSON.parse(raw) as (LocalWorldMeta | null)[]) : []
      const result: (LocalWorldMeta | null)[] = Array(MAX_LOCAL_SLOTS).fill(null)
      for (let i = 0; i < MAX_LOCAL_SLOTS; i++) {
        result[i] = parsed[i] ?? null
      }
      return result
    } catch {
      return Array(MAX_LOCAL_SLOTS).fill(null)
    }
  }

  loadSlot(index: number): SaveData | null {
    try {
      return deserialize(this.storage.getItem(`${SLOT_KEY_PREFIX}${index}`))
    } catch {
      return null
    }
  }

  saveSlot(index: number, name: string, data: SaveData): boolean {
    try {
      this.storage.setItem(`${SLOT_KEY_PREFIX}${index}`, serialize(data))
      const slots = this.listSlots()
      const updated = [...slots] as (LocalWorldMeta | null)[]
      updated[index] = { name, savedAt: new Date().toISOString() }
      this.storage.setItem(SLOTS_INDEX_KEY, JSON.stringify(updated))
      return true
    } catch {
      return false
    }
  }

  deleteSlot(index: number): void {
    try {
      this.storage.removeItem(`${SLOT_KEY_PREFIX}${index}`)
      const slots = this.listSlots()
      const updated = [...slots] as (LocalWorldMeta | null)[]
      updated[index] = null
      this.storage.setItem(SLOTS_INDEX_KEY, JSON.stringify(updated))
    } catch {
      // ignore
    }
  }

  private ensureIndex(): void {
    if (this.storage.getItem(SLOTS_INDEX_KEY) !== null) return
    const slots: (LocalWorldMeta | null)[] = Array(MAX_LOCAL_SLOTS).fill(null)
    const legacy = this.storage.getItem(LEGACY_SAVE_KEY)
    if (legacy) {
      try {
        this.storage.setItem(`${SLOT_KEY_PREFIX}0`, legacy)
        slots[0] = { name: 'My World', savedAt: new Date().toISOString() }
      } catch {
        // ignore migration errors
      }
    }
    try {
      this.storage.setItem(SLOTS_INDEX_KEY, JSON.stringify(slots))
    } catch {
      // ignore
    }
  }
}
