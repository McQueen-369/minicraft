import { describe, expect, it } from 'vitest'
import { ItemId } from '../items/items'
import {
  DIFFICULTIES,
  DIFFICULTY_META,
  difficultyRules,
  scalePrizes,
  type Difficulty,
} from './challenge'

describe('difficulty tiers', () => {
  it('offers easy, normal and hard', () => {
    expect([...DIFFICULTIES]).toEqual(['easy', 'normal', 'hard'])
  })

  it('pays strictly more the harder the tier', () => {
    const [easy, normal, hard] = DIFFICULTIES.map((d) => DIFFICULTY_META[d].rewardMultiplier)
    expect(easy).toBeLessThan(normal)
    expect(normal).toBeLessThan(hard)
  })

  it('scales prize counts by the tier multiplier', () => {
    const base = [{ itemId: ItemId.Gold, count: 20 }]
    expect(scalePrizes(base, 'easy')[0].count).toBe(10)
    expect(scalePrizes(base, 'normal')[0].count).toBe(20)
    expect(scalePrizes(base, 'hard')[0].count).toBe(50)
  })

  it('never scales a prize away to nothing', () => {
    const scaled = scalePrizes([{ itemId: ItemId.FishStew, count: 1 }], 'easy')
    expect(scaled[0].count).toBe(1)
    expect(scaled[0].itemId).toBe(ItemId.FishStew)
  })

  it('leaves the original bundle untouched', () => {
    const base = [{ itemId: ItemId.Gold, count: 10 }]
    scalePrizes(base, 'hard')
    expect(base[0].count).toBe(10)
  })
})

describe('challenge rules', () => {
  const tiers = DIFFICULTIES.map((d) => [d, difficultyRules(d)] as const)

  it('gives every tier a complete rule set', () => {
    for (const [, r] of tiers) {
      expect(r.puzzle.size).toBeGreaterThanOrEqual(3)
      expect(r.runner.target).toBeGreaterThan(0)
      expect(r.math.questions).toBeGreaterThan(0)
      expect(r.word.lives).toBeGreaterThan(0)
    }
  })

  it('makes each tier harder than the last', () => {
    const order: Difficulty[] = ['easy', 'normal', 'hard']
    for (let i = 1; i < order.length; i++) {
      const prev = difficultyRules(order[i - 1])
      const cur = difficultyRules(order[i])
      // Longer runs, tighter obstacles, fewer lives, bigger boards.
      expect(cur.runner.target).toBeGreaterThan(prev.runner.target)
      expect(cur.runner.speed).toBeGreaterThan(prev.runner.speed)
      expect(cur.runner.spacing).toBeLessThan(prev.runner.spacing)
      expect(cur.math.lives).toBeLessThan(prev.math.lives)
      expect(cur.math.target).toBeGreaterThan(prev.math.target)
      expect(cur.word.lives).toBeLessThan(prev.word.lives)
      expect(cur.puzzle.shuffle).toBeGreaterThan(prev.puzzle.shuffle)
    }
  })

  it('needs a winnable but not trivial score in every tier', () => {
    for (const [, r] of tiers) {
      expect(r.math.target).toBeGreaterThan(r.math.questions / 2 - 1)
      expect(r.math.target).toBeLessThanOrEqual(r.math.questions)
    }
  })

  it('keeps word length windows valid and ordered', () => {
    for (const [, r] of tiers) {
      expect(r.word.minLength).toBeLessThanOrEqual(r.word.maxLength)
    }
    expect(difficultyRules('hard').word.hintUpFront).toBe(false)
    expect(difficultyRules('easy').word.hintUpFront).toBe(true)
  })
})
