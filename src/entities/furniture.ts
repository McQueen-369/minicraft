export type FurnitureKind =
  | 'door'
  | 'window'
  | 'desk'
  | 'chair'
  | 'bed'
  | 'sofa'
  | 'campfire'
  | 'lantern'
  | 'market'
  | 'arcadePuzzle'
  | 'arcadeRunner'
  | 'arcadeMath'
  | 'arcadeWord'

export const FURNITURE_KINDS: FurnitureKind[] = [
  'door',
  'window',
  'desk',
  'chair',
  'bed',
  'sofa',
  'campfire',
  'lantern',
  'market',
  'arcadePuzzle',
  'arcadeRunner',
  'arcadeMath',
  'arcadeWord',
]

export interface Furniture {
  id: string
  kind: FurnitureKind
  /** World cell the piece sits in (model is centered in x/z, base at y). */
  x: number
  y: number
  z: number
  /** Facing in radians, snapped to 0 / 90 / 180 / 270 degrees. */
  yaw: number
  /** Doors only: whether the panel is swung open. */
  open: boolean
}

export type SavedFurniture = Furniture

/** Horizontal half-extent of the pick box; pieces wider than their cell say so. */
export const FURNITURE_HALF: Partial<Record<FurnitureKind, number>> = {
  // The stall model is two blocks wide — players aim at the counter, not the
  // one cell it is anchored to.
  market: 1.15,
}
export const DEFAULT_FURNITURE_HALF = 0.48

/** Approximate pick box (height + horizontal half-extent) for raycasting. */
export const FURNITURE_HEIGHT: Record<FurnitureKind, number> = {
  door: 2,
  window: 1,
  desk: 1,
  chair: 0.95,
  bed: 0.8,
  sofa: 0.9,
  campfire: 0.4,
  lantern: 0.8,
  market: 2.5,
  arcadePuzzle: 2.5,
  arcadeRunner: 2.5,
  arcadeMath: 2.5,
  arcadeWord: 2.5,
}

export const FURNITURE_LABEL: Record<FurnitureKind, string> = {
  door: 'Door',
  window: 'Window',
  desk: 'Desk',
  chair: 'Chair',
  bed: 'Bed',
  sofa: 'Sofa',
  campfire: 'Campfire',
  lantern: 'Lantern',
  market: 'Market',
  arcadePuzzle: 'Puzzle Kiosk',
  arcadeRunner: 'Runner Kiosk',
  arcadeMath: 'Math Kiosk',
  arcadeWord: 'Word Kiosk',
}
