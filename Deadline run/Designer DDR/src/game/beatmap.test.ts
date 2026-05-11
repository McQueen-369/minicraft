import { describe, it, expect } from 'vitest'
import { generatePattern, snapBpm } from './beatmap'

describe('snapBpm', () => {
  it('snaps 118 to 120', () => expect(snapBpm(118)).toBe(120))
  it('snaps 139 to 140', () => expect(snapBpm(139)).toBe(140))
  it('caps at 180', () => expect(snapBpm(200)).toBe(180))
  it('floors at 60', () => expect(snapBpm(40)).toBe(60))
})

describe('generatePattern', () => {
  it('produces notes array with time and lanes', () => {
    const notes = generatePattern(120, 30)
    expect(notes.length).toBeGreaterThan(0)
    expect(notes[0]).toHaveProperty('time')
    expect(notes[0]).toHaveProperty('lanes')
    expect(Array.isArray(notes[0].lanes)).toBe(true)
  })

  it('notes are sorted by time', () => {
    const notes = generatePattern(120, 30)
    for (let i = 1; i < notes.length; i++) {
      expect(notes[i].time).toBeGreaterThanOrEqual(notes[i - 1].time)
    }
  })

  it('all lane indices are 0-3', () => {
    const notes = generatePattern(120, 30)
    for (const note of notes) {
      for (const lane of note.lanes) {
        expect(lane).toBeGreaterThanOrEqual(0)
        expect(lane).toBeLessThanOrEqual(3)
      }
    }
  })
})
