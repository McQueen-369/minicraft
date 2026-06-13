import { MAX_STACK } from '../constants'
import { BlockId, blockDef, type ToolType } from '../core/blocks'

export type AnimalKind = 'pig' | 'chicken' | 'sheep'

export const ItemId = {
  // Items 1..99 are placeable blocks and share BlockId values.
  Grass: BlockId.Grass,
  Dirt: BlockId.Dirt,
  Stone: BlockId.Stone,
  Sand: BlockId.Sand,
  Wood: BlockId.Wood,
  Leaves: BlockId.Leaves,
  Plank: BlockId.Plank,
  Brick: BlockId.Brick,
  Glass: BlockId.Glass,
  Chest: BlockId.Chest,
  WoodPickaxe: 100,
  StonePickaxe: 101,
  Axe: 102,
  Shears: 103,
  Wheat: 110,
  Carrot: 111,
  Seeds: 112,
  CapturedPig: 120,
  CapturedChicken: 121,
  CapturedSheep: 122,
} as const

export type ItemId = (typeof ItemId)[keyof typeof ItemId]

export interface Slot {
  itemId: number
  count: number
}

export type ChestContents = (Slot | null)[]

export interface ItemDef {
  name: string
  kind: 'block' | 'tool' | 'food' | 'capture'
  block?: BlockId
  tool?: { type: ToolType; power: number }
  /** Which animal this food tames. */
  food?: AnimalKind
  /** Which animal a capture item releases. */
  animal?: AnimalKind
  maxStack: number
}

const ITEMS = new Map<number, ItemDef>()

for (const id of Object.values(BlockId)) {
  const def = blockDef(id)
  if (def) ITEMS.set(id, { name: def.name, kind: 'block', block: id, maxStack: MAX_STACK })
}
ITEMS.set(ItemId.WoodPickaxe, { name: 'Wood Pickaxe', kind: 'tool', tool: { type: 'pickaxe', power: 4 }, maxStack: 1 })
ITEMS.set(ItemId.StonePickaxe, { name: 'Stone Pickaxe', kind: 'tool', tool: { type: 'pickaxe', power: 8 }, maxStack: 1 })
ITEMS.set(ItemId.Axe, { name: 'Axe', kind: 'tool', tool: { type: 'axe', power: 4 }, maxStack: 1 })
ITEMS.set(ItemId.Shears, { name: 'Shears', kind: 'tool', tool: { type: 'shears', power: 8 }, maxStack: 1 })
ITEMS.set(ItemId.Wheat, { name: 'Wheat', kind: 'food', food: 'sheep', maxStack: MAX_STACK })
ITEMS.set(ItemId.Carrot, { name: 'Carrot', kind: 'food', food: 'pig', maxStack: MAX_STACK })
ITEMS.set(ItemId.Seeds, { name: 'Seeds', kind: 'food', food: 'chicken', maxStack: MAX_STACK })
ITEMS.set(ItemId.CapturedPig, { name: 'Pig (captured)', kind: 'capture', animal: 'pig', maxStack: 1 })
ITEMS.set(ItemId.CapturedChicken, { name: 'Chicken (captured)', kind: 'capture', animal: 'chicken', maxStack: 1 })
ITEMS.set(ItemId.CapturedSheep, { name: 'Sheep (captured)', kind: 'capture', animal: 'sheep', maxStack: 1 })

export function itemDef(id: number): ItemDef | null {
  return ITEMS.get(id) ?? null
}

export function captureItemFor(kind: AnimalKind): ItemId {
  return kind === 'pig' ? ItemId.CapturedPig : kind === 'chicken' ? ItemId.CapturedChicken : ItemId.CapturedSheep
}

/** Seconds of holding the mouse to break a block with the held item. */
export function breakTime(blockId: number, heldItemId: number | null): number {
  const block = blockDef(blockId)
  if (!block) return Infinity
  const held = heldItemId !== null ? itemDef(heldItemId) : null
  const power = block.tool && held?.tool?.type === block.tool ? held.tool.power : 1
  return block.hardness / power
}
