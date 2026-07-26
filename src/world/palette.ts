import { BlockId } from '../core/blocks'
import type { WorldKind } from './worldKind'

/**
 * Materials a builder reaches for, resolved per world kind.
 *
 * Villages, the starter cottage and the island plaza are laid out once and
 * built from these slots, so a robot world gets the same architecture in
 * alloy panelling, hull sheeting and steel railings instead of planks, brick
 * and picket fencing. Glass and stone are shared: both worlds glaze their
 * windows and pave their paths the same way.
 */
export interface BuildPalette {
  /** Interior floors and light cladding. */
  floor: BlockId
  /** Main wall material. */
  wall: BlockId
  /** Corner posts, beams and lamp posts. */
  post: BlockId
  /** Roof sheeting. */
  roof: BlockId
  /** Crates, canopies and other odds and ends. */
  trim: BlockId
  /** Fencing around pens and gardens. */
  fence: BlockId
  /** Window glazing. */
  glass: BlockId
  /** Paths and plinths. */
  path: BlockId
  /** Chimneys and exhaust stacks. */
  stack: BlockId
}

const TERRAIN: BuildPalette = {
  floor: BlockId.Plank,
  wall: BlockId.Brick,
  post: BlockId.Wood,
  roof: BlockId.Plank,
  trim: BlockId.Plank,
  fence: BlockId.Fence,
  glass: BlockId.Glass,
  path: BlockId.Stone,
  stack: BlockId.Brick,
}

const ROBOT: BuildPalette = {
  floor: BlockId.MetalPanel,
  wall: BlockId.MetalPanel,
  post: BlockId.HullPlate,
  roof: BlockId.HullPlate,
  trim: BlockId.HullPlate,
  fence: BlockId.MetalFence,
  glass: BlockId.Glass,
  path: BlockId.Stone,
  stack: BlockId.HullPlate,
}

export function buildPalette(kind: WorldKind): BuildPalette {
  return kind === 'robot' ? ROBOT : TERRAIN
}

/**
 * The block a placed item actually becomes in this world. Fencing is the one
 * item whose form follows the world: a bag of Fence builds picket fencing in a
 * terrain world and steel railings in a robot world (and mining either one
 * gives the Fence item back).
 */
export function placedBlockFor(blockId: number, kind: WorldKind): number {
  if (kind === 'robot' && blockId === BlockId.Fence) return BlockId.MetalFence
  return blockId
}
