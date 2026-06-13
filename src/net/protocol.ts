import type { SavedAnimal } from '../entities/entityManager'
import type { SavedFurniture } from '../entities/furniture'
import type { ChestContents, Slot } from '../items/items'

export const PROTOCOL_VERSION = 1

export interface PlayerStateMsg {
  t: 'player'
  id: string
  name: string
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
}

export interface HelloMsg {
  t: 'hello'
  id: string
  name: string
}

export interface SnapshotMsg {
  t: 'snapshot'
  /** Player id this snapshot answers (others ignore it). */
  to: string
  /** Host's own player id, so guests can detect when the host disconnects. */
  hostId: string
  seed: number
  skyTime: number
  edits: Record<string, number>
  chests: Record<string, ChestContents>
  animals: { animals: SavedAnimal[]; spawnedChunks: string[] }
  furniture: SavedFurniture[]
  spawn: { x: number; y: number; z: number }
}

export interface EditMsg {
  t: 'edit'
  x: number
  y: number
  z: number
  id: number
}

export interface ChestMsg {
  t: 'chest'
  key: string
  contents: (Slot | null)[]
}

export interface AnimalsMsg {
  t: 'animals'
  list: SavedAnimal[]
  /** Host's current sky clock, synced to all guests every animal tick. */
  skyTime?: number
}

export interface AnimalEventMsg {
  t: 'animalEvent'
  ev: 'tame' | 'toggleStay' | 'capture' | 'release'
  animalId: string
  kind?: string
  pos?: { x: number; y: number; z: number }
  owner?: string | null
}

export interface FurnitureMsg {
  t: 'furniture'
  ev: 'place' | 'remove' | 'toggle'
  item?: SavedFurniture
  id?: string
}

export interface LeaveMsg {
  t: 'leave'
  id: string
}

export type GameMessage =
  | PlayerStateMsg
  | HelloMsg
  | SnapshotMsg
  | EditMsg
  | ChestMsg
  | AnimalsMsg
  | AnimalEventMsg
  | FurnitureMsg
  | LeaveMsg

interface Envelope {
  v: number
  m: GameMessage
}

export function encodeMessage(m: GameMessage): Envelope {
  return { v: PROTOCOL_VERSION, m }
}

/** Validate an incoming payload; returns null for foreign/incompatible data. */
export function decodeMessage(payload: unknown): GameMessage | null {
  if (typeof payload !== 'object' || payload === null) return null
  const env = payload as Partial<Envelope>
  if (env.v !== PROTOCOL_VERSION) return null
  const m = env.m
  if (typeof m !== 'object' || m === null || typeof (m as { t?: unknown }).t !== 'string') return null
  switch (m.t) {
    case 'player':
      return isFinite(m.x) && isFinite(m.y) && isFinite(m.z) && typeof m.id === 'string' ? m : null
    case 'hello':
      return typeof m.id === 'string' ? m : null
    case 'snapshot':
      return typeof m.to === 'string' && typeof m.seed === 'number' ? m : null
    case 'edit':
      return isFinite(m.x) && isFinite(m.y) && isFinite(m.z) && typeof m.id === 'number' ? m : null
    case 'chest':
      return typeof m.key === 'string' && Array.isArray(m.contents) ? m : null
    case 'animals':
      return Array.isArray(m.list) ? m : null
    case 'animalEvent':
      return typeof m.animalId === 'string' ? m : null
    case 'furniture':
      return m.ev === 'place' || m.ev === 'remove' || m.ev === 'toggle' ? m : null
    case 'leave':
      return typeof m.id === 'string' ? m : null
    default:
      return null
  }
}

export function generateRoomCode(): string {
  const digits = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `MC-${digits}`
}

export function isValidRoomCode(code: string): boolean {
  return /^MC-\d{4}$/.test(code)
}
