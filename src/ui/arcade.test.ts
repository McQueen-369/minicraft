import { describe, expect, it } from 'vitest'
import { mathQuestion, neighbors } from './arcade'

describe('sliding-puzzle neighbours', () => {
  it('finds the moves around a 3×3 board', () => {
    expect(neighbors(0, 3).sort()).toEqual([1, 3])
    expect(neighbors(4, 3).sort()).toEqual([1, 3, 5, 7])
    expect(neighbors(8, 3).sort()).toEqual([5, 7])
  })

  it('does not wrap around row edges on a 4×4 board', () => {
    // 3 is the end of row 0 and 4 the start of row 1 — never adjacent.
    expect(neighbors(3, 4)).not.toContain(4)
    expect(neighbors(4, 4)).not.toContain(3)
    expect(neighbors(5, 4).sort()).toEqual([1, 4, 6, 9])
  })

  it('keeps every neighbour on the board', () => {
    for (const n of [3, 4]) {
      for (let i = 0; i < n * n; i++) {
        for (const j of neighbors(i, n)) {
          expect(j).toBeGreaterThanOrEqual(0)
          expect(j).toBeLessThan(n * n)
        }
      }
    }
  })
})

describe('math questions', () => {
  it('states a question whose stated answer is correct', () => {
    for (let level = 0; level <= 3; level++) {
      for (let i = 0; i < 200; i++) {
        const { text, answer } = mathQuestion(level, 1)
        expect(evaluate(text)).toBe(answer)
      }
    }
  })

  it('uses only + and − at level 0', () => {
    for (let i = 0; i < 100; i++) {
      expect(mathQuestion(0).text).toMatch(/^\d+ [+−] \d+$/)
    }
  })

  it('divides evenly, so answers stay whole numbers', () => {
    for (let i = 0; i < 200; i++) {
      const { answer } = mathQuestion(2)
      expect(Number.isInteger(answer)).toBe(true)
    }
  })

  it('asks two-step sums at level 3', () => {
    for (let i = 0; i < 50; i++) {
      expect(mathQuestion(3).text).toMatch(/^\d+ × \d+ [+−] \d+$/)
    }
  })

  it('grows the numbers with the range multiplier', () => {
    const small = biggestOperand(400, 1)
    const large = biggestOperand(400, 3)
    expect(large).toBeGreaterThan(small)
  })
})

/** Evaluate a generated question left to right (the order players read it). */
function evaluate(text: string): number {
  const parts = text.split(' ')
  let value = Number(parts[0])
  for (let i = 1; i < parts.length; i += 2) {
    const rhs = Number(parts[i + 1])
    const op = parts[i]
    if (op === '+') value += rhs
    else if (op === '−') value -= rhs
    else if (op === '×') value *= rhs
    else if (op === '÷') value /= rhs
    else throw new Error(`unexpected operator ${op}`)
  }
  return value
}

function biggestOperand(samples: number, range: number): number {
  let max = 0
  for (let i = 0; i < samples; i++) {
    for (const n of mathQuestion(1, range).text.split(' ')) {
      const v = Number(n)
      if (Number.isFinite(v)) max = Math.max(max, v)
    }
  }
  return max
}
