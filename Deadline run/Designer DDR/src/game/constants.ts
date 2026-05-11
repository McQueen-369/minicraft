export const PERFECT_WINDOW = 55   // ms
export const GOOD_WINDOW    = 110  // ms
export const FALL_MS        = 900  // arrow travel time ms
export const ARROW_SIZE     = 48   // px, canvas render size
export const LANE_COUNT     = 4
export const TARGET_Y_RATIO = 0.78 // target zone at 78% canvas height
export const GHOST_BROADCAST_HZ = 10
export const ROOM_CODE_PREFIX = 'DEADL'

export const LANE_GLYPHS = ['◀', '▼', '▲', '▶'] as const
export const LANE_KEYS   = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'] as const

export const GOOD_POINTS    = 50
export const COMBO_TIERS = [
  { min: 0,  max: 9,  multiplier: 1 },
  { min: 10, max: 24, multiplier: 2 },
  { min: 25, max: 49, multiplier: 3 },
  { min: 50, max: Infinity, multiplier: 4 },
] as const

export const BPM_RAMP_INTERVAL_CYCLES = 2
export const BPM_RAMP_STEP = 6
export const BPM_MAX = 180

export const BUNDLED_SONGS = [
  { id: 'chipper-doodle-v2', title: 'Chipper Doodle v2', bpm: 120, genre: 'Chiptune',           difficulty: 'Easy',   duration: '2:00' },
  { id: 'faster-does-it',    title: 'Faster Does It',    bpm: 140, genre: 'Electronic',         difficulty: 'Medium', duration: '2:00' },
  { id: 'cipher',            title: 'Cipher',            bpm: 150, genre: 'Tense Electronic',   difficulty: 'Hard',   duration: '2:00' },
] as const
