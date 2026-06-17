import { CHEST_SLOTS } from '../constants'
import { BlockId } from '../core/blocks'
import { hash2D } from '../core/rng'
import { ItemId, type ChestContents } from './items'

/** Deterministic starter loot for a naturally generated chest. */
export function chestLoot(seed: number, x: number, z: number): ChestContents {
  const contents: ChestContents = new Array(CHEST_SLOTS).fill(null)
  const r = (salt: number) => hash2D(seed ^ salt, x, z)
  let slot = 0
  const put = (itemId: number, count: number) => {
    if (slot < CHEST_SLOTS) contents[slot++] = { itemId, count }
  }
  put(r(1) < 0.4 ? ItemId.StonePickaxe : ItemId.WoodPickaxe, 1)
  if (r(2) < 0.6) put(ItemId.Axe, 1)
  if (r(3) < 0.4) put(ItemId.Shears, 1)
  put(ItemId.Wheat, 2 + Math.floor(r(4) * 4))
  put(ItemId.Carrot, 2 + Math.floor(r(5) * 4))
  put(ItemId.Seeds, 2 + Math.floor(r(6) * 4))
  put(ItemId.Apple, 2 + Math.floor(r(15) * 4))
  if (r(16) < 0.5) put(ItemId.Fish, 1 + Math.floor(r(17) * 3))
  if (r(18) < 0.4) put(ItemId.Bone, 1 + Math.floor(r(19) * 4))
  if (r(7) < 0.5) put(ItemId.Brick, 4 + Math.floor(r(8) * 12))
  if (r(9) < 0.5) put(ItemId.Plank, 4 + Math.floor(r(10) * 12))
  if (r(11) < 0.3) put(ItemId.Glass, 2 + Math.floor(r(12) * 6))
  // A chance of a furniture piece to decorate your home.
  if (r(13) < 0.5) {
    const furniture = [ItemId.Chair, ItemId.Desk, ItemId.Bed, ItemId.Sofa, ItemId.Window, ItemId.Door]
    put(furniture[Math.floor(r(14) * furniture.length) % furniture.length], 1)
  }
  return contents
}

/** Instant loot from breaking/right-clicking a mystery box. */
export function mysteryBoxLoot(blockId: number): ChestContents {
  const contents: ChestContents = []
  const rand = () => Math.random()
  if (blockId === BlockId.MysteryBoxEpic) {
    contents.push({ itemId: ItemId.StonePickaxe, count: 1 })
    contents.push({ itemId: ItemId.Axe, count: 1 })
    contents.push({ itemId: ItemId.Shears, count: 1 })
    contents.push({ itemId: ItemId.Net, count: 1 })
    contents.push({ itemId: ItemId.Fish, count: 5 + Math.floor(rand() * 5) })
    contents.push({ itemId: ItemId.Apple, count: 5 + Math.floor(rand() * 5) })
    contents.push({ itemId: ItemId.Bone, count: 5 + Math.floor(rand() * 5) })
    const furniture = [ItemId.Chair, ItemId.Desk, ItemId.Bed, ItemId.Sofa, ItemId.Window, ItemId.Door]
    contents.push({ itemId: furniture[Math.floor(rand() * furniture.length)], count: 2 })
  } else if (blockId === BlockId.MysteryBoxRare) {
    if (rand() < 0.7) contents.push({ itemId: ItemId.StonePickaxe, count: 1 })
    else contents.push({ itemId: ItemId.WoodPickaxe, count: 1 })
    if (rand() < 0.6) contents.push({ itemId: ItemId.Axe, count: 1 })
    if (rand() < 0.5) contents.push({ itemId: ItemId.Net, count: 1 })
    contents.push({ itemId: ItemId.Fish, count: 2 + Math.floor(rand() * 4) })
    contents.push({ itemId: ItemId.Bone, count: 2 + Math.floor(rand() * 4) })
    if (rand() < 0.5) contents.push({ itemId: ItemId.Shears, count: 1 })
  } else {
    // Common teal mystery box
    contents.push({ itemId: ItemId.WoodPickaxe, count: 1 })
    if (rand() < 0.4) contents.push({ itemId: ItemId.Net, count: 1 })
    contents.push({ itemId: ItemId.Fish, count: 1 + Math.floor(rand() * 3) })
    contents.push({ itemId: ItemId.Apple, count: 3 + Math.floor(rand() * 4) })
    contents.push({ itemId: ItemId.Wheat, count: 3 + Math.floor(rand() * 4) })
  }
  return contents
}
