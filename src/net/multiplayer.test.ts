import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { Multiplayer, type MultiplayerHooks, type Transport } from './multiplayer'
import type { GameMessage, SnapshotMsg } from './protocol'

/** Two in-memory transports wired to each other (loopback excluded, like broadcast self:false). */
function transportPair(): [Transport, Transport] {
  const handlersA: ((m: GameMessage) => void)[] = []
  const handlersB: ((m: GameMessage) => void)[] = []
  const a: Transport = {
    send: (m) => handlersB.forEach((h) => h(structuredClone(m))),
    onMessage: (h) => handlersA.push(h),
    close: () => {},
  }
  const b: Transport = {
    send: (m) => handlersA.forEach((h) => h(structuredClone(m))),
    onMessage: (h) => handlersB.push(h),
    close: () => {},
  }
  return [a, b]
}

interface FakeWorld {
  edits: Map<string, number>
  chests: Map<string, unknown>
  snapshotApplied: SnapshotMsg | null
}

function makeHooks(world: FakeWorld, snapshotSource?: () => Omit<SnapshotMsg, 't' | 'to'>): MultiplayerHooks {
  return {
    getSnapshot: snapshotSource ?? (() => ({
      seed: 0,
      skyTime: 0,
      edits: {},
      chests: {},
      animals: { animals: [], spawnedChunks: [] },
      spawn: { x: 0, y: 0, z: 0 },
    })),
    applySnapshot: (s) => {
      world.snapshotApplied = s
    },
    applyEdit: (x, y, z, id) => world.edits.set(`${x},${y},${z}`, id),
    applyChest: (key, contents) => world.chests.set(key, contents),
    applyAnimals: () => {},
    applyAnimalEvent: () => {},
  }
}

function fakeWorld(): FakeWorld {
  return { edits: new Map(), chests: new Map(), snapshotApplied: null }
}

describe('Multiplayer', () => {
  it('host answers a hello with a snapshot for that guest', async () => {
    const [hostT, guestT] = transportPair()
    const hostWorld = fakeWorld()
    const guestWorld = fakeWorld()
    new Multiplayer('host', 'MC-0001', hostT, new THREE.Scene(), 'host1', 'Host', makeHooks(hostWorld, () => ({
      seed: 777,
      skyTime: 0.4,
      edits: { '1,2,3': 9 },
      chests: {},
      animals: { animals: [], spawnedChunks: ['0,0'] },
      spawn: { x: 0.5, y: 33, z: 0.5 },
    })))
    const guest = new Multiplayer('guest', 'MC-0001', guestT, new THREE.Scene(), 'guest1', 'Ann', makeHooks(guestWorld))
    const snapshot = await guest.requestSnapshot(1000)
    expect(snapshot.seed).toBe(777)
    expect(guestWorld.snapshotApplied?.edits).toEqual({ '1,2,3': 9 })
  })

  it('rejects when no host answers', async () => {
    const [, guestT] = transportPair()
    const guest = new Multiplayer('guest', 'MC-0002', guestT, new THREE.Scene(), 'g', 'Ann', makeHooks(fakeWorld()))
    await expect(guest.requestSnapshot(30)).rejects.toThrow(/No host/)
  })

  it('converges block edits between two clients', () => {
    const [hostT, guestT] = transportPair()
    const hostWorld = fakeWorld()
    const guestWorld = fakeWorld()
    const host = new Multiplayer('host', 'MC-0003', hostT, new THREE.Scene(), 'h', 'Host', makeHooks(hostWorld))
    const guest = new Multiplayer('guest', 'MC-0003', guestT, new THREE.Scene(), 'g', 'Ann', makeHooks(guestWorld))
    host.sendEdit(1, 2, 3, 5)
    guest.sendEdit(-7, 30, 2, 0)
    // Each side applied the other's edit (their own went through their world directly).
    expect(guestWorld.edits.get('1,2,3')).toBe(5)
    expect(hostWorld.edits.get('-7,30,2')).toBe(0)
  })

  it('syncs chest updates', () => {
    const [hostT, guestT] = transportPair()
    const hostWorld = fakeWorld()
    new Multiplayer('host', 'MC-0004', hostT, new THREE.Scene(), 'h', 'Host', makeHooks(hostWorld))
    const guest = new Multiplayer('guest', 'MC-0004', guestT, new THREE.Scene(), 'g', 'Ann', makeHooks(fakeWorld()))
    guest.sendChest('4,30,4', [{ itemId: 2, count: 5 }])
    expect(hostWorld.chests.get('4,30,4')).toEqual([{ itemId: 2, count: 5 }])
  })
})
