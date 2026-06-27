/** Bump this string whenever new features are pushed so players see the refresh banner. */
export const APP_VERSION = '1.1'

export const CHUNK_SIZE = 16
// Tall world column so players can build skyward with effectively no ceiling.
// (Truly unbounded height would require Y-chunking; this raised cap gives ~230
// blocks of clear air above the tallest terrain for vertical builds.)
export const WORLD_HEIGHT = 256
export const RENDER_DISTANCE = 12
export const UNLOAD_DISTANCE = RENDER_DISTANCE + 1
export const WATER_LEVEL = 24

export const GRAVITY = 28
export const JUMP_SPEED = 9
export const WALK_SPEED = 5.2
export const FLY_SPEED = 12
export const MAX_DT = 0.05

export const PLAYER_WIDTH = 0.6
export const PLAYER_HEIGHT = 1.8
export const PLAYER_EYE = 1.62

export const REACH = 6
export const HOTBAR_SIZE = 9
export const INVENTORY_SIZE = 200
export const MAX_STACK = 200
export const CHEST_SLOTS = 27

export const AUTOSAVE_INTERVAL_MS = 10_000
export const CLOUD_AUTOSAVE_INTERVAL_MS = 30_000
export const SAVE_KEY = 'minicraft-world-v1'

export const MESH_BUDGET_PER_FRAME = 2
export const PLAYER_STATE_HZ = 10
export const ANIMAL_STATE_HZ = 5
