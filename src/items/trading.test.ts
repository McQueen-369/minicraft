import { describe, expect, it } from 'vitest'
import { Inventory } from './inventory'
import { ItemId } from './items'
import { MARKET_COUNT, POOL, rotatingStock, sellableLots, sellItems, sellValue, SMITHY, spendCurrency } from './trading'

describe('sellValue', () => {
  it('pays half the shelf price for goods the stall also sells', () => {
    const stone = POOL.find((e) => e.itemId === ItemId.Stone)!
    expect(sellValue(ItemId.Stone)).toBe(Math.floor(stone.price / 2))
  })

  it('prices goods that never appear on the shelves', () => {
    expect(sellValue(ItemId.Diamond)).toBeGreaterThan(0)
    expect(sellValue(ItemId.DiamondSword)).toBeGreaterThan(sellValue(ItemId.IronSword)!)
    expect(sellValue(ItemId.IronSword)).toBeGreaterThan(sellValue(ItemId.Sword)!)
  })

  it('never pays less than 1 gold for a real item', () => {
    for (const entry of POOL) expect(sellValue(entry.itemId)).toBeGreaterThanOrEqual(1)
  })

  it('refuses gold itself and unknown items', () => {
    expect(sellValue(ItemId.Gold)).toBeNull()
    expect(sellValue(9999)).toBeNull()
  })

  it('buys goods back for less than it sells them', () => {
    for (const entry of POOL) expect(sellValue(entry.itemId)!).toBeLessThan(entry.price)
  })
})

describe('sellItems', () => {
  it('hands over the goods and pays gold', () => {
    const inv = new Inventory()
    inv.add(ItemId.Stone, 20)
    const earned = sellItems(inv, ItemId.Stone, 5)
    expect(earned).toBe(sellValue(ItemId.Stone)! * 5)
    expect(inv.countOf(ItemId.Stone)).toBe(15)
    expect(inv.countOf(ItemId.Gold)).toBe(earned)
  })

  it('drains stacks across several slots', () => {
    const inv = new Inventory()
    inv.slots[0] = { itemId: ItemId.Apple, count: 3 }
    inv.slots[5] = { itemId: ItemId.Apple, count: 4 }
    const earned = sellItems(inv, ItemId.Apple, 7)
    expect(earned).toBe(sellValue(ItemId.Apple)! * 7)
    expect(inv.countOf(ItemId.Apple)).toBe(0)
    expect(inv.slots.some((s) => s?.itemId === ItemId.Apple)).toBe(false)
  })

  it('changes nothing when the player is short', () => {
    const inv = new Inventory()
    inv.add(ItemId.Stone, 2)
    expect(sellItems(inv, ItemId.Stone, 3)).toBe(0)
    expect(inv.countOf(ItemId.Stone)).toBe(2)
    expect(inv.countOf(ItemId.Gold)).toBe(0)
  })

  it('refuses to buy the player’s gold', () => {
    const inv = new Inventory()
    inv.add(ItemId.Gold, 10)
    expect(sellItems(inv, ItemId.Gold, 5)).toBe(0)
    expect(inv.countOf(ItemId.Gold)).toBe(10)
  })
})

describe('sellableLots', () => {
  it('merges duplicate stacks and hides the currency', () => {
    const inv = new Inventory()
    inv.slots[0] = { itemId: ItemId.Stone, count: 30 }
    inv.slots[1] = { itemId: ItemId.Stone, count: 12 }
    inv.slots[2] = { itemId: ItemId.Gold, count: 99 }
    const lots = sellableLots(inv)
    expect(lots).toHaveLength(1)
    expect(lots[0]).toMatchObject({ itemId: ItemId.Stone, count: 42, unit: sellValue(ItemId.Stone)! })
  })

  it('lists the most valuable haul first', () => {
    const inv = new Inventory()
    inv.add(ItemId.Sand, 3)
    inv.add(ItemId.Diamond, 2)
    expect(sellableLots(inv)[0].itemId).toBe(ItemId.Diamond)
  })
})

describe('spendCurrency', () => {
  it('takes the exact price across slots', () => {
    const inv = new Inventory()
    inv.slots[0] = { itemId: ItemId.Gold, count: 4 }
    inv.slots[3] = { itemId: ItemId.Gold, count: 10 }
    expect(spendCurrency(inv, ItemId.Gold, 12)).toBe(true)
    expect(inv.countOf(ItemId.Gold)).toBe(2)
  })

  it('leaves the bags untouched when the player cannot pay', () => {
    const inv = new Inventory()
    inv.add(ItemId.Diamond, 3)
    expect(spendCurrency(inv, ItemId.Diamond, 4)).toBe(false)
    expect(inv.countOf(ItemId.Diamond)).toBe(3)
  })
})

describe('rotatingStock', () => {
  it('always opens the smithy and fills the shelf', () => {
    const stock = rotatingStock(7, 1000)
    expect(stock).toHaveLength(SMITHY.length + MARKET_COUNT)
    expect(stock.slice(0, SMITHY.length).map((e) => e.itemId)).toEqual(SMITHY.map((e) => e.itemId))
  })

  it('is stable within an hour and rotates between hours', () => {
    const a = rotatingStock(7, 1000).map((e) => e.itemId)
    expect(rotatingStock(7, 1000).map((e) => e.itemId)).toEqual(a)
    expect(rotatingStock(7, 1001).map((e) => e.itemId)).not.toEqual(a)
  })

  it('hands out copies so depleting stock cannot corrupt the pool', () => {
    const stock = rotatingStock(7, 1000)
    const entry = stock[stock.length - 1]
    const original = POOL.find((e) => e.itemId === entry.itemId)!.qty
    entry.qty = 0
    expect(POOL.find((e) => e.itemId === entry.itemId)!.qty).toBe(original)
  })

  it('never lists the same good twice', () => {
    const ids = rotatingStock(99, 42).map((e) => e.itemId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
