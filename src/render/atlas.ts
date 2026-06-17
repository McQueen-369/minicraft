import * as THREE from 'three'
import { Tile } from '../core/blocks'
import { mulberry32 } from '../core/rng'

export const TILE_PX = 16
export const ATLAS_TILES = 4 // 4x4 grid
export const ATLAS_PX = TILE_PX * ATLAS_TILES
export const ATLAS_ROWS = 6

/** Half-texel inset keeps neighboring tiles from bleeding at quad edges. */
export const UV_EPSILON = 0.5 / ATLAS_PX

export interface Atlas {
  texture: THREE.Texture
  canvas: HTMLCanvasElement
  /** UV rect for a tile index: [u0, v0, u1, v1] with v measured Three.js-style (0 at bottom). */
  uvRect(tile: number): [number, number, number, number]
}

type Ctx = CanvasRenderingContext2D

function speckle(ctx: Ctx, x0: number, y0: number, base: string, specks: string[], density: number, seed: number): void {
  const rand = mulberry32(seed)
  ctx.fillStyle = base
  ctx.fillRect(x0, y0, TILE_PX, TILE_PX)
  for (let i = 0; i < TILE_PX * TILE_PX * density; i++) {
    ctx.fillStyle = specks[Math.floor(rand() * specks.length)]
    ctx.fillRect(x0 + Math.floor(rand() * TILE_PX), y0 + Math.floor(rand() * TILE_PX), 1, 1)
  }
}

