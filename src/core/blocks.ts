export const BlockId = {
  Air: 0,
  Grass: 1,
  Dirt: 2,
  Stone: 3,
  Sand: 4,
  Wood: 5,
  Leaves: 6,
  Plank: 7,
  Brick: 8,
  Glass: 9,
  Chest: 10,
  Bed: 11,
  Light: 12,
  Door: 13,
  Desk: 14,
  Chair: 15,
} as const

export type BlockId = (typeof BlockId)[keyof typeof BlockId]

/** Atlas tile indices (drawn procedurally in render/atlas.ts). */
export const Tile = {
  GrassTop: 0,
  GrassSide: 1,
  Dirt: 2,
  Stone: 3,
  Sand: 4,
  WoodSide: 5,
  WoodTop: 6,
  Leaves: 7,
  Plank: 8,
  Brick: 9,
  Glass: 10,
  ChestSide: 11,
  ChestFront: 12,
  ChestTop: 13,
  Bed: 14,
  Light: 15,
  Door: 16,
  Desk: 17,
  Chair: 18,
} as const

export type ToolType = 'pickaxe' | 'axe' | 'shears'

export interface BlockDef {
  name: string
  opaque: boolean
  solid: boolean
  tiles: { top: number; side: number; bottom: number }
  /** Base seconds to break with bare hand. */
  hardness: number
  /** Tool type that speeds up mining this block. */
  tool: ToolType | null
  /** BlockId of what is collected when broken (defaults to self). */
  drops: BlockId
  /** Rendered with alpha blending (semi-transparent). */
  transparent?: boolean
}

const def = (
  name: string,
  tiles: { top: number; side: number; bottom: number },
  hardness: number,
  tool: ToolType | null,
  opts: Partial<Pick<BlockDef, 'opaque' | 'solid' | 'drops' | 'transparent'>> & { id: BlockId },
): BlockDef => ({
  name,
  opaque: opts.opaque ?? true,
  solid: opts.solid ?? true,
  tiles,
  hardness,
  tool,
  drops: opts.drops ?? opts.id,
  transparent: opts.transparent,
})

const uniform = (t: number) => ({ top: t, side: t, bottom: t })

export const BLOCKS: Record<BlockId, BlockDef | null> = {
  [BlockId.Air]: null,
  [BlockId.Grass]: def('Grass', { top: Tile.GrassTop, side: Tile.GrassSide, bottom: Tile.Dirt }, 0.7, null, {
    id: BlockId.Grass,
    drops: BlockId.Dirt,
  }),
  [BlockId.Dirt]: def('Dirt', uniform(Tile.Dirt), 0.7, null, { id: BlockId.Dirt }),
  [BlockId.Stone]: def('Stone', uniform(Tile.Stone), 5, 'pickaxe', { id: BlockId.Stone }),
  [BlockId.Sand]: def('Sand', uniform(Tile.Sand), 0.7, null, { id: BlockId.Sand }),
  [BlockId.Wood]: def('Wood', { top: Tile.WoodTop, side: Tile.WoodSide, bottom: Tile.WoodTop }, 3, 'axe', {
    id: BlockId.Wood,
  }),
  [BlockId.Leaves]: def('Leaves', uniform(Tile.Leaves), 0.4, 'shears', { id: BlockId.Leaves, opaque: false }),
  [BlockId.Plank]: def('Plank', uniform(Tile.Plank), 3, 'axe', { id: BlockId.Plank }),
  [BlockId.Brick]: def('Brick', uniform(Tile.Brick), 5, 'pickaxe', { id: BlockId.Brick }),
  [BlockId.Glass]: def('Glass', uniform(Tile.Glass), 0.4, null, {
    id: BlockId.Glass,
    opaque: false,
    transparent: true,
  }),
  [BlockId.Chest]: def('Chest', { top: Tile.ChestTop, side: Tile.ChestFront, bottom: Tile.ChestTop }, 3, 'axe', {
    id: BlockId.Chest,
  }),
  [BlockId.Bed]: def('Bed', uniform(Tile.Bed), 1, null, { id: BlockId.Bed }),
  [BlockId.Light]: def('Light', uniform(Tile.Light), 0.5, null, { id: BlockId.Light }),
  [BlockId.Door]: def('Door', uniform(Tile.Door), 3, 'axe', { id: BlockId.Door }),
  [BlockId.Desk]: def('Desk', uniform(Tile.Desk), 3, 'axe', { id: BlockId.Desk }),
  [BlockId.Chair]: def('Chair', uniform(Tile.Chair), 3, 'axe', { id: BlockId.Chair }),
}

export function isOpaque(id: number): boolean {
  return BLOCKS[id as BlockId]?.opaque ?? false
}

export function isSolid(id: number): boolean {
  return BLOCKS[id as BlockId]?.solid ?? false
}

export function blockDef(id: number): BlockDef | null {
  return BLOCKS[id as BlockId] ?? null
}

export function isTransparent(id: number): boolean {
  return BLOCKS[id as BlockId]?.transparent ?? false
}
