import { describe, expect, it } from 'vitest'
import { ItemId } from '../items/items'
import { deserialize, MultiWorldStore, SaveStore, serialize, type SaveData, type StringStorage } from './storage'

function sample(): SaveData {
  return {
    version: 1,
    seed: 1234,
    player: { x: 1.5, y: 40, z: -2.5, yaw: 0.3, pitch: -0.1, fly: true },
    inventory: [{ itemId: ItemId.Dirt, count: 12 }, null, { itemId: ItemId.Axe, count: 1 }],
    edits: { '1,2,3': 0, '-4,30,9': 8 },
    chests: { '5,31,5': [{ itemId: ItemId.Wheat, count: 3 }, null] },
    animals: {
      animals: [{ id: 'wild-0,0,0', kind: 'pig', pos: { x: 3, y: 31, z: 3 }, yaw: 1, mode: 'follow', owner: 'me' }],
      spawnedChunks: ['0,0', '0,1'],
    },
    furniture: [{ id: 'f-1', kind: 'bed', x: 2, y: 31, z: 4, yaw: 0, open: false }],
    skyTime: 0.4,
    skyDay: 3,
    energy: 76,
    islandFound: true,
    worldKind: 'terrain',
  }
}

function memoryStorage(): StringStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

describe('save serialization', () => {
  it('roundtrips', () => {
    expect(deserialize(serialize(sample()))).toEqual(sample())
  })

  it('keeps a robot world\'s kind, and reads older saves as terrain worlds', () => {
    const robot = { ...sample(), worldKind: 'robot' as const }
    expect(deserialize(serialize(robot))?.worldKind).toBe('robot')
    const legacy = JSON.parse(serialize(sample())) as Record<string, unknown>
    delete legacy.worldKind
    expect(deserialize(JSON.stringify(legacy))?.worldKind).toBe('terrain')
  })

  it('rejects corrupt or missing data', () => {
    expect(deserialize(null)).toBeNull()
    expect(deserialize('not json')).toBeNull()
    expect(deserialize('{}')).toBeNull()
    expect(deserialize(JSON.stringify({ version: 2, seed: 1, player: { x: 1 } }))).toBeNull()
  })

  it('sanitizes invalid inventory slots', () => {
    const data = sample()
    data.inventory.push({ itemId: 9999, count: 1 }, { itemId: ItemId.Dirt, count: 0 })
    const restored = deserialize(serialize(data))!
    expect(restored.inventory[3]).toBeNull()
    expect(restored.inventory[4]).toBeNull()
  })
})

describe('SaveStore', () => {
  it('saves, loads, and clears', () => {
    const storage = memoryStorage()
    const store = new SaveStore(storage, 'test-key')
    expect(store.load()).toBeNull()
    expect(store.save(sample())).toBe(true)
    expect(store.load()).toEqual(sample())
    store.clear()
    expect(store.load()).toBeNull()
  })

  it('reports failure when the backing storage throws', () => {
    const store = new SaveStore(
      {
        getItem: () => {
          throw new Error('nope')
        },
        setItem: () => {
          throw new Error('quota')
        },
        removeItem: () => {},
      },
      'k',
    )
    expect(store.load()).toBeNull()
    expect(store.save(sample())).toBe(false)
  })
})

describe('MultiWorldStore', () => {
  it('records each slot\'s world kind, defaulting older slots to terrain', () => {
    const storage = memoryStorage()
    const store = new MultiWorldStore(storage)
    store.saveSlot(0, 'Green Hills', sample())
    store.saveSlot(1, 'Scrapyard', { ...sample(), worldKind: 'robot' })
    const slots = store.listSlots()
    expect(slots[0]).toMatchObject({ name: 'Green Hills', kind: 'terrain' })
    expect(slots[1]).toMatchObject({ name: 'Scrapyard', kind: 'robot' })
    expect(store.loadSlot(1)?.worldKind).toBe('robot')

    // A slot written by an older build carries no kind at all.
    storage.setItem('minicraft-slots-v1', JSON.stringify([{ name: 'Old', savedAt: '2026-01-01T00:00:00Z' }]))
    expect(store.listSlots()[0]).toMatchObject({ name: 'Old', kind: 'terrain' })
  })
})
