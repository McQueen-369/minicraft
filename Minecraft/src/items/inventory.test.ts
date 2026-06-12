import { describe, expect, it } from 'vitest'
import { MAX_STACK } from '../constants'
import { Inventory } from './inventory'
import { ItemId, breakTime, type Slot } from './items'

describe('Inventory', () => {
  it('stacks items up to the max stack size', () => {
    const inv = new Inventory()
    expect(inv.add(ItemId.Dirt, 60)).toBe(0)
    expect(inv.add(ItemId.Dirt, 10)).toBe(0)
    expect(inv.slots[0]).toEqual({ itemId: ItemId.Dirt, count: MAX_STACK })
    expect(inv.slots[1]).toEqual({ itemId: ItemId.Dirt, count: 6 })
    expect(inv.countOf(ItemId.Dirt)).toBe(70)
  })

  it('does not stack tools', () => {
    const inv = new Inventory()
    inv.add(ItemId.Axe, 2)
    expect(inv.slots[0]).toEqual({ itemId: ItemId.Axe, count: 1 })
    expect(inv.slots[1]).toEqual({ itemId: ItemId.Axe, count: 1 })
  })

  it('reports leftover when full', () => {
    const inv = new Inventory()
    for (let i = 0; i < inv.slots.length; i++) inv.slots[i] = { itemId: ItemId.Stone, count: MAX_STACK }
    expect(inv.add(ItemId.Stone, 5)).toBe(5)
    expect(inv.add(ItemId.Dirt, 5)).toBe(5)
  })

  it('removes from slots and clears empties', () => {
    const inv = new Inventory()
    inv.add(ItemId.Sand, 2)
    inv.removeFrom(0)
    expect(inv.slots[0]).toEqual({ itemId: ItemId.Sand, count: 1 })
    inv.removeFrom(0)
    expect(inv.slots[0]).toBeNull()
  })

  it('wraps hotbar scrolling in both directions', () => {
    const inv = new Inventory()
    inv.scrollHotbar(-1)
    expect(inv.selected).toBe(8)
    inv.scrollHotbar(1)
    expect(inv.selected).toBe(0)
  })

  it('transfers between slot arrays with merge and swap', () => {
    const a: (Slot | null)[] = [{ itemId: ItemId.Dirt, count: 10 }, { itemId: ItemId.Stone, count: 1 }]
    const b: (Slot | null)[] = [null, { itemId: ItemId.Dirt, count: 5 }]
    Inventory.transfer(a, 0, b, 0)
    expect(a[0]).toBeNull()
    expect(b[0]).toEqual({ itemId: ItemId.Dirt, count: 10 })
    Inventory.transfer(b, 0, b, 1)
    expect(b[1]).toEqual({ itemId: ItemId.Dirt, count: 15 })
    // Swap different item types.
    Inventory.transfer(a, 1, b, 1)
    expect(a[1]).toEqual({ itemId: ItemId.Dirt, count: 15 })
    expect(b[1]).toEqual({ itemId: ItemId.Stone, count: 1 })
  })

  it('serializes and reloads', () => {
    const inv = new Inventory()
    inv.add(ItemId.Brick, 12)
    inv.add(ItemId.Axe, 1)
    const copy = new Inventory()
    copy.load(inv.serialize())
    expect(copy.slots).toEqual(inv.slots)
  })
})

describe('breakTime', () => {
  it('is faster with the matching tool', () => {
    const hand = breakTime(3 /* Stone */, null)
    const pick = breakTime(3, ItemId.WoodPickaxe)
    const stonePick = breakTime(3, ItemId.StonePickaxe)
    const axe = breakTime(3, ItemId.Axe)
    expect(pick).toBeLessThan(hand)
    expect(stonePick).toBeLessThan(pick)
    expect(axe).toBe(hand)
  })

  it('is infinite for air', () => {
    expect(breakTime(0, null)).toBe(Infinity)
  })
})
