import { mulberry32 } from '../core/rng'
import type { Inventory } from './inventory'
import { itemDef, ItemId } from './items'

/** How many rotating goods the stall offers alongside the permanent smithy. */
export const MARKET_COUNT = 8
const MARKET_SEED = 0xf4a921

export interface StockEntry {
  itemId: number
  name: string
  desc: string
  price: number
  /** Units the trader has in stock for the current rotation. */
  qty: number
  /** What the price is paid in (default gold). */
  currency?: 'gold' | 'diamond'
}

/** Smithy stock: always available, paid for with mined diamonds. */
export const SMITHY: StockEntry[] = [
  {
    itemId: ItemId.IronBlade,
    name: 'Iron Blade',
    desc: 'Smithing material. Combine with your Sword in the crafting menu to forge an Iron Sword (double damage).',
    price: 4,
    qty: 1,
    currency: 'diamond',
  },
  {
    itemId: ItemId.DiamondEdge,
    name: 'Diamond Edge',
    desc: 'Smithing material. Combine with an Iron Sword in the crafting menu to forge a Diamond Sword (the strongest weapon).',
    price: 8,
    qty: 1,
    currency: 'diamond',
  },
]

export const POOL: StockEntry[] = [
  { itemId: ItemId.Stone, name: 'Stone', desc: 'Sturdy building material. Mine from hills.', price: 5, qty: 10 },
  { itemId: ItemId.Wood, name: 'Wood', desc: 'Cut trees to get more. Crafts into planks.', price: 8, qty: 5 },
  { itemId: ItemId.Sand, name: 'Sand', desc: 'Found near water shores and rivers.', price: 3, qty: 15 },
  { itemId: ItemId.Brick, name: 'Brick', desc: 'Durable construction block for walls.', price: 12, qty: 8 },
  { itemId: ItemId.Plank, name: 'Plank', desc: 'Versatile wood material. Craft from wood.', price: 10, qty: 8 },
  { itemId: ItemId.Glass, name: 'Glass', desc: 'Lets light through walls. Craft from sand.', price: 15, qty: 6 },
  { itemId: ItemId.Apple, name: 'Apple', desc: 'Tames pigs when fed. Fall from leaf trees.', price: 5, qty: 10 },
  { itemId: ItemId.Fish, name: 'Fish', desc: 'Tames cats when fed. Catch with a net.', price: 8, qty: 8 },
  { itemId: ItemId.Wheat, name: 'Wheat', desc: 'Tames sheep and horses when fed.', price: 6, qty: 10 },
  { itemId: ItemId.Carrot, name: 'Carrot', desc: 'Tames rabbits when fed.', price: 6, qty: 10 },
  { itemId: ItemId.Seeds, name: 'Seeds', desc: 'Tames chickens when fed.', price: 4, qty: 12 },
  { itemId: ItemId.Bone, name: 'Bone', desc: 'Tames dogs when fed. Found by mining leaves.', price: 10, qty: 8 },
  { itemId: ItemId.Egg, name: 'Egg', desc: 'Cooking ingredient. Tamed chickens lay one every 2 days.', price: 6, qty: 8 },
  { itemId: ItemId.CookedFish, name: 'Cooked Fish', desc: 'Eat to restore 40 energy. Craft from fish + wood.', price: 14, qty: 6 },
  { itemId: ItemId.FishStew, name: 'Fish Stew', desc: 'Hearty dish — restores 80 energy when eaten.', price: 30, qty: 3 },
  { itemId: ItemId.CannedFood, name: 'Canned Food', desc: 'Sealed ration — restores 45 energy. Tins stand around in robot worlds.', price: 16, qty: 6 },
  { itemId: ItemId.Fence, name: 'Fence', desc: 'Classic wooden fencing for pens and yards.', price: 6, qty: 12 },
  { itemId: ItemId.WoodPickaxe, name: 'Wood Pickaxe', desc: 'Speeds up mining stone blocks 4×.', price: 30, qty: 2 },
  { itemId: ItemId.StonePickaxe, name: 'Stone Pickaxe', desc: 'Fastest stone-mining tool (8×).', price: 60, qty: 1 },
  { itemId: ItemId.Axe, name: 'Axe', desc: 'Chop wood and planks quickly (4×).', price: 40, qty: 1 },
  { itemId: ItemId.Shears, name: 'Shears', desc: 'Harvest leaves quickly (8×).', price: 45, qty: 1 },
  { itemId: ItemId.Net, name: 'Fishing Net', desc: 'Right-click over water to catch fish.', price: 50, qty: 1 },
  { itemId: ItemId.Door, name: 'Door', desc: 'Place at doorways. Right-click to open/close.', price: 25, qty: 3 },
  { itemId: ItemId.Desk, name: 'Desk', desc: 'Decorative home furniture.', price: 35, qty: 2 },
  { itemId: ItemId.Chair, name: 'Chair', desc: 'A seat for your home.', price: 20, qty: 3 },
  { itemId: ItemId.Bed, name: 'Bed', desc: 'Cozy sleeping furniture.', price: 45, qty: 2 },
  { itemId: ItemId.Sofa, name: 'Sofa', desc: 'Comfortable lounge seating.', price: 40, qty: 2 },
  { itemId: ItemId.Window, name: 'Window', desc: 'See through walls in your home.', price: 22, qty: 4 },
  { itemId: ItemId.Chest, name: 'Chest', desc: 'Store up to 27 extra items.', price: 15, qty: 3 },
  { itemId: ItemId.Ladder, name: 'Ladder', desc: 'Climb vertical walls. Place on block faces.', price: 8, qty: 10 },
  { itemId: ItemId.CapturedHorse, name: 'Horse', desc: 'Release and right-click to ride. Fastest travel. Feed wheat to keep tamed.', price: 80, qty: 1 },
]

