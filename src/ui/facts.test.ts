import { beforeEach, describe, expect, it } from 'vitest'
import { BlockId } from '../core/blocks'
import { ItemId, type AnimalKind } from '../items/items'
import { allFacts, animalFact, factsForAnimal, itemFact, resetFactRotation } from './facts'
import { animalInfo, itemInfo } from './info'

const ANIMALS: AnimalKind[] = ['pig', 'chicken', 'sheep', 'rabbit', 'cat', 'dog', 'horse', 'villager', 'zombie']

beforeEach(() => resetFactRotation())

describe('fun facts', () => {
  it('has a fact for every animal in the game', () => {
    for (const kind of ANIMALS) {
      expect(animalFact(kind), kind).toBeTruthy()
    }
  })

  it('covers plants, foods and materials', () => {
    const subjects = [
      BlockId.Leaves,
      BlockId.AppleLeaves,
      BlockId.Wood,
      BlockId.Grass,
      BlockId.Stone,
      BlockId.Sand,
      BlockId.Glass,
      BlockId.Brick,
      BlockId.GoldOre,
      BlockId.DiamondOre,
      BlockId.Lava,
      ItemId.Apple,
      ItemId.Wheat,
      ItemId.Carrot,
      ItemId.Seeds,
      ItemId.Gold,
      ItemId.Diamond,
    ]
    for (const id of subjects) {
      expect(itemFact(id), String(id)).toBeTruthy()
    }
  })

  it('returns null for subjects with no fact rather than inventing one', () => {
    expect(itemFact(999999)).toBeNull()
  })

  it('rotates through a subject\'s facts on repeat viewings', () => {
    const known = factsForAnimal('pig')
    expect(known.length).toBeGreaterThan(1)
    const shown = known.map(() => animalFact('pig'))
    expect(shown).toEqual([...known])
    // Wraps around rather than running dry.
    expect(animalFact('pig')).toBe(known[0])
  })

  it('writes facts as complete, non-trivial sentences', () => {
    for (const fact of allFacts()) {
      expect(fact.length).toBeGreaterThan(30)
      expect(fact.endsWith('.')).toBe(true)
    }
  })
})

describe('info cards carry facts', () => {
  it('attaches a fact to an animal card without losing its instructions', () => {
    const card = animalInfo('sheep')
    expect(card.title).toBe('Sheep')
    expect(card.lines.length).toBeGreaterThan(0)
    expect(card.fact).toBeTruthy()
  })

  it('attaches a fact to a material card', () => {
    const card = itemInfo(BlockId.DiamondOre)
    expect(card.lines.length).toBeGreaterThan(0)
    expect(card.fact).toBeTruthy()
  })

  it('describes lava, which has no item form', () => {
    const card = itemInfo(BlockId.Lava)
    expect(card.title).toBe('Lava')
    expect(card.lines.join(' ')).toMatch(/cannot be mined/i)
    expect(card.fact).toBeTruthy()
  })

  it('leaves cards without a known fact undecorated', () => {
    expect(itemInfo(ItemId.IronBlade).fact).toBeUndefined()
  })
})
