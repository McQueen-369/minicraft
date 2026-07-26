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
  GoldOre: 15,
  AppleLeaves: 16,
  TNT: 17,
  Fence: 18,
  DiamondOre: 19,
  Lava: 20,
  MetalPanel: 21,
  CannedFood: 22,
  MetalFence: 23,
  HullPlate: 24,
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
  GoldOreSide: 21,
  AppleLeaves: 22,
  TNTSide: 23,
  TNTTop: 24,
  Fence: 25,
  DiamondOreSide: 26,
  Lava: 27,
  MetalPanelTop: 28,
  MetalPanelSide: 29,
  CanTop: 30,
  CanSide: 31,
  MetalFence: 32,
  HullPlate: 33,
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
  /** Item ID of what is collected when broken (defaults to self). */
  drops: number
  /**
   * Block that makes its own light: the mesher skips the directional face tint
   * and ambient occlusion so it stays uniformly bright in a dark cavern.
   */
  emissive: boolean
}

const def = (
  name: string,
  tiles: { top: number; side: number; bottom: number },
  hardness: number,
  tool: ToolType | null,
  opts: Partial<Pick<BlockDef, 'opaque' | 'solid' | 'drops' | 'emissive'>> & { id: BlockId },
): BlockDef => ({
  name,
  opaque: opts.opaque ?? true,
  solid: opts.solid ?? true,
  tiles,
  hardness,
  tool,
  drops: opts.drops ?? opts.id,
  emissive: opts.emissive ?? false,
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
  [BlockId.GoldOre]: def('Gold Ore', { top: Tile.GoldOreSide, side: Tile.GoldOreSide, bottom: Tile.GoldOreSide }, 6, 'pickaxe', {
    id: BlockId.GoldOre,
    drops: 200, // ItemId.Gold — drops raw gold, not the ore block itself
  }),
  [BlockId.AppleLeaves]: def('Apple Leaves', { top: Tile.AppleLeaves, side: Tile.AppleLeaves, bottom: Tile.AppleLeaves }, 0.4, 'shears', {
    id: BlockId.AppleLeaves,
    opaque: false,
    drops: 113, // ItemId.Apple
  }),
  [BlockId.TNT]: def('TNT', { top: Tile.TNTTop, side: Tile.TNTSide, bottom: Tile.TNTTop }, 0.3, null, {
    id: BlockId.TNT,
  }),
  [BlockId.Fence]: def('Fence', uniform(Tile.Fence), 1.5, 'axe', {
    id: BlockId.Fence,
    opaque: false,
  }),
  [BlockId.DiamondOre]: def('Diamond Ore', uniform(Tile.DiamondOreSide), 7, 'pickaxe', {
    id: BlockId.DiamondOre,
    drops: 201, // ItemId.Diamond — drops the gem, not the ore block itself
  }),
  // Molten rock pooled in the deepest stone. Not solid (you sink into it) and
  // Infinity hardness so no tool can ever break or collect it.
  [BlockId.Lava]: def('Lava', uniform(Tile.Lava), Infinity, null, {
    id: BlockId.Lava,
    solid: false,
    emissive: true,
  }),
  // Robot worlds pave their surface with riveted alloy instead of grass.
  [BlockId.MetalPanel]: def('Metal Panel', { top: Tile.MetalPanelTop, side: Tile.MetalPanelSide, bottom: Tile.MetalPanelSide }, 1.2, 'pickaxe', {
    id: BlockId.MetalPanel,
  }),
  // A supply tin standing on the surface of a robot world — the world's food
  // source. Breaking it opens the can (it drops the food, never the tin).
  [BlockId.CannedFood]: def('Canned Food', { top: Tile.CanTop, side: Tile.CanSide, bottom: Tile.CanSide }, 0.6, null, {
    id: BlockId.CannedFood,
    drops: 119, // ItemId.CannedFood — the meal inside, not the container
  }),
  // The robot world's fencing. It is never an item of its own: it drops (and is
  // placed from) the ordinary Fence, so a bag of fencing works in either world.
  [BlockId.MetalFence]: def('Metal Fence', uniform(Tile.MetalFence), 1.5, 'pickaxe', {
    id: BlockId.MetalFence,
    opaque: false,
    drops: BlockId.Fence,
  }),
  [BlockId.HullPlate]: def('Hull Plate', uniform(Tile.HullPlate), 2, 'pickaxe', { id: BlockId.HullPlate }),
}

/** Blocks that exist in the world but can never be held or placed. */
export const NON_ITEM_BLOCKS: ReadonlySet<number> = new Set<number>([
  BlockId.Lava,
  BlockId.CannedFood,
  BlockId.MetalFence,
])

export function isOpaque(id: number): boolean {
  return BLOCKS[id as BlockId]?.opaque ?? false
}

export function isSolid(id: number): boolean {
  return BLOCKS[id as BlockId]?.solid ?? false
}

export function blockDef(id: number): BlockDef | null {
  return BLOCKS[id as BlockId] ?? null
}
