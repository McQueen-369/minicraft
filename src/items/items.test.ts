import { describe, expect, it } from 'vitest'
import { BlockId } from '../core/blocks'
import { ItemId, itemCategory, itemDef, furnitureItemFor } from './items'

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

  it('carries campfires as furniture, so one can be picked up and placed again', () => {
    expect(furnitureItemFor('campfire')).toBe(ItemId.Campfire)
    expect(itemDef(ItemId.Campfire)?.furniture).toBe('campfire')
    expect(itemCategory(ItemId.Campfire)).toBe('furniture')
  })

  it('leaves world fixtures unplaceable — they have no bag item', () => {
    expect(furnitureItemFor('market')).toBeUndefined()
    expect(furnitureItemFor('arcadePuzzle')).toBeUndefined()
  })
})
