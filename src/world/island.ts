import { BlockId } from '../core/blocks'
import { worldToChunk } from '../core/coords'
import type { FurnitureManager } from '../entities/furnitureManager'
import { flattenSite, supportColumn, type SetBlock } from './ground'
import { buildPalette, type BuildPalette } from './palette'
import type { Terrain } from './terrain'
import type { World } from './world'

/** Whether chunk (cx,cz) is the one that triggers building the island plaza. */
export function isIslandAnchorChunk(terrain: Terrain, cx: number, cz: number): boolean {
  return worldToChunk(terrain.island.x) === cx && worldToChunk(terrain.island.z) === cz
}

/** Radius of the flattened arcade plaza. */
const PLAZA_R = 14
/** Radius of the stone ring path that links the four kiosks. */
const RING_R = 6.5
/** How far the kiosks stand from the campfire. */
const KIOSK_R = 7
/** Radius of the fence rim, with gates left open on the diagonals. */
const FENCE_R = 13
/**
 * Palm positions, deliberately off both the axes (which are the kiosks'
 * sightlines) and the diagonals (which are the gate lanes), so the grove frames
 * the plaza without hiding a cabinet or blocking a way in.
 */
const PALMS = [
  [10, 4], [4, 10], [-10, 4], [-4, 10],
  [10, -4], [4, -10], [-10, -4], [-4, -10],
] as const

/** The four mini-game kiosks: offset from the centre and facing it. */
const KIOSKS = [
  { kind: 'arcadePuzzle', dx: 0, dz: -KIOSK_R, yaw: 0, id: 'isle-arcade-puzzle' },
  { kind: 'arcadeRunner', dx: 0, dz: KIOSK_R, yaw: Math.PI, id: 'isle-arcade-runner' },
  { kind: 'arcadeMath', dx: -KIOSK_R, dz: 0, yaw: Math.PI / 2, id: 'isle-arcade-math' },
  { kind: 'arcadeWord', dx: KIOSK_R, dz: 0, yaw: -Math.PI / 2, id: 'isle-arcade-word' },
] as const

/**
 * Stamp the secret island's arcade plaza.
 *
 * The layout reads as a designed place rather than four cabinets on grass: a
 * paved courtyard around the campfire, a dashed stone ring path linking four
 * raised kiosk podiums, lantern posts flanking every kiosk, a palm grove, a
 * fenced rim with gates on the diagonals, prize plinths by the gates, and a
 * lighthouse-style beacon visible from the mainland.
 *
 * Furniture uses fixed ids so re-building on every session stays idempotent.
 */
export function buildIsland(world: World, furniture: FurnitureManager): void {
  const ix = world.terrain.island.x
  const iz = world.terrain.island.z
  const floorY = world.terrain.heightAt(ix, iz)
  const set: SetBlock = (x, y, z, id) => world.setBlock(x, y, z, id)
  const mat = buildPalette(world.terrain.kind)

  // Flatten the plaza onto solid ground: the dome slopes away from its centre,
  // so the outer plaza needs packing underneath, not just a grass cap.
  flattenSite(world.terrain, set, {
    x0: ix - PLAZA_R,
    x1: ix + PLAZA_R,
    z0: iz - PLAZA_R,
    z1: iz + PLAZA_R,
    floorY,
    inside: (x, z) => (x - ix) ** 2 + (z - iz) ** 2 <= PLAZA_R * PLAZA_R,
  })

  pavePlaza(set, mat, ix, iz, floorY)

  furniture.place('campfire', ix, floorY + 1, iz, 0, 'isle-campfire')

  // Kiosks stand on brick podiums so they read as exhibits, each lit by a pair
  // of lantern posts.
  for (const k of KIOSKS) {
    const kx = ix + k.dx
    const kz = iz + k.dz
    buildPodium(set, mat, kx, kz, floorY)
    furniture.place(k.kind, kx, floorY + 2, kz, k.yaw, k.id)
    // Lamps sit either side of the kiosk, on the axis perpendicular to its
    // facing, so they light the player's approach without hiding the screen.
    const px = k.dz === 0 ? 0 : 3
    const pz = k.dz === 0 ? 3 : 0
    buildLampPost(set, mat, furniture, kx + px, kz + pz, floorY, `${k.id}-lamp-a`)
    buildLampPost(set, mat, furniture, kx - px, kz - pz, floorY, `${k.id}-lamp-b`)
  }

  for (const [dx, dz] of PALMS) buildPalm(set, ix + dx, iz + dz, floorY)

  buildFenceRim(set, mat, ix, iz, floorY)

  // Prize plinths by two of the gates: mystery boxes, refreshed each session so
  // the island keeps a little something for returning explorers.
  for (const [dx, dz] of [[9, 9], [-9, -9]] as const) {
    const x = ix + dx
    const z = iz + dz
    set(x, floorY + 1, z, mat.path)
    set(x, floorY + 2, z, BlockId.MysteryBoxRare)
  }

  buildBeacon(world.terrain, set, mat, furniture, ix, iz - 18, floorY)
}

