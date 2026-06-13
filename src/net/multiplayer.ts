import type * as THREE from 'three'
import { ANIMAL_STATE_HZ, PLAYER_STATE_HZ } from '../constants'
import type { SavedAnimal } from '../entities/entityManager'
import type { ChestContents } from '../items/items'
import {
  decodeMessage,
  encodeMessage,
  type AnimalEventMsg,
  type FurnitureMsg,
  type GameMessage,
  type SnapshotMsg,
} from './protocol'
import { gameChannel } from './supabase'
import { buildAvatar, disposeAvatar, updateAvatar, type RemoteAvatar } from './remotePlayer'

export interface Transport {
  send(msg: GameMessage): void
  onMessage(handler: (msg: GameMessage) => void): void
  close(): void
}

export interface MultiplayerHooks {
  /** Host: produce the world snapshot for a joining player. */
  getSnapshot(forId: string): Omit<SnapshotMsg, 't' | 'to' | 'hostId'>
  /** Guest: world snapshot arrived (happens once, before play starts). */
  applySnapshot(s: SnapshotMsg): void
  applyEdit(x: number, y: number, z: number, id: number): void
  applyChest(key: string, contents: ChestContents): void
  /** Guest: authoritative animal states from the host, with synced sky time. */
  applyAnimals(list: SavedAnimal[], skyTime?: number): void
  applyAnimalEvent(msg: AnimalEventMsg): void
  applyFurnitureEvent(msg: FurnitureMsg): void
  /** Guest: called when the host disconnects. */
  onHostLeft?(): void
}

const PEER_TIMEOUT = 12

export interface SelfState {
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
}

export class Multiplayer {
  readonly peers = new Map<string, RemoteAvatar>()
  private playerSendIn = 0
  private animalSendIn = 0
  private snapshotWaiter: ((s: SnapshotMsg) => void) | null = null
  private hostId: string | null = null

  constructor(
    readonly role: 'host' | 'guest',
    readonly roomCode: string,
    private readonly transport: Transport,
    private scene: THREE.Scene,
    readonly selfId: string,
    private readonly name: string,
    private readonly hooks: MultiplayerHooks,
  ) {
    transport.onMessage((msg) => this.handle(msg))
  }

  /** Move avatars into a (re)created session scene (guest joins before the world exists). */
  setScene(scene: THREE.Scene): void {
    for (const avatar of this.peers.values()) {
      this.scene.remove(avatar.group)
      scene.add(avatar.group)
    }
    this.scene = scene
  }

  /** Guest: announce ourselves and wait for the host's snapshot. */
  requestSnapshot(timeoutMs: number): Promise<SnapshotMsg> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.snapshotWaiter = null
        reject(new Error('No host responded — check the room code'))
      }, timeoutMs)
      this.snapshotWaiter = (s) => {
        clearTimeout(timer)
        this.snapshotWaiter = null
        resolve(s)
      }
      this.transport.send({ t: 'hello', id: this.selfId, name: this.name })
    })
  }

  sendEdit(x: number, y: number, z: number, id: number): void {
    this.transport.send({ t: 'edit', x, y, z, id })
  }

  sendChest(key: string, contents: ChestContents): void {
    this.transport.send({ t: 'chest', key, contents })
  }

  sendAnimalEvent(msg: Omit<AnimalEventMsg, 't'>): void {
    this.transport.send({ t: 'animalEvent', ...msg })
  }

  sendFurniture(msg: Omit<FurnitureMsg, 't'>): void {
    this.transport.send({ t: 'furniture', ...msg })
  }

  /** Per-frame: throttled state broadcasts + remote avatar smoothing. */
  update(dt: number, self: SelfState, animals: () => SavedAnimal[], skyTime?: number): void {
    this.playerSendIn -= dt
    if (this.playerSendIn <= 0) {
      this.playerSendIn = 1 / PLAYER_STATE_HZ
      this.transport.send({ t: 'player', id: this.selfId, name: this.name, ...self })
    }
    if (this.role === 'host') {
      this.animalSendIn -= dt
      if (this.animalSendIn <= 0) {
        this.animalSendIn = 1 / ANIMAL_STATE_HZ
        this.transport.send({ t: 'animals', list: animals(), skyTime })
      }
    }
    const now = performance.now() / 1000
    for (const [id, avatar] of this.peers) {
      updateAvatar(avatar, dt)
      if (now - avatar.lastSeen > PEER_TIMEOUT) this.removePeer(id)
    }
  }

  get selfName(): string { return this.name }

  get peerNames(): string[] {
    return [...this.peers.values()].map((p) => p.name)
  }

  dispose(): void {
    this.transport.send({ t: 'leave', id: this.selfId })
    for (const id of [...this.peers.keys()]) this.removePeer(id)
    this.transport.close()
  }

  private handle(msg: GameMessage): void {
    switch (msg.t) {
      case 'hello':
        if (this.role === 'host') {
          this.transport.send({ t: 'snapshot', to: msg.id, hostId: this.selfId, ...this.hooks.getSnapshot(msg.id) })
        }
        break
      case 'snapshot':
        if (this.role === 'guest' && msg.to === this.selfId && this.snapshotWaiter) {
          this.hostId = msg.hostId
          this.hooks.applySnapshot(msg)
          this.snapshotWaiter(msg)
        }
        break
      case 'player': {
        if (msg.id === this.selfId) break
        let avatar = this.peers.get(msg.id)
        if (!avatar) {
          avatar = buildAvatar(msg.name || 'Player')
          avatar.group.position.set(msg.x, msg.y, msg.z)
          this.peers.set(msg.id, avatar)
          this.scene.add(avatar.group)
        }
        avatar.target = { x: msg.x, y: msg.y, z: msg.z, yaw: msg.yaw, pitch: msg.pitch }
        avatar.lastSeen = performance.now() / 1000
        break
      }
      case 'edit':
        this.hooks.applyEdit(msg.x, msg.y, msg.z, msg.id)
        break
      case 'chest':
        this.hooks.applyChest(msg.key, msg.contents)
        break
      case 'animals':
        if (this.role === 'guest') this.hooks.applyAnimals(msg.list, msg.skyTime)
        break
      case 'animalEvent':
        this.hooks.applyAnimalEvent(msg)
        break
      case 'furniture':
        this.hooks.applyFurnitureEvent(msg)
        break
      case 'leave':
        this.removePeer(msg.id)
        break
    }
  }

  private removePeer(id: string): void {
    const avatar = this.peers.get(id)
    if (avatar) {
      this.scene.remove(avatar.group)
      disposeAvatar(avatar)
      this.peers.delete(id)
    }
    if (id === this.hostId) this.hooks.onHostLeft?.()
  }
}

/** Connect to the Supabase Realtime channel for a room. */
export async function connectChannel(roomCode: string): Promise<Transport> {
  const channel = gameChannel(roomCode)
  const handlers: ((msg: GameMessage) => void)[] = []
  channel.on('broadcast', { event: 'game' }, ({ payload }) => {
    const msg = decodeMessage(payload)
    if (msg) for (const h of handlers) h(msg)
  })
  await new Promise<void>((resolve, reject) => {
    let settled = false
    channel.subscribe((status) => {
      if (settled) return
      if (status === 'SUBSCRIBED') {
        settled = true
        resolve()
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        settled = true
        reject(new Error('Could not connect to the game server'))
      }
    })
  })
  return {
    send: (msg) => {
      void channel.send({ type: 'broadcast', event: 'game', payload: encodeMessage(msg) })
    },
    onMessage: (handler) => {
      handlers.push(handler)
    },
    close: () => {
      void channel.unsubscribe()
    },
  }
}
