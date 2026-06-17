export type FurnitureKind = 'door' | 'window' | 'desk' | 'chair' | 'bed' | 'sofa' | 'campfire'

export const FURNITURE_KINDS: FurnitureKind[] = ['door', 'window', 'desk', 'chair', 'bed', 'sofa', 'campfire']

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

/** Approximate pick box (height + horizontal half-extent) for raycasting. */
export const FURNITURE_HEIGHT: Record<FurnitureKind, number> = {
  door: 2,
  window: 1,
  desk: 1,
  chair: 0.95,
  bed: 0.8,
  sofa: 0.9,
  campfire: 0.4,
}

export const FURNITURE_LABEL: Record<FurnitureKind, string> = {
  door: 'Door',
  window: 'Window',
  desk: 'Desk',
  chair: 'Chair',
  bed: 'Bed',
  sofa: 'Sofa',
  campfire: 'Campfire',
}
