import { describe, expect, it } from 'vitest'
import {
  CLOTH_COLORS,
  DEFAULT_APPEARANCE,
  EXPRESSION_PRESETS,
  EYE_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  MOUTH_STYLES,
  SKIN_TONES,
  appearanceKey,
  loadAppearance,
  sanitizeAppearance,
  saveAppearance,
  type Appearance,
} from './appearance'

function memoryStorage(): { getItem(k: string): string | null; setItem(k: string, v: string): void; data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  }
}

describe('appearance', () => {
  it('returns defaults for garbage input', () => {
    expect(sanitizeAppearance(null)).toEqual(DEFAULT_APPEARANCE)
    expect(sanitizeAppearance('nope')).toEqual(DEFAULT_APPEARANCE)
    expect(sanitizeAppearance(42)).toEqual(DEFAULT_APPEARANCE)
    expect(sanitizeAppearance({ hair: 'flaming', skin: 'javascript:alert(1)', eyes: 7 })).toEqual(DEFAULT_APPEARANCE)
  })

  it('keeps every valid combination intact', () => {
    const custom: Appearance = {
      skin: SKIN_TONES[4],
      hair: 'mohawk',
      hairColor: HAIR_COLORS[5],
      eyes: 'shades',
      eyeColor: '#3a6ea5',
      mouth: 'tongue',
      shirt: CLOTH_COLORS[0],
      pants: CLOTH_COLORS[3],
    }
    expect(sanitizeAppearance(custom)).toEqual(custom)
  })

  it('rejects colours outside the palette', () => {
    const a = sanitizeAppearance({ ...DEFAULT_APPEARANCE, shirt: '#123456', hairColor: 'red' })
    expect(a.shirt).toBe(DEFAULT_APPEARANCE.shirt)
    expect(a.hairColor).toBe(DEFAULT_APPEARANCE.hairColor)
  })

  it('round-trips through storage', () => {
    const storage = memoryStorage()
    const custom = sanitizeAppearance({ ...DEFAULT_APPEARANCE, hair: 'spiky', mouth: 'grin' })
    saveAppearance(storage, custom)
    expect(loadAppearance(storage)).toEqual(custom)
  })

  it('falls back to defaults for empty or corrupt storage', () => {
    const storage = memoryStorage()
    expect(loadAppearance(storage)).toEqual(DEFAULT_APPEARANCE)
    storage.setItem('minicraft-appearance-v1', '{not json')
    expect(loadAppearance(storage)).toEqual(DEFAULT_APPEARANCE)
  })

  it('appearanceKey changes when any field changes', () => {
    const base = appearanceKey(DEFAULT_APPEARANCE)
    for (const patch of [
      { hair: 'mohawk' }, { eyes: 'wink' }, { mouth: 'open' },
      { skin: SKIN_TONES[3] }, { shirt: CLOTH_COLORS[1] },
    ] as Partial<Appearance>[]) {
      expect(appearanceKey({ ...DEFAULT_APPEARANCE, ...patch })).not.toBe(base)
    }
    expect(appearanceKey({ ...DEFAULT_APPEARANCE })).toBe(base)
  })

  it('expression presets only use real eye and mouth styles', () => {
    for (const p of EXPRESSION_PRESETS) {
      expect(EYE_STYLES).toContain(p.eyes)
      expect(MOUTH_STYLES).toContain(p.mouth)
    }
    // every preset is distinct so the picker offers a real series of faces
    const combos = new Set(EXPRESSION_PRESETS.map((p) => `${p.eyes}/${p.mouth}`))
    expect(combos.size).toBe(EXPRESSION_PRESETS.length)
  })

  it('default appearance survives its own sanitizer and styles are valid', () => {
    expect(sanitizeAppearance(DEFAULT_APPEARANCE)).toEqual(DEFAULT_APPEARANCE)
    expect(HAIR_STYLES).toContain(DEFAULT_APPEARANCE.hair)
    expect(EYE_STYLES).toContain(DEFAULT_APPEARANCE.eyes)
    expect(MOUTH_STYLES).toContain(DEFAULT_APPEARANCE.mouth)
  })
})
