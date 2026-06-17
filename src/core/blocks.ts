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
  MysteryBox: 11,
  MysteryBoxRare: 12,
  MysteryBoxEpic: 13,
  Ladder: 14,
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
  MysteryBoxSide: 14,
  MysteryBoxTop: 15,
  MysteryBoxRareSide: 16,
  MysteryBoxRareTop: 17,
  MysteryBoxEpicSide: 18,
  MysteryBoxEpicTop: 19,
  LadderSide: 20,
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
}

const def = (
  name: string,
  tiles: { top: number; side: number; bottom: number },
  hardness: number,
  tool: ToolType | null,
  opts: Partial<Pick<BlockDef, 'opaque' | 'solid' | 'drops'>> & { id: BlockId },
): BlockDef => ({
  name,
  opaque: opts.opaque ?? true,
  solid: opts.solid ?? true,
  tiles,
  hardness,
  tool,
  drops: opts.drops ?? opts.id,
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
  [BlockId.Glass]: def('Glass', uniform(Tile.Glass), 0.4, null, { id: BlockId.Glass, opaque: false }),
  [BlockId.Chest]: def('Chest', { top: Tile.ChestTop, side: Tile.ChestFront, bottom: Tile.ChestTop }, 3, 'axe', {
    id: BlockId.Chest,
  }),
  [BlockId.MysteryBox]: def('Mystery Box', { top: Tile.MysteryBoxTop, side: Tile.MysteryBoxSide, bottom: Tile.MysteryBoxTop }, 1, null, { id: BlockId.MysteryBox }),
  [BlockId.MysteryBoxRare]: def('Rare Mystery Box', { top: Tile.MysteryBoxRareTop, side: Tile.MysteryBoxRareSide, bottom: Tile.MysteryBoxRareTop }, 1, null, { id: BlockId.MysteryBoxRare }),
  [BlockId.MysteryBoxEpic]: def('Epic Mystery Box', { top: Tile.MysteryBoxEpicTop, side: Tile.MysteryBoxEpicSide, bottom: Tile.MysteryBoxEpicTop }, 1, null, { id: BlockId.MysteryBoxEpic }),
  [BlockId.Ladder]: def('Ladder', { top: Tile.LadderSide, side: Tile.LadderSide, bottom: Tile.LadderSide }, 0.5, 'axe', {
    id: BlockId.Ladder,
    solid: false,
    opaque: false,
  }),
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
