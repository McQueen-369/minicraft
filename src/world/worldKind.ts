/**
 * Which flavour of world a save was generated as.
 *
 * `terrain` is the original grass-and-trees world; `robot` swaps the surface
 * for metal panelling, replaces apple trees with canned food as the world's
 * food source, and sends bad robots out at night instead of zombies. Every
 * other rule — crafting, energy, villages, the secret island — is shared.
 */
export type WorldKind = 'terrain' | 'robot'

export const WORLD_KINDS: readonly WorldKind[] = ['terrain', 'robot']

/** Menu-facing name, shown on every saved world row. */
export const WORLD_KIND_LABEL: Record<WorldKind, string> = {
  terrain: 'Terrain World',
  robot: 'Robot World',
}

export const WORLD_KIND_ICON: Record<WorldKind, string> = {
  terrain: '🌍',
  robot: '🤖',
}

export const WORLD_KIND_BLURB: Record<WorldKind, string> = {
  terrain: 'Grass, forests and apple trees. Zombies rise at night.',
  robot: 'Metal panelling and canned food. Bad robots patrol at night.',
}

/** Anything unrecognised — including saves made before robot worlds — is terrain. */
export function normalizeWorldKind(value: unknown): WorldKind {
  return value === 'robot' ? 'robot' : 'terrain'
}
