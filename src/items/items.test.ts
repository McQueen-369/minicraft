import { describe, expect, it } from 'vitest'
import { BlockId } from '../core/blocks'
import { ItemId, itemCategory } from './items'

describe('itemCategory', () => {
  it('groups blocks, tools, food and captured animals', () => {
    expect(itemCategory(BlockId.Stone)).toBe('blocks')
    expect(itemCategory(BlockId.Chest)).toBe('blocks')
    expect(itemCategory(ItemId.WoodPickaxe)).toBe('tools')
    expect(itemCategory(ItemId.Shears)).toBe('tools')
    expect(itemCategory(ItemId.Wheat)).toBe('food')
    expect(itemCategory(ItemId.CapturedPig)).toBe('animals')
  })

  it('defaults unknown items to blocks', () => {
    expect(itemCategory(99999)).toBe('blocks')
  })
})
