import { blockDef } from '../core/blocks'
import { ItemId, itemDef } from '../items/items'
import { ATLAS_TILES, TILE_PX } from '../render/atlas'

/** Draw an item's icon into a square canvas of the given CSS pixel size. */
export function drawItemIcon(canvas: HTMLCanvasElement, itemId: number, atlasCanvas: HTMLCanvasElement): void {
  const size = canvas.width
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, size, size)
  const def = itemDef(itemId)
  if (!def) return
  if (def.kind === 'block' && def.block !== undefined) {
    const block = blockDef(def.block)
    if (!block) return
    const tile = block.tiles.side
    const sx = (tile % ATLAS_TILES) * TILE_PX
    const sy = Math.floor(tile / ATLAS_TILES) * TILE_PX
    ctx.drawImage(atlasCanvas, sx, sy, TILE_PX, TILE_PX, 0, 0, size, size)
    return
  }
  const px = size / 16
  const p = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(x * px, y * px, w * px, h * px)
  }
  switch (itemId) {
    case ItemId.WoodPickaxe:
    case ItemId.StonePickaxe: {
      const head = itemId === ItemId.StonePickaxe ? '#8a8a8a' : '#b08d5a'
      // Diagonal handle
      for (let i = 0; i < 8; i++) p(4 + i, 11 - i, 1, 1, '#6b4a2a')
      // Curved head
      p(3, 2, 9, 2, head)
      p(2, 3, 2, 3, head)
      p(11, 3, 2, 3, head)
      break
    }
    case ItemId.Axe: {
      for (let i = 0; i < 8; i++) p(5 + i, 12 - i, 1, 1, '#6b4a2a')
      p(3, 2, 5, 5, '#8a8a8a')
      p(2, 3, 1, 3, '#8a8a8a')
      break
    }
    case ItemId.Shears: {
      p(4, 8, 3, 5, '#c0c0c0')
      p(9, 8, 3, 5, '#c0c0c0')
      p(6, 4, 1, 5, '#7d7d7d')
      p(9, 4, 1, 5, '#7d7d7d')
      break
    }
    case ItemId.Wheat: {
      for (const x of [4, 7, 10]) {
        p(x, 4, 1, 9, '#c9a227')
        p(x - 1, 3, 3, 3, '#e3c14b')
      }
      break
    }
    case ItemId.Carrot: {
      p(7, 3, 2, 2, '#3e7d2e')
      p(6, 5, 4, 3, '#e67e22')
      p(7, 8, 2, 4, '#e67e22')
      break
    }
    case ItemId.Seeds: {
      for (const [x, y] of [[4, 5], [8, 4], [11, 7], [6, 9], [9, 11], [4, 12]]) p(x, y, 1.5, 1.5, '#7a9c3d')
      break
    }
    case ItemId.CapturedPig:
    case ItemId.CapturedChicken:
    case ItemId.CapturedSheep: {
      const color =
        itemId === ItemId.CapturedPig ? '#eaa8a0' : itemId === ItemId.CapturedChicken ? '#f7f7f2' : '#f2f2ee'
      p(3, 5, 10, 8, color)
      p(5, 7, 2, 2, '#222')
      p(9, 7, 2, 2, '#222')
      ctx.strokeStyle = '#555'
      ctx.lineWidth = px
      ctx.strokeRect(2 * px, 4 * px, 12 * px, 10 * px)
      break
    }
  }
}
