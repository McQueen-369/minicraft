import { MAX_STACK } from '../constants'
import { BlockId, blockDef, type ToolType } from '../core/blocks'
import type { FurnitureKind } from '../entities/furniture'

export type AnimalKind = 'pig' | 'chicken' | 'sheep' | 'rabbit' | 'cat' | 'dog'

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
  Apple: 113,
  Fish: 114,
  Bone: 115,
  CapturedRabbit: 123,
  CapturedCat: 124,
  CapturedDog: 125,
  Door: 130,
  Window: 131,
  Desk: 132,
  Chair: 133,
  Bed: 134,
  Sofa: 135,
} as const

export type ItemId = (typeof ItemId)[keyof typeof ItemId]

export interface Slot {
  itemId: number
  count: number
}

export type ChestContents = (Slot | null)[]

export interface ItemDef {
  name: string
  kind: 'block' | 'tool' | 'food' | 'capture' | 'furniture'
  block?: BlockId
  tool?: { type: ToolType; power: number }
  /** Which animal this food tames. */
  food?: AnimalKind
  /** Which animal a capture item releases. */
  animal?: AnimalKind
  /** Which furniture piece this item places. */
  furniture?: FurnitureKind
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
ITEMS.set(ItemId.Apple, { name: 'Apple', kind: 'food', food: 'rabbit', maxStack: MAX_STACK })
ITEMS.set(ItemId.Fish, { name: 'Fish', kind: 'food', food: 'cat', maxStack: MAX_STACK })
ITEMS.set(ItemId.Bone, { name: 'Bone', kind: 'food', food: 'dog', maxStack: MAX_STACK })
ITEMS.set(ItemId.CapturedRabbit, { name: 'Rabbit (captured)', kind: 'capture', animal: 'rabbit', maxStack: 1 })
ITEMS.set(ItemId.CapturedCat, { name: 'Cat (captured)', kind: 'capture', animal: 'cat', maxStack: 1 })
ITEMS.set(ItemId.CapturedDog, { name: 'Dog (captured)', kind: 'capture', animal: 'dog', maxStack: 1 })
ITEMS.set(ItemId.Door, { name: 'Door', kind: 'furniture', furniture: 'door', maxStack: 16 })
ITEMS.set(ItemId.Window, { name: 'Window', kind: 'furniture', furniture: 'window', maxStack: 16 })
ITEMS.set(ItemId.Desk, { name: 'Desk', kind: 'furniture', furniture: 'desk', maxStack: 16 })
ITEMS.set(ItemId.Chair, { name: 'Chair', kind: 'furniture', furniture: 'chair', maxStack: 16 })
ITEMS.set(ItemId.Bed, { name: 'Bed', kind: 'furniture', furniture: 'bed', maxStack: 16 })
ITEMS.set(ItemId.Sofa, { name: 'Sofa', kind: 'furniture', furniture: 'sofa', maxStack: 16 })

const FURNITURE_ITEM: Record<FurnitureKind, number> = {
  door: ItemId.Door,
  window: ItemId.Window,
  desk: ItemId.Desk,
  chair: ItemId.Chair,
  bed: ItemId.Bed,
  sofa: ItemId.Sofa,
}

/** The hotbar item that places a given furniture piece. */
export function furnitureItemFor(kind: FurnitureKind): number {
  return FURNITURE_ITEM[kind]
}

export function itemDef(id: number): ItemDef | null {
  return ITEMS.get(id) ?? null
}

export type ItemCategory = 'blocks' | 'tools' | 'food' | 'animals' | 'furniture'

/** Group an item into a bag category (used by the inventory sidebar). */
export function itemCategory(id: number): ItemCategory {
  switch (itemDef(id)?.kind) {
    case 'tool':
      return 'tools'
    case 'food':
      return 'food'
    case 'capture':
      return 'animals'
    case 'furniture':
      return 'furniture'
    default:
      return 'blocks'
  }
}

export function captureItemFor(kind: AnimalKind): ItemId {
  if (kind === 'pig') return ItemId.CapturedPig
  if (kind === 'chicken') return ItemId.CapturedChicken
  if (kind === 'rabbit') return ItemId.CapturedRabbit
  if (kind === 'cat') return ItemId.CapturedCat
  if (kind === 'dog') return ItemId.CapturedDog
  return ItemId.CapturedSheep
}

/** Seconds of holding the mouse to break a block with the held item. */
export function breakTime(blockId: number, heldItemId: number | null): number {
  const block = blockDef(blockId)
  if (!block) return Infinity
  const held = heldItemId !== null ? itemDef(heldItemId) : null
  const power = block.tool && held?.tool?.type === block.tool ? held.tool.power : 1
  return block.hardness / power
}