function drawTile(ctx: Ctx, tile: number, x0: number, y0: number): void {
  switch (tile) {
    case Tile.GrassTop:
      speckle(ctx, x0, y0, '#5cab46', ['#4f9a3c', '#6cbb54', '#459035', '#7acb60'], 0.6, 1)
      break
    case Tile.GrassSide: {
      speckle(ctx, x0, y0, '#8a6244', ['#7a5538', '#96704e', '#6e4c32'], 0.5, 2)
      speckle(ctx, x0, y0, '#0000', [], 0, 0)
      ctx.fillStyle = '#5cab46'
      ctx.fillRect(x0, y0, TILE_PX, 3)
      const rand = mulberry32(3)
      for (let x = 0; x < TILE_PX; x++) {
        const drip = 3 + Math.floor(rand() * 3)
        ctx.fillStyle = rand() < 0.5 ? '#4f9a3c' : '#5cab46'
        ctx.fillRect(x0 + x, y0 + 3, 1, drip - 3)
      }
      break
    }
    case Tile.Dirt: {
      speckle(ctx, x0, y0, '#8a6244', ['#7a5538', '#96704e', '#6e4c32', '#9a7656'], 0.6, 4)
      // Small embedded pebbles — visual cue that soil has buried materials.
      ctx.fillStyle = '#6a6a6a'
      ctx.fillRect(x0 + 5, y0 + 5, 2, 1)
      ctx.fillRect(x0 + 5, y0 + 6, 1, 1)
      ctx.fillStyle = '#777777'
      ctx.fillRect(x0 + 12, y0 + 10, 2, 1)
      ctx.fillRect(x0 + 12, y0 + 11, 1, 1)
      break
    }
    case Tile.Stone: {
      speckle(ctx, x0, y0, '#8a8a8a', ['#7d7d7d', '#979797', '#6f6f6f', '#a2a2a2'], 0.55, 5)
      // Coal vein (dark cluster) — hints that stone is worth mining.
      ctx.fillStyle = '#2e2e2e'
      ctx.fillRect(x0 + 2, y0 + 3, 3, 1)
      ctx.fillRect(x0 + 2, y0 + 4, 1, 2)
      ctx.fillRect(x0 + 3, y0 + 4, 2, 1)
      // Iron-ore speck (warm orange-brown) — signals mineral variety.
      ctx.fillStyle = '#b06030'
      ctx.fillRect(x0 + 10, y0 + 10, 3, 1)
      ctx.fillRect(x0 + 11, y0 + 11, 2, 1)
      ctx.fillRect(x0 + 10, y0 + 11, 1, 1)
      break
    }
    case Tile.Sand:
      speckle(ctx, x0, y0, '#e0d6a4', ['#d6cb96', '#eae0b4', '#ccc08a'], 0.5, 6)
      break
    case Tile.WoodSide: {
      speckle(ctx, x0, y0, '#6b4a2a', ['#5e3f22', '#785633'], 0.3, 7)
      ctx.fillStyle = '#553a1f'
      for (const x of [2, 6, 11, 14]) ctx.fillRect(x0 + x, y0, 1, TILE_PX)
      break
    }
    case Tile.WoodTop: {
      speckle(ctx, x0, y0, '#a07d4a', ['#94713f', '#ad8a55'], 0.3, 8)
      ctx.strokeStyle = '#6b4a2a'
      ctx.lineWidth = 1
      for (const r of [2.5, 5.5]) {
        ctx.beginPath()
        ctx.arc(x0 + 8, y0 + 8, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.fillStyle = '#553a1f'
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, TILE_PX - 1, TILE_PX - 1)
      break
    }
    case Tile.Leaves: {
      speckle(ctx, x0, y0, '#3e7d2e', ['#346c26', '#488f37', '#2d5c1e', '#52a040'], 0.8, 9)
      // Hint at hidden apples: small red berries scattered in the foliage.
      ctx.fillStyle = '#c0281a'
      ctx.fillRect(x0 + 3, y0 + 4, 2, 2)
      ctx.fillRect(x0 + 11, y0 + 8, 2, 2)
      ctx.fillStyle = '#8a1c10'
      ctx.fillRect(x0 + 3, y0 + 5, 2, 1)
      ctx.fillRect(x0 + 11, y0 + 9, 2, 1)
      // Tiny stem
      ctx.fillStyle = '#5a3e1a'
      ctx.fillRect(x0 + 4, y0 + 3, 1, 1)
      ctx.fillRect(x0 + 12, y0 + 7, 1, 1)
      break
    }
    case Tile.Plank: {
      speckle(ctx, x0, y0, '#b08d5a', ['#a5814e', '#bb9866'], 0.25, 10)
      ctx.fillStyle = '#8a6b3e'
      for (const y of [3, 7, 11, 15]) ctx.fillRect(x0, y0 + y, TILE_PX, 1)
      ctx.fillRect(x0 + 4, y0, 1, 4)
      ctx.fillRect(x0 + 12, y0 + 4, 1, 4)
      ctx.fillRect(x0 + 7, y0 + 8, 1, 4)
      break
    }
    case Tile.Brick: {
      ctx.fillStyle = '#9e4a3a'
      ctx.fillRect(x0, y0, TILE_PX, TILE_PX)
      ctx.fillStyle = '#c9c1b8'
      for (const y of [0, 4, 8, 12]) ctx.fillRect(x0, y0 + y, TILE_PX, 1)
      for (let row = 0; row < 4; row++) {
        const off = row % 2 === 0 ? 4 : 0
        for (let x = off; x < TILE_PX; x += 8) ctx.fillRect(x0 + x, y0 + row * 4, 1, 4)
      }
      speckle(ctx, x0, y0, '#0000', [], 0, 0)
      break
    }
    case Tile.Glass: {
      ctx.fillStyle = '#cfeff4'
      ctx.fillRect(x0, y0, TILE_PX, TILE_PX)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x0 + 2, y0 + 2, 2, 6)
      ctx.fillRect(x0 + 5, y0 + 2, 1, 3)
      ctx.strokeStyle = '#9fc9d4'
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, TILE_PX - 1, TILE_PX - 1)
      break
    }
    case Tile.ChestSide:
      speckle(ctx, x0, y0, '#9a7136', ['#8d662e', '#a87e40'], 0.25, 11)
      ctx.strokeStyle = '#5e4318'
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, TILE_PX - 1, TILE_PX - 1)
      ctx.fillStyle = '#5e4318'
      ctx.fillRect(x0, y0 + 6, TILE_PX, 1)
      break
    case Tile.ChestFront:
      speckle(ctx, x0, y0, '#9a7136', ['#8d662e', '#a87e40'], 0.25, 12)
      ctx.strokeStyle = '#5e4318'
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, TILE_PX - 1, TILE_PX - 1)
      ctx.fillStyle = '#5e4318'
      ctx.fillRect(x0, y0 + 6, TILE_PX, 1)
      ctx.fillStyle = '#c0c0c0'
      ctx.fillRect(x0 + 7, y0 + 5, 2, 3)
      break
    case Tile.ChestTop:
      speckle(ctx, x0, y0, '#9a7136', ['#8d662e', '#a87e40'], 0.25, 13)
      ctx.strokeStyle = '#5e4318'
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, TILE_PX - 1, TILE_PX - 1)
      break
    case Tile.MysteryBoxSide: {
      ctx.fillStyle = '#1ab8c8'
      ctx.fillRect(x0, y0, TILE_PX, TILE_PX)
      ctx.strokeStyle = '#0d8a96'
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, TILE_PX - 1, TILE_PX - 1)
      // "?" pixel art in white (5×7 at position 5,4)
      ctx.fillStyle = '#ffffff'
      // top curve: row 4, cols 5-9
      ctx.fillRect(x0 + 5, y0 + 4, 5, 1)
      // right side: col 9, rows 5-6
      ctx.fillRect(x0 + 9, y0 + 5, 1, 2)
      // curve-in: cols 7-8, rows 7-8
      ctx.fillRect(x0 + 7, y0 + 7, 2, 2)
      // dot: col 7, rows 10-11
      ctx.fillRect(x0 + 7, y0 + 10, 1, 2)
      break
    }
    case Tile.MysteryBoxTop:
      ctx.fillStyle = '#1ab8c8'
      ctx.fillRect(x0, y0, TILE_PX, TILE_PX)
      ctx.strokeStyle = '#0d8a96'
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, TILE_PX - 1, TILE_PX - 1)
      break
    case Tile.MysteryBoxRareSide: {
      ctx.fillStyle = '#9b45d4'
      ctx.fillRect(x0, y0, TILE_PX, TILE_PX)
      ctx.strokeStyle = '#6e2fa0'
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, TILE_PX - 1, TILE_PX - 1)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x0 + 5, y0 + 4, 5, 1)
      ctx.fillRect(x0 + 9, y0 + 5, 1, 2)
      ctx.fillRect(x0 + 7, y0 + 7, 2, 2)
      ctx.fillRect(x0 + 7, y0 + 10, 1, 2)
      break
    }
    case Tile.MysteryBoxRareTop:
      ctx.fillStyle = '#9b45d4'
      ctx.fillRect(x0, y0, TILE_PX, TILE_PX)
      ctx.strokeStyle = '#6e2fa0'
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, TILE_PX - 1, TILE_PX - 1)
      break
    case Tile.MysteryBoxEpicSide: {
      ctx.fillStyle = '#e8a400'
      ctx.fillRect(x0, y0, TILE_PX, TILE_PX)
      ctx.strokeStyle = '#b07800'
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, TILE_PX - 1, TILE_PX - 1)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x0 + 5, y0 + 4, 5, 1)
      ctx.fillRect(x0 + 9, y0 + 5, 1, 2)
      ctx.fillRect(x0 + 7, y0 + 7, 2, 2)
      ctx.fillRect(x0 + 7, y0 + 10, 1, 2)
      break
    }
    case Tile.MysteryBoxEpicTop:
      ctx.fillStyle = '#e8a400'
      ctx.fillRect(x0, y0, TILE_PX, TILE_PX)
      ctx.strokeStyle = '#b07800'
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, TILE_PX - 1, TILE_PX - 1)
      break
    case Tile.LadderSide: {
      // Light wooden background
      ctx.fillStyle = '#c8a060'
      ctx.fillRect(x0, y0, TILE_PX, TILE_PX)
      // Two vertical side rails (dark brown)
      ctx.fillStyle = '#6b3e1a'
      ctx.fillRect(x0, y0, 3, TILE_PX)
      ctx.fillRect(x0 + TILE_PX - 3, y0, 3, TILE_PX)
      // Horizontal rungs evenly spaced
      ctx.fillStyle = '#8a5a28'
      for (const ry of [2, 6, 10, 14]) {
        ctx.fillRect(x0 + 3, y0 + ry, TILE_PX - 6, 2)
      }
      break
    }
    case Tile.GoldOreSide: {
      // Stone base with bright gold vein clusters
      speckle(ctx, x0, y0, '#8a8a8a', ['#7d7d7d', '#979797', '#6f6f6f'], 0.55, 22)
      // Gold cluster 1 (top-left area)
      ctx.fillStyle = '#e8a400'
      ctx.fillRect(x0 + 2, y0 + 2, 3, 2)
      ctx.fillRect(x0 + 3, y0 + 4, 2, 2)
      ctx.fillStyle = '#ffd040'
      ctx.fillRect(x0 + 2, y0 + 2, 2, 1)
      ctx.fillRect(x0 + 3, y0 + 4, 1, 1)
      // Gold cluster 2 (bottom-right area)
      ctx.fillStyle = '#e8a400'
      ctx.fillRect(x0 + 10, y0 + 9, 4, 2)
      ctx.fillRect(x0 + 11, y0 + 11, 3, 2)
      ctx.fillStyle = '#ffd040'
      ctx.fillRect(x0 + 10, y0 + 9, 3, 1)
      ctx.fillRect(x0 + 11, y0 + 11, 2, 1)
      // Small gold speck (middle)
      ctx.fillStyle = '#e8a400'
      ctx.fillRect(x0 + 7, y0 + 6, 2, 1)
      ctx.fillStyle = '#ffd040'
      ctx.fillRect(x0 + 7, y0 + 6, 1, 1)
      break
    }
    default:
      ctx.fillStyle = '#ff00ff'
      ctx.fillRect(x0, y0, TILE_PX, TILE_PX)
  }
}

export function createAtlas(): Atlas {
  const canvas = document.createElement('canvas')
  canvas.width = ATLAS_PX
  canvas.height = TILE_PX * ATLAS_ROWS
  const ctx = canvas.getContext('2d')!
  for (let tile = 0; tile < ATLAS_TILES * ATLAS_ROWS; tile++) {
    drawTile(ctx, tile, (tile % ATLAS_TILES) * TILE_PX, Math.floor(tile / ATLAS_TILES) * TILE_PX)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  texture.colorSpace = THREE.SRGBColorSpace
  return { texture, canvas, uvRect: uvRect }
}

export function uvRect(tile: number): [number, number, number, number] {
  const tx = tile % ATLAS_TILES
  const ty = Math.floor(tile / ATLAS_TILES)
  const u0 = tx / ATLAS_TILES + UV_EPSILON
  const u1 = (tx + 1) / ATLAS_TILES - UV_EPSILON
  // Canvas y grows downward; Three.js v grows upward.
  const v1 = 1 - ty / ATLAS_ROWS - UV_EPSILON
  const v0 = 1 - (ty + 1) / ATLAS_ROWS + UV_EPSILON
  return [u0, v0, u1, v1]
}
