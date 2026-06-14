import { describe, expect, it } from 'vitest'
import { decodeMessage, encodeMessage, generateRoomCode, isValidRoomCode, type GameMessage } from './protocol'

describe('protocol', () => {
  it('roundtrips every message type', () => {
    const messages: GameMessage[] = [
      { t: 'hello', id: 'p1', name: 'Ann' },
      { t: 'player', id: 'p1', name: 'Ann', x: 1, y: 2, z: 3, yaw: 0.5, pitch: -0.2 },
      {
        t: 'snapshot',
        to: 'p2',
        hostId: 'h1',
        seed: 99,
        skyTime: 0.3,
        edits: { '1,2,3': 0 },
        chests: { '4,5,6': [{ itemId: 2, count: 3 }] },
        animals: { animals: [], spawnedChunks: ['0,0'] },
        furniture: [],
        spawn: { x: 0.5, y: 40, z: 0.5 },
      },
      { t: 'edit', x: -4, y: 30, z: 9, id: 8 },
      { t: 'chest', key: '4,5,6', contents: [null, { itemId: 2, count: 1 }] },
      { t: 'animals', list: [{ id: 'a', kind: 'pig', pos: { x: 1, y: 2, z: 3 }, yaw: 0, mode: 'wander', owner: null }] },
      { t: 'animalEvent', ev: 'tame', animalId: 'a', owner: 'p1' },
      { t: 'leave', id: 'p1' },
    ]
    for (const m of messages) {
      expect(decodeMessage(JSON.parse(JSON.stringify(encodeMessage(m))))).toEqual(m)
    }
  })

  it('rejects foreign and malformed payloads', () => {
    expect(decodeMessage(null)).toBeNull()
    expect(decodeMessage('hi')).toBeNull()
    expect(decodeMessage({ v: 99, m: { t: 'hello', id: 'x' } })).toBeNull()
    expect(decodeMessage({ v: 1, m: { t: 'nope' } })).toBeNull()
    expect(decodeMessage({ v: 1, m: { t: 'player', id: 'p', x: NaN, y: 0, z: 0 } })).toBeNull()
    expect(decodeMessage({ v: 1 })).toBeNull()
  })

  it('generates valid room codes', () => {
    for (let i = 0; i < 20; i++) {
      expect(isValidRoomCode(generateRoomCode())).toBe(true)
    }
    expect(isValidRoomCode('MC-12345')).toBe(false)
    expect(isValidRoomCode('mc-1234')).toBe(false)
  })
})
