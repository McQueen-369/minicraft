import { describe, expect, it } from 'vitest'
import { BlockId } from '../core/blocks'
import { ItemId, itemCategory, furnitureItemFor } from './items'

describe('itemCategory', () => {
  it('groups blocks, tools, food, captured animals and furniture', () => {
    expect(itemCategory(BlockId.Stone)).toBe('blocks')
    expect(itemCategory(BlockId.Chest)).toBe('blocks')
    expect(itemCategory(ItemId.WoodPickaxe)).toBe('tools')
    expect(itemCategory(ItemId.Shears)).toBe('tools')
    expect(itemCategory(ItemId.Wheat)).toBe('food')
    expect(itemCategory(ItemId.CapturedPig)).toBe('animals')
    expect(itemCategory(ItemId.Sofa)).toBe('furniture')
  })

  it('defaults unknown items to blocks', () => {
    expect(itemCategory(99999)).toBe('blocks')
  })

  it('maps furniture kinds to their placement items', () => {
    expect(furnitureItemFor('door')).toBe(ItemId.Door)
    expect(furnitureItemFor('bed')).toBe(ItemId.Bed)
  })
})
