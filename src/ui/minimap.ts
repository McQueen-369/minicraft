import { WATER_LEVEL } from '../constants'
import type { Terrain } from '../world/terrain'

export interface MapMarker {
  x: number
  z: number
  color: string
}

const MINI_SIZE = 116 // CSS size of the corner map
const BIG_SIZE = 460 // CSS size of the expanded map
const MINI_RES = 84 // sampled pixels (scaled up by CSS — keeps heightAt cheap)
const BIG_RES = 220
const MINI_HALF = 60 // world blocks from center to edge
const BIG_HALF = 180
const REDRAW_INTERVAL = 0.25 // seconds

const STYLE = `
.mc-minimap {
  position: absolute; top: 12px; right: 12px; z-index: 7;
  width: ${MINI_SIZE}px; height: ${MINI_SIZE}px; border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.6); overflow: hidden; cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.4); -webkit-tap-highlight-color: transparent;
}
.mc-minimap canvas { width: 100%; height: 100%; display: block; image-rendering: pixelated; }
.mc-minimap-hint {
  position: absolute; left: 0; right: 0; bottom: 0; text-align: center;
  font-family: 'Courier New', monospace; font-size: 9px; color: #fff;
  background: rgba(0,0,0,0.45); pointer-events: none;
}
.mc-map-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.75); z-index: 21;
  display: none; align-items: center; justify-content: center;
}
.mc-map-box {
  background: #c6c6c6; border: 3px solid; border-color: #fff #555 #555 #fff;
  padding: 12px; color: #333; font-family: 'Courier New', monospace; max-width: 95vw;
}
.mc-map-box h3 { margin: 0 0 8px; font-size: 15px; }
.mc-map-box canvas {
  display: block; width: ${BIG_SIZE}px; max-width: 86vw; height: auto; aspect-ratio: 1;
  image-rendering: pixelated; border: 2px solid #555;
}
.mc-map-legend { font-size: 12px; margin-top: 8px; line-height: 1.6; }
.mc-map-legend .sw { display: inline-block; width: 11px; height: 11px; vertical-align: -1px; margin-right: 4px; border: 1px solid #0006; }
.mc-map-close {
  margin-top: 10px; cursor: pointer; background: #8b8b8b; border: 2px solid;
  border-color: #fff #555 #555 #fff; font-family: 'Courier New', monospace;
  font-size: 13px; font-weight: bold; color: #333; padding: 8px 16px;
  -webkit-tap-highlight-color: transparent;
}
`

/** Top-down navigation map: a mini view in the corner that expands on click. */
export class Minimap {
  private readonly container: HTMLDivElement
  private readonly miniCanvas: HTMLCanvasElement
  private readonly overlay: HTMLDivElement
  private readonly bigCanvas: HTMLCanvasElement
  private redrawIn = 0
  private terrain: Terrain | null = null
  private pos = { x: 0, z: 0 }
  private yaw = 0
  private markers: MapMarker[] = []
  private home: { x: number; z: number } | null = null

  constructor(root: HTMLElement) {
    const style = document.createElement('style')
    style.textContent = STYLE
    document.head.appendChild(style)

    this.container = document.createElement('div')
    this.container.className = 'mc-minimap'
    this.container.style.display = 'none'
    this.miniCanvas = document.createElement('canvas')
    this.miniCanvas.width = MINI_RES
    this.miniCanvas.height = MINI_RES
    const hint = document.createElement('div')
    hint.className = 'mc-minimap-hint'
    hint.textContent = 'MAP'
    this.container.append(this.miniCanvas, hint)
    root.appendChild(this.container)

    this.overlay = document.createElement('div')
    this.overlay.className = 'mc-map-overlay'
    const box = document.createElement('div')
    box.className = 'mc-map-box'
    const title = document.createElement('h3')
    title.textContent = 'Navigation Map'
    this.bigCanvas = document.createElement('canvas')
    this.bigCanvas.width = BIG_RES
    this.bigCanvas.height = BIG_RES
    const legend = document.createElement('div')
    legend.className = 'mc-map-legend'
    legend.innerHTML =
      '<span class="sw" style="background:#d23b3b"></span>You (arrow shows facing) &nbsp; ' +
      '<span class="sw" style="background:#ffd34d"></span>Animals &nbsp; ' +
      '<span class="sw" style="background:#7ad0ff"></span>Players<br>' +
      '<span class="sw" style="background:#f4d35e"></span>🏠 Home &nbsp; ' +
      '<span class="sw" style="background:#2e6fae"></span>Water &nbsp; ' +
      '<span class="sw" style="background:#d9cfa0"></span>Sand &nbsp; ' +
      '<span class="sw" style="background:#5cab46"></span>Grass &nbsp; ' +
      '<span class="sw" style="background:#9a9a9a"></span>Hills'
    const close = document.createElement('button')
    close.className = 'mc-map-close'
    close.textContent = '✕ Close'
    box.append(title, this.bigCanvas, legend, close)
    this.overlay.appendChild(box)
    root.appendChild(this.overlay)

    const open = (e: Event) => { e.preventDefault(); this.openBig() }
    this.container.addEventListener('click', open)
    this.container.addEventListener('touchstart', open, { passive: false })
    const closeBig = (e: Event) => { e.preventDefault(); this.overlay.style.display = 'none' }
    close.addEventListener('click', closeBig)
    close.addEventListener('touchstart', closeBig, { passive: false })
    this.overlay.addEventListener('mousedown', (e) => { if (e.target === this.overlay) this.overlay.style.display = 'none' })
  }