/**
 * The plaza floor, keyed off distance from the campfire: a plank courtyard, a
 * dashed stone-and-brick ring path, grass between, and a sandy beach rim that
 * blends the build into the shoreline.
 */
function pavePlaza(set: SetBlock, mat: BuildPalette, ix: number, iz: number, floorY: number): void {
  for (let dx = -PLAZA_R; dx <= PLAZA_R; dx++) {
    for (let dz = -PLAZA_R; dz <= PLAZA_R; dz++) {
      const r = Math.hypot(dx, dz)
      if (r > PLAZA_R) continue
      let id: number | null = null
      if (r <= 3.2) {
        // Courtyard: decking with a compass cross through the campfire.
        id = dx === 0 || dz === 0 ? mat.wall : mat.floor
      } else if (r >= RING_R - 1 && r <= RING_R + 1) {
        // Dashed path: paving with a sleeper every few blocks.
        id = (Math.abs(dx) + Math.abs(dz)) % 4 === 0 ? mat.wall : mat.path
      } else if (r > PLAZA_R - 2.5) {
        id = BlockId.Sand
      }
      if (id !== null) set(ix + dx, floorY, iz + dz, id)
    }
  }
}

/** A 3×3 raised stage with contrasting corners for one arcade cabinet. */
function buildPodium(set: SetBlock, mat: BuildPalette, x: number, z: number, floorY: number): void {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      set(x + dx, floorY + 1, z + dz, dx !== 0 && dz !== 0 ? mat.wall : mat.path)
    }
  }
}

/** A lantern on a post, so the plaza stays playable after dark. */
function buildLampPost(
  set: SetBlock,
  mat: BuildPalette,
  furniture: FurnitureManager,
  x: number,
  z: number,
  floorY: number,
  id: string,
): void {
  for (let y = floorY + 1; y <= floorY + 3; y++) set(x, y, z, mat.post)
  set(x, floorY + 4, z, BlockId.Air)
  furniture.place('lantern', x, floorY + 4, z, 0, id)
}

/** Fence rim with four diagonal gates, so the plaza has a threshold. */
function buildFenceRim(set: SetBlock, mat: BuildPalette, ix: number, iz: number, floorY: number): void {
  const steps = 128
  for (let a = 0; a < steps; a++) {
    const ang = (a / steps) * Math.PI * 2
    // Leave a gate wherever the ring crosses a diagonal.
    const deg = (ang * 180) / Math.PI
    const toGate = Math.min(...[45, 135, 225, 315].map((g) => Math.abs(((deg - g + 180) % 360) - 180)))
    if (toGate < 14) continue
    set(ix + Math.round(Math.cos(ang) * FENCE_R), floorY + 1, iz + Math.round(Math.sin(ang) * FENCE_R), mat.fence)
  }
}

/** A slim palm: bare trunk with a small crown, so sightlines stay open. */
function buildPalm(set: SetBlock, x: number, z: number, floorY: number): void {
  const top = floorY + 5
  for (let y = floorY + 1; y <= top; y++) set(x, y, z, BlockId.Wood)
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    set(x + dx, top, z + dz, BlockId.Leaves)
  }
  set(x, top + 1, z, BlockId.Leaves)
}

/**
 * Beacon tower: a brick lighthouse with glass bands and a lantern room, planted
 * outside the plaza so it never blocks the kiosks. It rises well above the tree
 * line so explorers can spot the island long before the discovery moat.
 */
function buildBeacon(
  terrain: Terrain,
  set: SetBlock,
  mat: BuildPalette,
  furniture: FurnitureManager,
  bx: number,
  bz: number,
  plazaFloor: number,
): void {
  const beaconFloor = terrain.heightAt(bx, bz)
  const height = 30
  // Stone footing so the tower meets the ground even on the dome's slope.
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      if (Math.abs(dx) + Math.abs(dz) > 3) continue
      supportColumn(terrain, set, bx + dx, bz + dz, beaconFloor, mat.path)
      set(bx + dx, beaconFloor, bz + dz, Math.abs(dx) + Math.abs(dz) > 1 ? mat.path : mat.wall)
    }
  }
  // Shaft: clad with glass bands that catch the light on the way up.
  for (let y = beaconFloor + 1; y <= beaconFloor + height; y++) {
    set(bx, y, bz, (y - beaconFloor) % 5 === 0 ? mat.glass : mat.wall)
  }
  // Lantern room: a glass cap with a brick spire above it.
  const roomY = beaconFloor + height + 1
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) set(bx + dx, roomY, bz + dz, mat.glass)
  }
  set(bx, roomY + 1, bz, mat.wall)
  // Two lanterns at the foot, marking the path between the tower and the plaza.
  for (const [dx, dz] of [[2, 2], [-2, 2]] as const) {
    buildLampPost(set, mat, furniture, bx + dx, bz + dz, Math.min(beaconFloor, plazaFloor), `isle-beacon-lamp-${dx}`)
  }
}
