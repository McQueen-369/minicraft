import type { SavedAnimal } from '../entities/entityManager'
import type { SavedFurniture } from '../entities/furniture'
import type { ChestContents, Slot } from '../items/items'
import type { Appearance } from '../player/appearance'

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
  /** Character appearance; optional so older clients stay compatible. */
  ap?: Appearance
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

export interface ChatMsg {
  t: 'chat'
  playerId: string
  name: string
  text: string
}

/** One stack put on the table during a player-to-player trade. */
export interface TradeLot {
  itemId: number
  count: number
}

export type TradeEvent = 'invite' | 'accept' | 'decline' | 'offer' | 'confirm' | 'cancel'

/**
 * Player-to-player trading. Every message names both ends, so the other
 * peers on the room's broadcast channel can ignore it.
 */
export interface TradeMsg {
  t: 'trade'
  ev: TradeEvent
  from: string
  to: string
  /** Sender's display name, sent with an invite so the prompt can name them. */
  fromName?: string
  /** The sender's whole offer, resent on every change. */
  lots?: TradeLot[]
  /** Why an invite was declined or a session cancelled. */
  reason?: string
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
  | ChatMsg
  | TradeMsg

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
    case 'chat':
      return typeof m.playerId === 'string' && typeof m.text === 'string' ? m : null
    case 'trade':
      return isTradeMsg(m) ? m : null
    default:
      return null
  }
}

const TRADE_EVENTS: TradeEvent[] = ['invite', 'accept', 'decline', 'offer', 'confirm', 'cancel']
/** Nobody can put more than this on the table, so a bad peer cannot flood us. */
export const MAX_TRADE_LOTS = 8

function isTradeMsg(m: TradeMsg): boolean {
  if (typeof m.from !== 'string' || typeof m.to !== 'string' || !m.from || !m.to) return false
  if (!TRADE_EVENTS.includes(m.ev)) return false
  if (m.lots === undefined) return m.ev !== 'offer'
  if (!Array.isArray(m.lots) || m.lots.length > MAX_TRADE_LOTS) return false
  return m.lots.every(
    (l) =>
      typeof l?.itemId === 'number' &&
      Number.isInteger(l.count) &&
      l.count > 0 &&
      Number.isFinite(l.itemId),
  )
}

export function generateRoomCode(): string {
  const digits = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `MC-${digits}`
}

export function isValidRoomCode(code: string): boolean {
  return /^MC-\d{4}$/.test(code)
}
