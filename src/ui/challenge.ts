/**
 * Difficulty tiers for the secret island's challenges.
 *
 * Every kiosk asks the player to choose a tier before the first move. The tier
 * changes the game itself (grid size, pace, number range, lives) *and* what a
 * win pays: the reward multiplier is the whole point of picking Hard.
 */

export type Difficulty = 'easy' | 'normal' | 'hard'

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard']

/** Prize bundle granted for winning a mini-game. */
export interface Prize {
  itemId: number
  count: number
}

export interface DifficultyMeta {
  label: string
  badge: string
  /** Accent for the tier's button. */
  colour: string
  /** How much a win pays relative to the Normal tier. */
  rewardMultiplier: number
  /** One line of expectation-setting under the button. */
  blurb: string
}

export const DIFFICULTY_META: Record<Difficulty, DifficultyMeta> = {
  easy: {
    label: 'Easy',
    badge: '🌱',
    colour: '#27ae60',
    rewardMultiplier: 0.5,
    blurb: 'A gentle round. Half the usual reward.',
  },
  normal: {
    label: 'Normal',
    badge: '⚖️',
    colour: '#2e86de',
    rewardMultiplier: 1,
    blurb: 'The standard challenge and the standard payout.',
  },
  hard: {
    label: 'Hard',
    badge: '🔥',
    colour: '#e74c3c',
    rewardMultiplier: 2.5,
    blurb: 'A real test — pays two and a half times as much.',
  },
}

export interface PuzzleRules {
  /** Tiles per side: 3 → the classic 8-puzzle, 4 → a 15-puzzle. */
  size: number
  /** Random-walk length used to shuffle from the solved state. */
  shuffle: number
  /** Solving in this many moves or fewer earns the top prize tier. */
  swiftMoves: number
}

export interface RunnerRules {
  /** Points needed to win anything at all. */
  target: number
  /** Starting scroll speed in pixels per second. */
  speed: number
  /** Multiplier on the gap between cacti — smaller means tighter. */
  spacing: number
}

export interface MathRules {
  questions: number
  lives: number
  /** Correct answers needed to win. */
  target: number
  /** Highest operator tier used: 0 = + −, 1 = adds ×, 2 = adds ÷ and two-step sums. */
  topLevel: number
  /** Scales the size of the numbers in every question. */
  range: number
}

export interface WordRules {
  lives: number
  /** Inclusive word-length window this tier draws from. */
  minLength: number
  maxLength: number
  /** Whether the hint is shown before the first wrong guess. */
  hintUpFront: boolean
}

export interface ChallengeRules {
  puzzle: PuzzleRules
  runner: RunnerRules
  math: MathRules
  word: WordRules
}

const RULES: Record<Difficulty, ChallengeRules> = {
  easy: {
    puzzle: { size: 3, shuffle: 25, swiftMoves: 60 },
    runner: { target: 80, speed: 130, spacing: 1.35 },
    math: { questions: 8, lives: 5, target: 4, topLevel: 0, range: 1 },
    word: { lives: 8, minLength: 4, maxLength: 6, hintUpFront: true },
  },
  normal: {
    puzzle: { size: 3, shuffle: 120, swiftMoves: 40 },
    runner: { target: 150, speed: 170, spacing: 1 },
    math: { questions: 10, lives: 3, target: 6, topLevel: 2, range: 1 },
    word: { lives: 6, minLength: 6, maxLength: 8, hintUpFront: true },
  },
  hard: {
    puzzle: { size: 4, shuffle: 260, swiftMoves: 90 },
    runner: { target: 240, speed: 215, spacing: 0.72 },
    math: { questions: 12, lives: 2, target: 8, topLevel: 3, range: 2.2 },
    word: { lives: 4, minLength: 8, maxLength: 20, hintUpFront: false },
  },
}

export function difficultyRules(d: Difficulty): ChallengeRules {
  return RULES[d]
}

/**
 * Scale a prize bundle by the tier's multiplier. Counts always stay at least 1
 * so an Easy win is smaller but never empty, and fractions round to the nearest
 * whole item.
 */
export function scalePrizes(prizes: Prize[], d: Difficulty): Prize[] {
  const mult = DIFFICULTY_META[d].rewardMultiplier
  return prizes.map((p) => ({ itemId: p.itemId, count: Math.max(1, Math.round(p.count * mult)) }))
}

/** Human-readable summary of what a tier pays, for the kiosk header. */
export function rewardLine(d: Difficulty, baseGold: number, extra: string): string {
  const gold = Math.max(1, Math.round(baseGold * DIFFICULTY_META[d].rewardMultiplier))
  return `Up to ${gold} gold + ${extra}`
}
