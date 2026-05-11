import { PERFECT_WINDOW, GOOD_WINDOW, GOOD_POINTS, COMBO_TIERS } from './constants'
import type { Judgment } from './types'

export function getComboMultiplier(combo: number): number {
  for (const tier of COMBO_TIERS) {
    if (combo >= tier.min && combo <= tier.max) return tier.multiplier
  }
  return 1
}

export function calcJudgment(offsetMs: number): Judgment {
  const abs = Math.abs(offsetMs)
  if (abs <= PERFECT_WINDOW) return 'PERFECT'
  if (abs <= GOOD_WINDOW)    return 'GOOD'
  return 'MISS'
}

export function calcPoints(judgment: Judgment, combo: number): number {
  if (judgment === 'MISS') return 0
  if (judgment === 'GOOD') return GOOD_POINTS
  return 100 * getComboMultiplier(combo)
}
