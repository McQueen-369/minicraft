/** Character appearance: face, hair, clothing and colours.
 *  Pure data + helpers so it can be unit-tested and shared between the
 *  menu preview, the in-game avatar and the network protocol. */

export const HAIR_STYLES = ['none', 'short', 'long', 'spiky', 'bowl', 'ponytail', 'mohawk'] as const
export type HairStyle = (typeof HAIR_STYLES)[number]

export const EYE_STYLES = ['normal', 'happy', 'wink', 'sleepy', 'angry', 'wide', 'shades'] as const
export type EyeStyle = (typeof EYE_STYLES)[number]

export const MOUTH_STYLES = ['smile', 'grin', 'neutral', 'sad', 'open', 'tongue'] as const
export type MouthStyle = (typeof MOUTH_STYLES)[number]

export const SKIN_TONES = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a21', '#a8d8a8', '#9ec7e8'] as const
export const HAIR_COLORS = ['#2c222b', '#5a3825', '#a0522d', '#d4a017', '#e8e6e3', '#c93756', '#4169aa', '#3a8f4a'] as const
export const EYE_COLORS = ['#2c222b', '#5a3825', '#3a6ea5', '#3a8f4a', '#7b4fa0', '#b03030'] as const
export const CLOTH_COLORS = [
  '#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#16a085',
  '#2980b9', '#8e44ad', '#e84393', '#7f8c8d', '#2d3436',
] as const

export interface Appearance {
  skin: string
  hair: HairStyle
  hairColor: string
  eyes: EyeStyle
  eyeColor: string
  mouth: MouthStyle
  shirt: string
  pants: string
}

export const DEFAULT_APPEARANCE: Appearance = {
  skin: SKIN_TONES[0],
  hair: 'short',
  hairColor: HAIR_COLORS[1],
  eyes: 'normal',
  eyeColor: EYE_COLORS[0],
  mouth: 'smile',
  shirt: CLOTH_COLORS[5],
  pants: CLOTH_COLORS[9],
}

/** Ready-made facial expressions: pick one to set eyes + mouth together. */
export const EXPRESSION_PRESETS: { name: string; emoji: string; eyes: EyeStyle; mouth: MouthStyle }[] = [
  { name: 'Happy', emoji: '😊', eyes: 'happy', mouth: 'smile' },
  { name: 'Cheerful', emoji: '😄', eyes: 'normal', mouth: 'grin' },
  { name: 'Chill', emoji: '😎', eyes: 'shades', mouth: 'smile' },
  { name: 'Surprised', emoji: '😲', eyes: 'wide', mouth: 'open' },
  { name: 'Sleepy', emoji: '😴', eyes: 'sleepy', mouth: 'neutral' },
  { name: 'Grumpy', emoji: '😠', eyes: 'angry', mouth: 'sad' },
  { name: 'Fierce', emoji: '😤', eyes: 'angry', mouth: 'grin' },
  { name: 'Silly', emoji: '😜', eyes: 'wink', mouth: 'tongue' },
]

function pickColor(value: unknown, palette: readonly string[], fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
    ? (palette.includes(value.toLowerCase()) ? value.toLowerCase() : fallback)
    : fallback
}

function pickStyle<T extends string>(value: unknown, styles: readonly T[], fallback: T): T {
  return typeof value === 'string' && (styles as readonly string[]).includes(value) ? (value as T) : fallback
}

/** Validate untrusted data (saves, network) into a safe Appearance. */
export function sanitizeAppearance(raw: unknown): Appearance {
  const d = DEFAULT_APPEARANCE
  if (typeof raw !== 'object' || raw === null) return { ...d }
  const a = raw as Partial<Appearance>
  return {
    skin: pickColor(a.skin, SKIN_TONES, d.skin),
    hair: pickStyle(a.hair, HAIR_STYLES, d.hair),
    hairColor: pickColor(a.hairColor, HAIR_COLORS, d.hairColor),
    eyes: pickStyle(a.eyes, EYE_STYLES, d.eyes),
    eyeColor: pickColor(a.eyeColor, EYE_COLORS, d.eyeColor),
    mouth: pickStyle(a.mouth, MOUTH_STYLES, d.mouth),
    shirt: pickColor(a.shirt, CLOTH_COLORS, d.shirt),
    pants: pickColor(a.pants, CLOTH_COLORS, d.pants),
  }
}

