import * as THREE from 'three'
import { Tile } from '../core/blocks'
import { mulberry32 } from '../core/rng'

export const TILE_PX = 16
export const ATLAS_TILES = 4  // columns (kept for icon backward-compat)
export const ATLAS_ROWS = 5   // rows (expanded for new blocks)
export const ATLAS_PX = TILE_PX * ATLAS_TILES   // width  = 64
export const ATLAS_PX_H = TILE_PX * ATLAS_ROWS  // height = 80

/** Half-texel inset to prevent neighboring tile bleed. */
const UV_EPS_U = 0.5 / ATLAS_PX
const UV_EPS_V = 0.5 / ATLAS_PX_H

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
    case Tile.Dirt:
      speckle(ctx, x0, y0, '#8a6244', ['#7a5538', '#96704e', '#6e4c32', '#9a7656'], 0.6, 4)
      break
    case Tile.Stone:
      speckle(ctx, x0, y0, '#8a8a8a', ['#7d7d7d', '#979797', '#6f6f6f', '#a2a2a2'], 0.55, 5)
      break
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
    case Tile.Leaves:
      speckle(ctx, x0, y0, '#3e7d2e', ['#346c26', '#488f37', '#2d5c1e', '#52a040'], 0.8, 9)
      break
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
      ctx.fillStyle = '#b8e8f0'
      ctx.fillRect(x0, y0, TILE_PX, TILE_PX)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillRect(x0 + 2, y0 + 2, 3, 5)
      ctx.fillRect(x0 + 7, y0 + 2, 2, 3)
      ctx.fillStyle = '#6ab8cc'
      ctx.fillRect(x0, y0, TILE_PX, 2)           // top border
      ctx.fillRect(x0, y0 + TILE_PX - 2, TILE_PX, 2) // bottom border
      ctx.fillRect(x0, y0, 2, TILE_PX)           // left border
      ctx.fillRect(x0 + TILE_PX - 2, y0, 2, TILE_PX) // right border
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
    case Tile.Bed: {
      // Mattress: warm red/white stripes with wood border
      ctx.fillStyle = '#c0392b'
      ctx.fillRect(x0, y0, TILE_PX, TILE_PX)
      ctx.fillStyle = '#e8d5d0'
      for (let i = 2; i < TILE_PX; i += 4) ctx.fillRect(x0 + i, y0, 2, TILE_PX)
      ctx.fillStyle = '#8b6914'
      ctx.fillRect(x0, y0, TILE_PX, 2)
      ctx.fillRect(x0, y0 + TILE_PX - 2, TILE_PX, 2)
      ctx.fillRect(x0, y0, 2, TILE_PX)
      ctx.fillRect(x0 + TILE_PX - 2, y0, 2, TILE_PX)
      // Pillow
      ctx.fillStyle = '#f5f0ee'
      ctx.fillRect(x0 + 3, y0 + 3, 10, 5)
      break
    }
    case Tile.Light: {
      // Lantern: dark outer frame, glowing amber center
      ctx.fillStyle = '#3a2a10'
      ctx.fillRect(x0, y0, TILE_PX, TILE_PX)
      ctx.fillStyle = '#f5a623'
      ctx.fillRect(x0 + 3, y0 + 3, 10, 10)
      ctx.fillStyle = '#ffd700'
      ctx.fillRect(x0 + 5, y0 + 5, 6, 6)
      ctx.fillStyle = '#fff8e0'
      ctx.fillRect(x0 + 7, y0 + 7, 2, 2)
      // Frame bars
      ctx.fillStyle = '#3a2a10'
      ctx.fillRect(x0 + 7, y0 + 3, 2, 10)
      ctx.fillRect(x0 + 3, y0 + 7, 10, 2)
      break
    }
    case Tile.Door: {
      // Wooden door: dark wood with panels and handle
      speckle(ctx, x0, y0, '#7b4f2e', ['#6b4226', '#8b5c36'], 0.2, 14)
      ctx.fillStyle = '#5c3518'
      ctx.fillRect(x0, y0, 2, TILE_PX)
      ctx.fillRect(x0 + TILE_PX - 2, y0, 2, TILE_PX)
      ctx.fillRect(x0, y0, TILE_PX, 2)
      ctx.fillRect(x0, y0 + TILE_PX - 2, TILE_PX, 2)
      ctx.fillRect(x0 + 2, y0 + 7, TILE_PX - 4, 2) // middle bar
      // Handle
      ctx.fillStyle = '#c0a050'
      ctx.fillRect(x0 + 11, y0 + 4, 2, 3)
      ctx.fillRect(x0 + 11, y0 + 10, 2, 3)
      break
    }
    case Tile.Desk: {
      // Flat desk: light wood surface with dark edge and drawer line
      speckle(ctx, x0, y0, '#c09a5a', ['#b08848', '#d0ac6c'], 0.2, 15)
      ctx.fillStyle = '#7b5c30'
      ctx.fillRect(x0, y0, TILE_PX, 2)
      ctx.fillRect(x0, y0, 2, TILE_PX)
      ctx.fillRect(x0 + TILE_PX - 2, y0, 2, TILE_PX)
      ctx.fillRect(x0, y0 + TILE_PX - 2, TILE_PX, 2)
      // Drawer line
      ctx.fillRect(x0 + 2, y0 + 9, TILE_PX - 4, 1)
      ctx.fillStyle = '#c0a050'
      ctx.fillRect(x0 + 7, y0 + 10, 2, 2) // drawer handle
      break
    }
    case Tile.Chair: {
      // Chair: brown seat with visible back-rest lines
      speckle(ctx, x0, y0, '#8b5e3c', ['#7b5030', '#9b6e4c'], 0.25, 16)
      ctx.fillStyle = '#5c3518'
      ctx.fillRect(x0, y0, TILE_PX, 2)           // top of back
      ctx.fillRect(x0, y0 + 2, 2, 6)             // back left post
      ctx.fillRect(x0 + TILE_PX - 2, y0 + 2, 2, 6) // back right post
      ctx.fillRect(x0, y0 + 8, TILE_PX, 2)       // seat top
      ctx.fillRect(x0, y0 + TILE_PX - 2, TILE_PX, 2) // seat bottom
      for (let i = 3; i < TILE_PX - 2; i += 3) ctx.fillRect(x0 + i, y0 + 2, 1, 6) // back slats
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
  canvas.height = ATLAS_PX_H
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
  const u0 = tx / ATLAS_TILES + UV_EPS_U
  const u1 = (tx + 1) / ATLAS_TILES - UV_EPS_U
  // Canvas y grows downward; Three.js v grows upward. Use ATLAS_ROWS for V.
  const v1 = 1 - ty / ATLAS_ROWS - UV_EPS_V
  const v0 = 1 - (ty + 1) / ATLAS_ROWS + UV_EPS_V
  return [u0, v0, u1, v1]
}