  /** Mark the player's home (starter house) so it shows on the map. */
  setHome(x: number, z: number): void {
    this.home = { x, z }
  }

  show(): void { this.container.style.display = '' }

  hide(): void {
    this.container.style.display = 'none'
    this.overlay.style.display = 'none'
  }

  private get isBigOpen(): boolean {
    return this.overlay.style.display === 'flex'
  }

  private openBig(): void {
    this.overlay.style.display = 'flex'
    this.draw(this.bigCanvas, BIG_HALF)
  }

  update(terrain: Terrain, pos: { x: number; z: number }, yaw: number, markers: MapMarker[], dt: number): void {
    this.terrain = terrain
    this.pos = { x: pos.x, z: pos.z }
    this.yaw = yaw
    this.markers = markers
    this.redrawIn -= dt
    if (this.redrawIn > 0) return
    this.redrawIn = REDRAW_INTERVAL
    this.draw(this.miniCanvas, MINI_HALF)
    if (this.isBigOpen) this.draw(this.bigCanvas, BIG_HALF)
  }

  private draw(canvas: HTMLCanvasElement, half: number): void {
    const terrain = this.terrain
    const ctx = canvas.getContext('2d')
    if (!terrain || !ctx) return
    const size = canvas.width
    const step = (half * 2) / size
    const cx = this.pos.x
    const cz = this.pos.z
    const img = ctx.createImageData(size, size)
    let i = 0
    for (let py = 0; py < size; py++) {
      const wz = cz - half + py * step
      for (let px = 0; px < size; px++) {
        const wx = cx - half + px * step
        const [r, g, b] = terrainColor(terrain.heightAt(Math.round(wx), Math.round(wz)))
        img.data[i++] = r
        img.data[i++] = g
        img.data[i++] = b
        img.data[i++] = 255
      }
    }
    ctx.putImageData(img, 0, 0)

    // Home icon — clamped to the map edge when off-screen so it always points
    // the player back toward their house.
    if (this.home) {
      let sx = ((this.home.x - cx) / step) + size / 2
      let sy = ((this.home.z - cz) / step) + size / 2
      const m = size > 200 ? 9 : 6
      sx = Math.max(m, Math.min(size - m, sx))
      sy = Math.max(m, Math.min(size - m, sy))
      drawHouseIcon(ctx, sx, sy, size > 200 ? 7 : 5)
    }

    // Markers (animals, players).
    for (const m of this.markers) {
      const sx = ((m.x - cx) / step) + size / 2
      const sy = ((m.z - cz) / step) + size / 2
      if (sx < 0 || sx >= size || sy < 0 || sy >= size) continue
      ctx.fillStyle = m.color
      ctx.beginPath()
      ctx.arc(sx, sy, size > 200 ? 4 : 2.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // Player arrow at center, pointing in facing direction.
    const dirX = -Math.sin(this.yaw)
    const dirZ = -Math.cos(this.yaw)
    const ang = Math.atan2(dirZ, dirX)
    const cxp = size / 2
    const cyp = size / 2
    const r = size > 200 ? 9 : 6
    ctx.save()
    ctx.translate(cxp, cyp)
    ctx.rotate(ang + Math.PI / 2)
    ctx.fillStyle = '#d23b3b'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, -r)
    ctx.lineTo(r * 0.66, r * 0.7)
    ctx.lineTo(0, r * 0.3)
    ctx.lineTo(-r * 0.66, r * 0.7)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }
}

/** A little house glyph: walls with a peaked roof, outlined for contrast. */
function drawHouseIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.lineJoin = 'round'
  ctx.lineWidth = 1.5
  ctx.strokeStyle = '#3a2a12'
  ctx.fillStyle = '#f4d35e'
  // Walls.
  ctx.beginPath()
  ctx.rect(-r * 0.7, 0, r * 1.4, r)
  ctx.fill()
  ctx.stroke()
  // Roof.
  ctx.beginPath()
  ctx.moveTo(-r, 0)
  ctx.lineTo(0, -r)
  ctx.lineTo(r, 0)
  ctx.closePath()
  ctx.fillStyle = '#c1440e'
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function terrainColor(h: number): [number, number, number] {
  if (h <= WATER_LEVEL) return [46, 111, 174] // water
  if (h <= WATER_LEVEL + 1) return [217, 207, 160] // sand
  if (h >= 62) return [232, 232, 232] // snowy peaks
  if (h >= 52) return [154, 154, 154] // bare stone hills
  // Grass, darkening with elevation.
  const t = Math.min(1, (h - (WATER_LEVEL + 2)) / 26)
  return [Math.round(92 - t * 30), Math.round(171 - t * 60), Math.round(70 - t * 25)]
}