const APPEARANCE_KEY = 'minicraft-appearance-v1'

interface StringStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function loadAppearance(storage: StringStorageLike): Appearance {
  try {
    const raw = storage.getItem(APPEARANCE_KEY)
    if (!raw) return { ...DEFAULT_APPEARANCE }
    return sanitizeAppearance(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_APPEARANCE }
  }
}

export function saveAppearance(storage: StringStorageLike, a: Appearance): void {
  try {
    storage.setItem(APPEARANCE_KEY, JSON.stringify(sanitizeAppearance(a)))
  } catch {
    // storage unavailable — appearance just won't persist
  }
}

/** Stable key for change detection (avatar rebuilds when it differs). */
export function appearanceKey(a: Appearance): string {
  return [a.skin, a.hair, a.hairColor, a.eyes, a.eyeColor, a.mouth, a.shirt, a.pants].join('|')
}

/** Draw the face (eyes + mouth) onto a square canvas context.
 *  `size` is the canvas edge in pixels; the skin base is filled first. */
export function drawFace(ctx: CanvasRenderingContext2D, a: Appearance, size: number): void {
  const u = size / 16 // face designed on a 16×16 grid
  ctx.fillStyle = a.skin
  ctx.fillRect(0, 0, size, size)

  const eyeY = 6 * u
  const eyeLX = 3.5 * u
  const eyeRX = 9.5 * u
  const eyeW = 3 * u
  const eyeH = 2.5 * u
  ctx.fillStyle = a.eyeColor
  const pupil = (x: number) => {
    ctx.fillStyle = '#fff'
    ctx.fillRect(x, eyeY, eyeW, eyeH)
    ctx.fillStyle = a.eyeColor
    ctx.fillRect(x + eyeW / 3, eyeY + eyeH / 4, eyeW / 2.2, eyeH / 1.6)
  }
  const closedEye = (x: number) => {
    ctx.fillStyle = '#2c222b'
    ctx.fillRect(x, eyeY + eyeH / 2, eyeW, u * 0.7)
  }
  switch (a.eyes) {
    case 'normal':
      pupil(eyeLX)
      pupil(eyeRX)
      break
    case 'happy': // upside-down U shapes
      ctx.fillStyle = '#2c222b'
      ctx.fillRect(eyeLX, eyeY, u * 0.8, eyeH)
      ctx.fillRect(eyeLX + eyeW - u * 0.8, eyeY, u * 0.8, eyeH)
      ctx.fillRect(eyeLX, eyeY, eyeW, u * 0.8)
      ctx.fillRect(eyeRX, eyeY, u * 0.8, eyeH)
      ctx.fillRect(eyeRX + eyeW - u * 0.8, eyeY, u * 0.8, eyeH)
      ctx.fillRect(eyeRX, eyeY, eyeW, u * 0.8)
      break
    case 'wink':
      pupil(eyeLX)
      closedEye(eyeRX)
      break
    case 'sleepy':
      ctx.fillStyle = a.eyeColor
      ctx.fillRect(eyeLX, eyeY + eyeH / 2, eyeW, eyeH / 2)
      ctx.fillRect(eyeRX, eyeY + eyeH / 2, eyeW, eyeH / 2)
      ctx.fillStyle = '#2c222b'
      ctx.fillRect(eyeLX, eyeY + eyeH / 2 - u * 0.5, eyeW, u * 0.5)
      ctx.fillRect(eyeRX, eyeY + eyeH / 2 - u * 0.5, eyeW, u * 0.5)
      break
    case 'angry':
      pupil(eyeLX)
      pupil(eyeRX)
      ctx.fillStyle = '#2c222b'
      // slanted brows: inner ends low, outer ends high
      ctx.fillRect(eyeLX, eyeY - u * 0.6, eyeW / 2, u * 0.7)
      ctx.fillRect(eyeLX + eyeW / 2, eyeY - u * 1.2, eyeW / 2, u * 0.7)
      ctx.fillRect(eyeRX + eyeW / 2, eyeY - u * 0.6, eyeW / 2, u * 0.7)
      ctx.fillRect(eyeRX, eyeY - u * 1.2, eyeW / 2, u * 0.7)
      break
    case 'wide':
      ctx.fillStyle = '#fff'
      ctx.fillRect(eyeLX - u * 0.4, eyeY - u * 0.4, eyeW + u * 0.8, eyeH + u * 0.8)
      ctx.fillRect(eyeRX - u * 0.4, eyeY - u * 0.4, eyeW + u * 0.8, eyeH + u * 0.8)
      ctx.fillStyle = a.eyeColor
      ctx.fillRect(eyeLX + eyeW / 3, eyeY + eyeH / 4, eyeW / 2, eyeH / 1.4)
      ctx.fillRect(eyeRX + eyeW / 3, eyeY + eyeH / 4, eyeW / 2, eyeH / 1.4)
      break
    case 'shades':
      ctx.fillStyle = '#181820'
      ctx.fillRect(eyeLX - u * 0.5, eyeY - u * 0.3, eyeW + u, eyeH + u * 0.6)
      ctx.fillRect(eyeRX - u * 0.5, eyeY - u * 0.3, eyeW + u, eyeH + u * 0.6)
      ctx.fillRect(eyeLX + eyeW, eyeY, eyeRX - eyeLX - eyeW, u * 0.6) // bridge
      ctx.fillStyle = '#6fd3ff'
      ctx.fillRect(eyeLX, eyeY + u * 0.2, u, u * 0.7) // glint
      ctx.fillRect(eyeRX, eyeY + u * 0.2, u, u * 0.7)
      break
  }

  const mouthY = 11 * u
  const mouthCX = 8 * u
  ctx.fillStyle = '#7a3b2e'
  switch (a.mouth) {
    case 'smile':
      ctx.fillRect(mouthCX - 2.5 * u, mouthY, 5 * u, u)
      ctx.fillRect(mouthCX - 3.5 * u, mouthY - u, u, u)
      ctx.fillRect(mouthCX + 2.5 * u, mouthY - u, u, u)
      break
    case 'grin':
      ctx.fillRect(mouthCX - 3 * u, mouthY - u, 6 * u, 2.5 * u)
      ctx.fillStyle = '#fff'
      ctx.fillRect(mouthCX - 2.5 * u, mouthY - u * 0.6, 5 * u, u)
      break
    case 'neutral':
      ctx.fillRect(mouthCX - 2 * u, mouthY, 4 * u, u)
      break
    case 'sad':
      ctx.fillRect(mouthCX - 2.5 * u, mouthY - u, 5 * u, u)
      ctx.fillRect(mouthCX - 3.5 * u, mouthY, u, u)
      ctx.fillRect(mouthCX + 2.5 * u, mouthY, u, u)
      break
    case 'open':
      ctx.fillRect(mouthCX - 1.5 * u, mouthY - u, 3 * u, 3 * u)
      ctx.fillStyle = '#3d1a12'
      ctx.fillRect(mouthCX - u, mouthY - u * 0.4, 2 * u, 2 * u)
      break
    case 'tongue':
      ctx.fillRect(mouthCX - 2.5 * u, mouthY - u, 5 * u, u)
      ctx.fillStyle = '#e86a8a'
      ctx.fillRect(mouthCX, mouthY, 2 * u, 2 * u)
      break
  }
}