/** The trader's margin: goods sell back for this share of the shelf price. */
const SELL_RATE = 0.5

/**
 * What the trader pays for goods that never appear on the shelves, so anything
 * a player can carry has an honest price rather than a token one.
 */
const EXTRA_VALUE: Record<number, number> = {
  [ItemId.Dirt]: 1,
  [ItemId.Grass]: 1,
  [ItemId.Leaves]: 1,
  [ItemId.TNT]: 3,
  [ItemId.Diamond]: 40,
  [ItemId.Sword]: 20,
  [ItemId.IronSword]: 60,
  [ItemId.DiamondSword]: 150,
  [ItemId.CapturedPig]: 25,
  [ItemId.CapturedChicken]: 18,
  [ItemId.CapturedSheep]: 25,
  [ItemId.CapturedRabbit]: 18,
  [ItemId.CapturedCat]: 30,
  [ItemId.CapturedDog]: 30,
}

const POOL_PRICE = new Map(POOL.map((e) => [e.itemId, e.price]))

/**
 * Gold the trader pays for one unit, or null for things they will not buy.
 * Gold itself is the currency, and the smithy's blades are diamond-only goods.
 */
export function sellValue(itemId: number): number | null {
  if (itemId === ItemId.Gold) return null
  if (!itemDef(itemId)) return null
  if (itemId === ItemId.IronBlade) return 25
  if (itemId === ItemId.DiamondEdge) return 50
  const extra = EXTRA_VALUE[itemId]
  if (extra !== undefined) return extra
  const shelf = POOL_PRICE.get(itemId)
  if (shelf !== undefined) return Math.max(1, Math.floor(shelf * SELL_RATE))
  return 2
}

export interface SellLot {
  itemId: number
  name: string
  /** Total the player is carrying. */
  count: number
  /** Gold per unit. */
  unit: number
}

/** Everything in the player's bags the trader will buy, richest lots first. */
export function sellableLots(inventory: Inventory): SellLot[] {
  const totals = new Map<number, number>()
  for (const slot of inventory.slots) {
    if (!slot) continue
    if (sellValue(slot.itemId) === null) continue
    totals.set(slot.itemId, (totals.get(slot.itemId) ?? 0) + slot.count)
  }
  const lots: SellLot[] = []
  for (const [itemId, count] of totals) {
    lots.push({ itemId, name: itemDef(itemId)?.name ?? 'Item', count, unit: sellValue(itemId)! })
  }
  return lots.sort((a, b) => b.unit * b.count - a.unit * a.count)
}

/**
 * Take `count` of an item out of the bags and pay for it.
 * Returns the gold earned (0 when the player does not have that many).
 */
export function sellItems(inventory: Inventory, itemId: number, count: number): number {
  const unit = sellValue(itemId)
  if (unit === null || count <= 0) return 0
  if (inventory.countOf(itemId) < count) return 0
  let remaining = count
  for (let i = 0; i < inventory.slots.length && remaining > 0; i++) {
    const slot = inventory.slots[i]
    if (slot?.itemId !== itemId) continue
    const take = Math.min(slot.count, remaining)
    inventory.removeFrom(i, take)
    remaining -= take
  }
  const earned = unit * count
  inventory.add(ItemId.Gold, earned)
  return earned
}

/**
 * Spend currency from the bags. Returns false (changing nothing) when the
 * player cannot cover the cost.
 */
export function spendCurrency(inventory: Inventory, currency: number, amount: number): boolean {
  if (inventory.countOf(currency) < amount) return false
  let remaining = amount
  for (let i = 0; i < inventory.slots.length && remaining > 0; i++) {
    const slot = inventory.slots[i]
    if (slot?.itemId !== currency) continue
    const take = Math.min(slot.count, remaining)
    inventory.removeFrom(i, take)
    remaining -= take
  }
  return true
}

/** Stall stock for a world at a given hour: the smithy plus a rotating shelf. */
export function rotatingStock(worldSeed: number, hourStamp: number): StockEntry[] {
  const rng = mulberry32(worldSeed ^ MARKET_SEED ^ hourStamp)
  const arr = [...POOL]
  // Fisher-Yates shuffle seeded by world + hour
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  // The smithy is always open; the rotating stock follows it.
  return [...SMITHY, ...arr.slice(0, MARKET_COUNT)].map((e) => ({ ...e }))
}
