import { describe, it, expect } from 'vitest'
import { getComboMultiplier, calcJudgment, calcPoints } from './scoring'

describe('getComboMultiplier', () => {
  it('returns ×1 for combo 0', () => expect(getComboMultiplier(0)).toBe(1))
  it('returns ×1 for combo 9', () => expect(getComboMultiplier(9)).toBe(1))
  it('returns ×2 for combo 10', () => expect(getComboMultiplier(10)).toBe(2))
  it('returns ×2 for combo 24', () => expect(getComboMultiplier(24)).toBe(2))
  it('returns ×3 for combo 25', () => expect(getComboMultiplier(25)).toBe(3))
  it('returns ×4 for combo 50', () => expect(getComboMultiplier(50)).toBe(4))
  it('returns ×4 for combo 999', () => expect(getComboMultiplier(999)).toBe(4))
})

describe('calcJudgment', () => {
  it('returns PERFECT within 55ms', () => expect(calcJudgment(0)).toBe('PERFECT'))
  it('returns PERFECT at exactly 55ms', () => expect(calcJudgment(55)).toBe('PERFECT'))
  it('returns GOOD at 56ms', () => expect(calcJudgment(56)).toBe('GOOD'))
  it('returns GOOD at 110ms', () => expect(calcJudgment(110)).toBe('GOOD'))
  it('returns MISS at 111ms', () => expect(calcJudgment(111)).toBe('MISS'))
  it('handles negative offset (early hit)', () => expect(calcJudgment(-30)).toBe('PERFECT'))
})

describe('calcPoints', () => {
  it('PERFECT at combo 0 = 100', () => expect(calcPoints('PERFECT', 0)).toBe(100))
  it('PERFECT at combo 10 = 200', () => expect(calcPoints('PERFECT', 10)).toBe(200))
  it('PERFECT at combo 50 = 400', () => expect(calcPoints('PERFECT', 50)).toBe(400))
  it('GOOD always = 50', () => {
    expect(calcPoints('GOOD', 0)).toBe(50)
    expect(calcPoints('GOOD', 100)).toBe(50)
  })
  it('MISS always = 0', () => expect(calcPoints('MISS', 0)).toBe(0))
})
