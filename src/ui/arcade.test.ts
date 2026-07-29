// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { Inventory } from '../items/inventory'
import { ArcadePanel, defineCard, mathQuestion, neighbors, WORDS, wordsFor } from './arcade'
import { difficultyRules, DIFFICULTIES } from './challenge'

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

describe('word list', () => {
  it('gives every word a part of speech and a real definition', () => {
    for (const entry of WORDS) {
      expect(entry.pos.trim(), entry.word).not.toBe('')
      // Long enough to be a definition rather than a restated clue.
      expect(entry.meaning.trim().length, entry.word).toBeGreaterThan(30)
      expect(entry.meaning.trim().endsWith('.'), entry.word).toBe(true)
    }
  })

  it('never gives the answer away in the definition', () => {
    // The card is shown after the round, but a definition that spells the word
    // out would also make the hint pointless if the two are ever shown together.
    for (const entry of WORDS) {
      expect(entry.meaning.toUpperCase(), entry.word).not.toContain(entry.word)
    }
  })

  it('keeps hints and meanings distinct — the riddle is not the lesson', () => {
    for (const entry of WORDS) {
      expect(entry.meaning.toLowerCase(), entry.word).not.toBe(entry.hint.toLowerCase())
    }
  })

  it('has words at every difficulty tier', () => {
    for (const d of DIFFICULTIES) {
      const pool = wordsFor(difficultyRules(d).word)
      expect(pool.length, d).toBeGreaterThan(0)
      for (const entry of pool) expect(entry.meaning, entry.word).toBeTruthy()
    }
  })
})

describe('end-of-round definition card', () => {
  it('shows the word, its part of speech and its meaning', () => {
    const entry = WORDS.find((w) => w.word === 'GLACIER')!
    const card = defineCard(entry)
    expect(card.querySelector('.mc-arc-define-word')?.textContent).toBe('GLACIER')
    expect(card.querySelector('.mc-arc-define-pos')?.textContent).toBe(entry.pos)
    expect(card.querySelector('.mc-arc-define-meaning')?.textContent).toBe(entry.meaning)
  })

  it('renders a card for every word without leaving a field blank', () => {
    for (const entry of WORDS) {
      const card = defineCard(entry)
      for (const sel of ['.mc-arc-define-word', '.mc-arc-define-pos', '.mc-arc-define-meaning']) {
        expect(card.querySelector(sel)?.textContent?.trim(), `${entry.word} ${sel}`).toBeTruthy()
      }
    }
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

describe('word kiosk difficulty', () => {
  const openWord = (level: string) => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    const panel = new ArcadePanel(root, new Inventory())
    panel.open('arcadeWord')
    const pick = [...root.querySelectorAll('.mc-arc-level')].find((b) => b.textContent?.includes(level))!
    pick.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return root
  }

  it('gives a hard round five wrong guesses', () => {
    expect(difficultyRules('hard').word.lives).toBe(5)
  })

  it('starts a hard round with a heart per life', () => {
    const root = openWord('Hard')
    expect(root.querySelector('.mc-arc-status')?.textContent).toBe('❤'.repeat(5))
  })

  it('briefs the player with the life count the round actually plays by', () => {
    for (const d of DIFFICULTIES) {
      const root = openWord(d[0].toUpperCase() + d.slice(1))
      const brief = [...root.querySelectorAll('.mc-arc-brief-line')].map((e) => e.textContent).join(' ')
      expect(brief, d).toContain(`${difficultyRules(d).word.lives} wrong guesses`)
    }
  })

  it('says the same thing on the difficulty card as in the briefing', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    new ArcadePanel(root, new Inventory()).open('arcadeWord')
    const cards = [...root.querySelectorAll('.mc-arc-level')]
    for (const [i, d] of DIFFICULTIES.entries()) {
      expect(cards[i].textContent, d).toContain(`${difficultyRules(d).word.lives} lives`)
    }
  })
})
