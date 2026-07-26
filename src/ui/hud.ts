import { HOTBAR_SIZE } from '../constants'
import type { Inventory } from '../items/inventory'
import { itemDef } from '../items/items'
import { drawItemIcon } from './icons'
import type { WorldKind } from '../world/worldKind'
import type { InfoContent } from './info'

const STYLE = `
:root { --mc-slot: 52px; }
/* Scale the hotbar down so all slots + buttons fit narrow (portrait) screens. */
@media (max-width: 900px) { :root { --mc-slot: 44px; } }
@media (max-width: 640px) { :root { --mc-slot: 38px; } }
@media (max-width: 470px) { :root { --mc-slot: 32px; } }
/* Short landscape screens: keep the bottom bar compact. */
@media (max-height: 500px) { :root { --mc-slot: 36px; } }
.mc-help-btn {
  position: absolute; top: 182px; right: 12px; z-index: 7;
  width: 52px; height: 52px; border-radius: 10px;
  background: rgba(20,20,20,0.65); border: 2px solid #888;
  color: #fff; font-size: var(--mc-fs-xl, 22px); font-weight: bold;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.mc-help-btn:hover, .mc-help-btn:active { border-color: #fff; background: rgba(60,60,60,0.7); }
.mc-music-btn {
  position: absolute; top: 182px; right: 72px; z-index: 7;
  width: 52px; height: 52px; border-radius: 10px;
  background: rgba(20,20,20,0.65); border: 2px solid #888;
  color: #fff; font-size: var(--mc-fs-xl, 22px); font-weight: bold;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.mc-music-btn:hover, .mc-music-btn:active { border-color: #fff; background: rgba(60,60,60,0.7); }
.mc-music-btn.muted { color: #888; }
.mc-instructions {
  position: absolute; inset: 0; background: rgba(0,0,0,0.75); z-index: 20;
  display: none; align-items: center; justify-content: center;
}
.mc-instructions-box {
  background: #c6c6c6; border: 3px solid; border-color: #fff #555 #555 #fff;
  padding: 16px; max-width: 480px; width: 90%; max-height: 80vh; overflow-y: auto;
  color: #333; font-family: 'Courier New', monospace; font-size: var(--mc-fs-sm, 14px); line-height: 1.6;
}
.mc-instructions-box h3 { margin: 10px 0 4px; font-size: var(--mc-fs-md, 16px); color: #000; border-bottom: 1px solid #999; padding-bottom: 2px; }
.mc-instructions-box h3:first-child { margin-top: 0; }
.mc-instructions-box p { margin: 3px 0; }
.mc-instructions-close {
  float: right; cursor: pointer; background: #888; border: none; border-radius: 4px;
  font-size: var(--mc-fs-sm, 14px); font-weight: bold; color: #fff; padding: 6px 12px; margin-left: 8px;
  -webkit-tap-highlight-color: transparent;
}
.mc-instructions-close:hover { background: #6a6a6a; }
/* Reminder that Escape (or a click outside) also dismisses the overlay. */
.mc-instructions-hint {
  clear: both; margin-top: 12px; padding-top: 8px; border-top: 1px solid #999;
  font-size: var(--mc-fs-xs, 12.5px); color: #555; text-align: center;
}
/* "Did you know?" panel on an info card: real-world facts, visually separate
   from the game instructions above it. */
.mc-fact {
  margin-top: 12px; padding: 8px 10px; border-left: 4px solid #3d7a3d;
  background: #d8ddc8; color: #2b3a26; font-size: var(--mc-fs-sm, 14px); line-height: 1.5;
}
.mc-fact b { display: block; margin-bottom: 3px; color: #1f4a1f; }
.mc-crosshair {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: 18px; height: 18px; pointer-events: none; z-index: 5;
}
.mc-crosshair::before, .mc-crosshair::after {
  content: ''; position: absolute; background: rgba(255,255,255,0.85);
  mix-blend-mode: difference;
}
.mc-crosshair::before { left: 8px; top: 0; width: 2px; height: 18px; }
.mc-crosshair::after { left: 0; top: 8px; width: 18px; height: 2px; }
.mc-mining {
  position: absolute; left: 50%; top: calc(50% + 24px); transform: translateX(-50%);
  width: 80px; height: 8px; background: rgba(0,0,0,0.5); border: 1px solid #fff;
  z-index: 5; display: none;
}
.mc-mining > div { height: 100%; background: #fff; width: 0%; }
.mc-bottom {
  position: absolute; left: 50%; bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%); z-index: 7; max-width: 100vw;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  pointer-events: none;
}
.mc-hotbar {
  display: flex; flex-wrap: wrap; justify-content: center; gap: 4px;
  max-width: 100vw; padding: 0 4px; pointer-events: auto;
}
.mc-held-name {
  color: #fff; font-size: var(--mc-fs-sm, 14px); font-weight: bold; text-shadow: 1px 1px 0 #000;
  font-family: 'Courier New', monospace; pointer-events: none;
  transition: opacity 0.4s; opacity: 0; min-height: 1.3em;
}
.mc-slot {
  width: var(--mc-slot, 52px); height: var(--mc-slot, 52px); background: rgba(20,20,20,0.6);
  border: 2px solid #555; position: relative; image-rendering: pixelated;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.mc-slot.selected { border-color: #fff; }
.mc-slot:active { background: rgba(60,60,60,0.8); }
.mc-slot canvas { width: 100%; height: 100%; image-rendering: pixelated; }
.mc-slot .count {
  position: absolute; right: 3px; bottom: 1px; color: #fff; font-size: clamp(12px, calc(var(--mc-slot, 52px) * 0.3), 16px);
  font-weight: bold; text-shadow: 1px 1px 0 #000; pointer-events: none;
}
.mc-bag-slot {
  width: var(--mc-slot, 52px); height: var(--mc-slot, 52px); margin-left: 8px; border-radius: 8px;
  background: rgba(20,20,20,0.7); border: 2px solid #888; color: #fff;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1px; font-size: var(--mc-fs-2xs, 11px); font-weight: bold; cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.mc-bag-slot:hover, .mc-bag-slot:active { border-color: #fff; background: rgba(60,60,60,0.85); }
.mc-bag-slot svg { width: clamp(15px, calc(var(--mc-slot, 52px) * 0.42), 22px); height: clamp(15px, calc(var(--mc-slot, 52px) * 0.42), 22px); }
.mc-chat-btn {
  height: var(--mc-slot, 52px); margin-left: 4px; padding: 0 10px; border-radius: 8px;
  background: rgba(20,20,20,0.7); border: 2px solid #888; color: #fff;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1px; font-size: var(--mc-fs-2xs, 11px); font-weight: bold; cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.mc-chat-btn:hover, .mc-chat-btn:active { border-color: #fff; background: rgba(60,60,60,0.85); }
.mc-chat-btn.active { border-color: #7ec8e3; background: rgba(20,60,80,0.85); }
.mc-chat-btn svg { width: clamp(15px, calc(var(--mc-slot, 52px) * 0.42), 22px); height: clamp(15px, calc(var(--mc-slot, 52px) * 0.42), 22px); }
.mc-craft-btn-hud {
  height: var(--mc-slot, 52px); margin-left: 4px; padding: 0 10px; border-radius: 8px;
  background: rgba(20,20,20,0.7); border: 2px solid #888; color: #fff;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1px; font-size: var(--mc-fs-2xs, 11px); font-weight: bold; cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.mc-craft-btn-hud:hover, .mc-craft-btn-hud:active { border-color: #fff; background: rgba(60,60,60,0.85); }
.mc-craft-btn-hud.active { border-color: #f4c060; background: rgba(60,40,0,0.85); }
.mc-craft-btn-hud svg { width: clamp(15px, calc(var(--mc-slot, 52px) * 0.42), 22px); height: clamp(15px, calc(var(--mc-slot, 52px) * 0.42), 22px); }
.mc-underwater {
  position: absolute; inset: 0; pointer-events: none; z-index: 4;
  background: rgba(0,60,180,0.22); opacity: 0; transition: opacity 0.3s;
}
/* Molten glow while standing in (or submerged by) lava. */
.mc-lava {
  position: absolute; inset: 0; pointer-events: none; z-index: 4;
  background: radial-gradient(circle at 50% 65%, rgba(255,140,20,0.55), rgba(150,20,0,0.85));
  opacity: 0; transition: opacity 0.25s;
}
.mc-nameplate {
  position: absolute; left: 50%; top: 40px; transform: translateX(-50%);
  z-index: 6; display: none; align-items: center; gap: 8px;
  background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.35);
  border-radius: 16px; padding: 4px 8px 4px 14px;
  font-family: 'Courier New', monospace; color: #fff; pointer-events: none;
}
.mc-nameplate-name { font-size: var(--mc-fs-sm, 14px); font-weight: bold; text-shadow: 1px 1px 0 #000; }
.mc-nameplate-info {
  width: 1.9em; height: 1.9em; border-radius: 50%; border: 1px solid rgba(255,255,255,0.6);
  background: rgba(255,255,255,0.15); color: #fff; font-size: var(--mc-fs-sm, 14px); font-weight: bold;
  font-style: italic; font-family: Georgia, 'Times New Roman', serif;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  pointer-events: auto; -webkit-tap-highlight-color: transparent;
}
.mc-nameplate-info:hover, .mc-nameplate-info:active { background: rgba(255,220,80,0.5); }
.mc-debug {
  position: absolute; left: 8px; top: 8px; color: #fff; font-size: var(--mc-fs-xs, 12.5px);
  text-shadow: 1px 1px 0 #000; z-index: 5; white-space: pre; pointer-events: none;
}
/* Phones: the dev stats line would collide with the centred day timer. */
@media (max-width: 900px), (max-height: 500px) {
  .mc-debug { display: none; }
}
/* Sits clear of the hotbar stack (and above it) so messages stay readable. */
.mc-toast {
  position: absolute; left: 50%; bottom: 150px; transform: translateX(-50%);
  color: #fff; font-size: var(--mc-fs-sm, 14px); text-shadow: 1px 1px 0 #000; z-index: 8;
  max-width: min(560px, 90vw); text-align: center; line-height: 1.4;
  background: rgba(12,12,14,0.62); padding: 6px 14px; border-radius: 6px;
  pointer-events: none; transition: opacity 0.5s; opacity: 0;
}
/* On phones the bottom half belongs to the touch controls, so messages drop
   below the minimap and the music/help buttons instead. */
@media (max-width: 900px) {
  .mc-toast { bottom: auto; top: 248px; max-width: 86vw; }
}
/* Landscape phones have no room up top; go back above the hotbar. */
@media (max-height: 560px) {
  .mc-toast { top: auto; bottom: 120px; }
}
.mc-daytimer {
  position: absolute; left: 50%; top: calc(8px + env(safe-area-inset-top, 0px)); transform: translateX(-50%);
  color: #fff; font-size: var(--mc-fs-sm, 14px); text-shadow: 1px 1px 0 #000; z-index: 5;
  pointer-events: none; font-family: 'Courier New', monospace; letter-spacing: 1px;
}
.mc-energy {
  position: relative; width: min(260px, 74vw); height: clamp(18px, 2.6vmin, 24px); pointer-events: none;
  background: rgba(10,10,10,0.6); border: 2px solid #333; border-radius: 8px;
  display: flex; align-items: center; overflow: hidden;
}
.mc-energy-fill {
  height: 100%; background: linear-gradient(90deg, #e8b23a, #ffd34d);
  transition: width 0.25s ease; border-radius: 5px;
}
.mc-energy-fill.low { background: linear-gradient(90deg, #b03020, #e05540); }
.mc-energy-label {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  color: #fff; font-size: var(--mc-fs-2xs, 11px); font-weight: bold; text-shadow: 1px 1px 0 #000;
  font-family: 'Courier New', monospace; letter-spacing: 1px; white-space: nowrap;
}
.mc-players {
  position: absolute; top: 244px; right: 12px; z-index: 5;
  color: #fff; font-size: var(--mc-fs-xs, 12.5px); text-shadow: 1px 1px 0 #000;
  pointer-events: none; text-align: right; line-height: 1.6; display: none;
}
.mc-chest-overlay {
  position: absolute; left: 50%; top: 58px; transform: translateX(-50%);
  z-index: 15; min-width: 220px; max-width: 320px; display: none; cursor: pointer;
  background: rgba(18,22,28,0.92); border: 2px solid #6b6b6b; border-radius: 8px;
  color: #fff; font-family: 'Courier New', monospace; padding: 10px 14px;
  box-shadow: 0 4px 18px rgba(0,0,0,0.55); -webkit-tap-highlight-color: transparent;
  transition: opacity 0.3s; opacity: 0;
}
.mc-chest-overlay h4 { margin: 0 0 6px; font-size: var(--mc-fs-sm, 14px); color: #ffe39a; }
.mc-chest-overlay-row { display: flex; align-items: center; gap: 8px; font-size: var(--mc-fs-xs, 12.5px); margin: 3px 0; }
.mc-chest-overlay-row canvas {
  width: 24px; height: 24px; image-rendering: pixelated; flex: 0 0 24px;
  background: rgba(255,255,255,0.08); border: 1px solid #555;
}
.mc-chest-overlay-hint { font-size: var(--mc-fs-2xs, 11px); color: #9aa; margin-top: 7px; }
`

export class HUD {
  private readonly hotbarSlots: HTMLDivElement[] = []
  private readonly miningBar: HTMLDivElement
  private readonly miningFill: HTMLDivElement
  private readonly debug: HTMLDivElement
  private readonly toast: HTMLDivElement
  private readonly dayTimer: HTMLDivElement
  private readonly energyBar: HTMLDivElement
  private readonly energyFill: HTMLDivElement
  private readonly energyLabel: HTMLSpanElement
  private lastEnergy = -1
  private readonly heldName: HTMLDivElement
  private heldNameTimer: ReturnType<typeof setTimeout> | null = null
  /** selected index + itemId of the last shown name, to announce only changes. */
  private lastHeldKey = ''
  private readonly sleepFade: HTMLDivElement
  private readonly playerList: HTMLDivElement
  private readonly instructionsOverlay: HTMLDivElement
  private readonly worldHelp: HTMLDivElement
  private worldKind: WorldKind = 'terrain'
  private readonly nameplate: HTMLDivElement
  private readonly nameplateName: HTMLSpanElement
  private readonly infoOverlay: HTMLDivElement
  private readonly infoBox: HTMLDivElement
  private readonly chatBtn: HTMLDivElement
  private readonly craftBtnHud: HTMLDivElement
  private readonly underwaterOverlay: HTMLDivElement
  private readonly lavaOverlay: HTMLDivElement
  private readonly chestOverlay: HTMLDivElement
  private chestOverlayTimer: ReturnType<typeof setTimeout> | null = null
  private currentInfo: InfoContent | null = null
  private toastTimer = 0
  /** Called when the inventory quick-access button is clicked. */
  onInventory: () => void = () => {}
  /** Called when the chat button is tapped/clicked. */
  onChatToggle: () => void = () => {}
  /** Called when the craft button is tapped/clicked. */
  onCraftToggle: () => void = () => {}
  /** Called when a hotbar slot is tapped/clicked to select it. */
  onSelectHotbar: (index: number) => void = () => {}
  /** Called when the info card closes (so the game can re-lock the pointer). */
  onInfoClose: () => void = () => {}
  /** Called when the instructions overlay opens (so the game can free the cursor). */
  onInstructionsOpen: () => void = () => {}
  /** Called when the instructions overlay closes (so the game can re-lock). */
  onInstructionsClose: () => void = () => {}
  /** Called when the music button is toggled; returns the new muted state. */
  onToggleMusic: () => boolean = () => false

  constructor(
    root: HTMLElement,
    private readonly inventory: Inventory,
    private readonly atlasCanvas: HTMLCanvasElement,
  ) {
    const style = document.createElement('style')
    style.textContent = STYLE
    document.head.appendChild(style)

    const crosshair = document.createElement('div')
    crosshair.className = 'mc-crosshair'
    root.appendChild(crosshair)

    this.miningBar = document.createElement('div')
    this.miningBar.className = 'mc-mining'
    this.miningFill = document.createElement('div')
    this.miningBar.appendChild(this.miningFill)
    root.appendChild(this.miningBar)

    // Bottom-anchored stack: energy bar above the hotbar, centred, wrapping on
    // narrow screens so nothing is ever cut off.
    const bottomWrap = document.createElement('div')
    bottomWrap.className = 'mc-bottom'

    const hotbar = document.createElement('div')
    hotbar.className = 'mc-hotbar'
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const slot = document.createElement('div')
      slot.className = 'mc-slot'
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 32
      slot.appendChild(canvas)
      const count = document.createElement('span')
      count.className = 'count'
      slot.appendChild(count)
      hotbar.appendChild(slot)
      this.hotbarSlots.push(slot)
      const idx = i
      slot.addEventListener('touchstart', (e) => { e.preventDefault(); this.onSelectHotbar(idx) }, { passive: false })
      slot.addEventListener('click', () => this.onSelectHotbar(idx))
    }
    // 10th touch area next to the last hotbar slot: open the bag / inspect items.
    const bagSlot = document.createElement('div')
    bagSlot.className = 'mc-bag-slot'
    bagSlot.title = 'Open bag (E)'
    const bagSvgNS = 'http://www.w3.org/2000/svg'
    const bagSvg = document.createElementNS(bagSvgNS, 'svg')
    bagSvg.setAttribute('viewBox', '0 0 24 24')
    bagSvg.setAttribute('fill', 'none')
    bagSvg.setAttribute('stroke', 'currentColor')
    bagSvg.setAttribute('stroke-width', '2')
    const bagBody = document.createElementNS(bagSvgNS, 'path')
    bagBody.setAttribute('d', 'M5 8h14l-1 12H6L5 8z')
    const bagHandle = document.createElementNS(bagSvgNS, 'path')
    bagHandle.setAttribute('d', 'M9 8a3 3 0 0 1 6 0')
    bagSvg.append(bagBody, bagHandle)
    const bagLabel = document.createElement('span')
    bagLabel.textContent = 'BAG'
    bagSlot.append(bagSvg, bagLabel)
    bagSlot.addEventListener('click', () => this.onInventory())
    bagSlot.addEventListener('touchstart', (e) => { e.preventDefault(); this.onInventory() }, { passive: false })
    hotbar.appendChild(bagSlot)

    // Chat button
    const chatBtn = document.createElement('div')
    chatBtn.className = 'mc-chat-btn'
    chatBtn.title = 'Chat'
    const chatSvgNS = 'http://www.w3.org/2000/svg'
    const chatSvg = document.createElementNS(chatSvgNS, 'svg')
    chatSvg.setAttribute('viewBox', '0 0 24 24')
    chatSvg.setAttribute('fill', 'none')
    chatSvg.setAttribute('stroke', 'currentColor')
    chatSvg.setAttribute('stroke-width', '2')
    chatSvg.setAttribute('stroke-linecap', 'round')
    chatSvg.setAttribute('stroke-linejoin', 'round')
    const chatBubble = document.createElementNS(chatSvgNS, 'path')
    chatBubble.setAttribute('d', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z')
    chatSvg.appendChild(chatBubble)
    const chatLabel = document.createElement('span')
    chatLabel.textContent = 'CHAT'
    chatBtn.append(chatSvg, chatLabel)
    chatBtn.addEventListener('click', () => this.onChatToggle())
    chatBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.onChatToggle() }, { passive: false })
    hotbar.appendChild(chatBtn)
    this.chatBtn = chatBtn

    // Craft button
    const craftBtnHud = document.createElement('div')
    craftBtnHud.className = 'mc-craft-btn-hud'
    craftBtnHud.title = 'Crafting'
    const craftNS = 'http://www.w3.org/2000/svg'
    const craftSvg = document.createElementNS(craftNS, 'svg')
    craftSvg.setAttribute('viewBox', '0 0 24 24')
    craftSvg.setAttribute('fill', 'none')
    craftSvg.setAttribute('stroke', 'currentColor')
    craftSvg.setAttribute('stroke-width', '2')
    craftSvg.setAttribute('stroke-linecap', 'round')
    craftSvg.setAttribute('stroke-linejoin', 'round')
    // Wrench icon path
    const wrenchPath = document.createElementNS(craftNS, 'path')
    wrenchPath.setAttribute('d', 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z')
    craftSvg.appendChild(wrenchPath)
    const craftLabel = document.createElement('span')
    craftLabel.textContent = 'CRAFT'
    craftBtnHud.append(craftSvg, craftLabel)
    craftBtnHud.addEventListener('click', () => this.onCraftToggle())
    craftBtnHud.addEventListener('touchstart', (e) => { e.preventDefault(); this.onCraftToggle() }, { passive: false })
    hotbar.appendChild(craftBtnHud)
    this.craftBtnHud = craftBtnHud

    // Energy bar sits directly above the hotbar inside the bottom stack.
    this.energyBar = document.createElement('div')
    this.energyBar.className = 'mc-energy'
    this.energyFill = document.createElement('div')
    this.energyFill.className = 'mc-energy-fill'
    this.energyLabel = document.createElement('span')
    this.energyLabel.className = 'mc-energy-label'
    this.energyBar.append(this.energyFill, this.energyLabel)

    // Name of the item just selected in the hotbar, fading above the energy bar.
    this.heldName = document.createElement('div')
    this.heldName.className = 'mc-held-name'

    bottomWrap.append(this.heldName, this.energyBar, hotbar)
    root.appendChild(bottomWrap)

    // Full-screen black overlay for the sleep eyes-closing transition.
    this.sleepFade = document.createElement('div')
    this.sleepFade.className = 'mc-sleep-fade'
    this.sleepFade.style.cssText =
      'position:absolute;inset:0;background:#000;z-index:19;pointer-events:none;opacity:0;display:none;transition:opacity 0.9s ease;'
    root.appendChild(this.sleepFade)

    // Underwater tint overlay
    this.underwaterOverlay = document.createElement('div')
    this.underwaterOverlay.className = 'mc-underwater'
    root.appendChild(this.underwaterOverlay)

    // Lava glow overlay
    this.lavaOverlay = document.createElement('div')
    this.lavaOverlay.className = 'mc-lava'
    root.appendChild(this.lavaOverlay)

    // Transient chest-contents overview (auto-dismiss after 3s or on click).
    this.chestOverlay = document.createElement('div')
    this.chestOverlay.className = 'mc-chest-overlay'
    const dismissChest = (e: Event) => { e.preventDefault(); this.hideChestOverview() }
    this.chestOverlay.addEventListener('click', dismissChest)
    this.chestOverlay.addEventListener('touchstart', dismissChest, { passive: false })
    root.appendChild(this.chestOverlay)

    this.debug = document.createElement('div')
    this.debug.className = 'mc-debug'
    root.appendChild(this.debug)

    this.toast = document.createElement('div')
    this.toast.className = 'mc-toast'
    root.appendChild(this.toast)

    this.dayTimer = document.createElement('div')
    this.dayTimer.className = 'mc-daytimer'
    root.appendChild(this.dayTimer)

    this.playerList = document.createElement('div')
    this.playerList.className = 'mc-players'
    root.appendChild(this.playerList)

    const helpBtn = document.createElement('div')
    helpBtn.className = 'mc-help-btn'
    helpBtn.title = 'Help / Instructions'
    helpBtn.textContent = '?'
    helpBtn.addEventListener('click', () => this.showInstructions())
    helpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.showInstructions() }, { passive: false })
    root.appendChild(helpBtn)

    const musicBtn = document.createElement('div')
    musicBtn.className = 'mc-music-btn'
    musicBtn.title = 'Toggle music'
    musicBtn.textContent = '♪'
    const toggleMusic = () => {
      const muted = this.onToggleMusic()
      musicBtn.classList.toggle('muted', muted)
      musicBtn.textContent = muted ? '♪̸' : '♪'
    }
    musicBtn.addEventListener('click', toggleMusic)
    musicBtn.addEventListener('touchstart', (e) => { e.preventDefault(); toggleMusic() }, { passive: false })
    root.appendChild(musicBtn)

    const overlay = document.createElement('div')
    // Two overlays share the `mc-instructions` look; the modifier class names
    // which is which for styling and for tests.
    overlay.className = 'mc-instructions mc-help-overlay'
    const box = document.createElement('div')
    box.className = 'mc-instructions-box'
    box.innerHTML = `
      <button class="mc-instructions-close">✕ Close</button>
      <h3>Controls</h3>
      <p>WASD / Arrows — Move</p>
      <p>Space — Jump &nbsp; F — Toggle fly &nbsp; Shift (fly) — Down</p>
      <p>E — Inventory &nbsp; C — Chat &nbsp; Z — Crafting &nbsp; M — Map</p>
      <p>I — Instructions / Info &nbsp; 1–9 — Select hotbar &nbsp; Scroll — Cycle hotbar</p>
      <p>Left-click (hold) — Mine &nbsp; Right-click — Place / Use / Open chest</p>
      <p>Climb Ladders: Space (up) &nbsp; Shift (down)</p>
      <p><b>Esc — Close whatever is open</b> (this card, the map, the bag, crafting, the market)</p>
      <p>Every panel frees the mouse cursor while it is open, and hands it back to the game when you close it</p>
      <h3>Mobile Controls</h3>
      <p>Joystick — Move</p>
      <p>Swipe right side — Look around</p>
      <p>Green ▲ — Jump / fly up &nbsp; Red ⛏ (hold) — Mine &nbsp; Blue ▼ — Fly down</p>
      <p>USE — Place / Interact &nbsp; FLY — Toggle fly</p>
      <p>Double-tap the look area while aiming at your animal — Store it in the bag</p>
      <p>Tap the BAG slot by the hotbar — Open inventory &nbsp; Tap hotbar slot — Select item</p>
      <div class="mc-help-world"></div>
      <h3>Digging Deep &amp; Lava</h3>
      <p>Keep digging and the stone gives way to glowing lava lakes, at least 12 blocks under the deepest ore</p>
      <p>Lava cannot be mined or picked up, and standing in it burns energy fast — hold Space to paddle back out</p>
      <p>Bridge across a lava lake by placing blocks along the rim, and bring food before you go down</p>
      <h3>Diamonds &amp; Sword Upgrades</h3>
      <p>Diamond Ore hides deep underground (6+ blocks below the surface) — mine it with a pickaxe</p>
      <p>Spend Diamonds at the market smithy: Iron Blade (4💎) and Diamond Edge (8💎)</p>
      <p>Forge in the crafting menu: Sword + Iron Blade → Iron Sword; Iron Sword + Diamond Edge → Diamond Sword</p>
      <h3>Chickens &amp; Eggs</h3>
      <p>Tamed chickens lay an egg every 2 days — right-click (USE) your chicken to collect it</p>
      <p>Eggs are a cooking ingredient for hearty dishes</p>
      <h3>Challenge Island</h3>
      <p>An island of challenges sits in a ring-shaped lake a few hundred blocks out</p>
      <p>Follow the pink flag 🏝 on your map — it always points toward the island</p>
      <p>Its arcade kiosks host mini-games — puzzles, running, math targets, word guessing — with item prizes!</p>
      <p>Every challenge asks you to pick Easy, Normal or Hard first — harder rounds pay much bigger rewards</p>
      <h3>Furniture & Home</h3>
      <p>New worlds start with a furnished cottage (pitched roof!) and a fence-ringed farm</p>
      <p>Release tamed animals into the farm pen — toggle them to "stay" to keep them in</p>
      <p>Place furniture (doors, windows, desk, chairs, bed, sofa) with USE; MINE to pick it back up</p>
      <p>USE a door to swing it open or closed</p>
      <h3>Map & Music</h3>
      <p>Mini-map sits top-right — tap it to open the full navigation map</p>
      <p>♪ button toggles the background music</p>
      <h3>Animals &amp; Taming</h3>
      <p>Apple → tame Pig &nbsp; Carrot → tame Rabbit &nbsp; Seeds → tame Chicken</p>
      <p>Wheat → tame Sheep &nbsp; Fish → tame Cat &nbsp; Bone → tame Dog</p>
      <p>Mine tree leaves — chance of finding Apples or Bones</p>
      <p>Hold the Fishing Net and right-click (USE) while aiming at a pond to catch Fish</p>
      <p>Shift + right-click your tamed animal — Capture it into the bag</p>
      <p>Select a captured-animal item and USE on open ground — Release the animal</p>
      <h3>Tips</h3>
      <h3>Crafting</h3>
      <p>Press Z or tap CRAFT to open the crafting panel — merge items to make tools, furniture, ladders, and more</p>
      <p>Tap the ⓘ beside any recipe for full instructions — the exact items needed and where to find each one</p>
      <p>Ladder: place on a wall and walk into it to climb; Space up, Shift down</p>
      <h3>Tips</h3>
      <p>Tap any hotbar or bag item to see its name; look at an animal or block and its name shows up top</p>
      <p>Tap the ⓘ (or press I) on a nameplate for how to tame/use it — plus a real-world fun fact about it</p>
      <p>Info cards rotate through their facts, so look again to learn something new about the same animal or material</p>
      <p>Open a treasure box to auto-collect its loot — the box is used up, not kept</p>
      <p>Open the BAG to browse items by category (Blocks, Tools, Food, Animals, Furniture)</p>
      <p>In multiplayer each player shows up in a unique shirt colour</p>
      <p>Villages appear across the world — explore to find houses, campfires, and friendly villagers</p>
    `
    // Footer repeat of the close affordance: the overlay scrolls, and on a long
    // screen the header button ends up far above the reader.
    const hint = document.createElement('p')
    hint.className = 'mc-instructions-hint'
    hint.textContent = 'Press Esc, click outside this card, or use ✕ Close to get back to the game.'
    box.appendChild(hint)

    // Food and night-mob help depend on which kind of world is loaded, so that
    // stretch of the card is rendered separately (see setWorldKind).
    this.worldHelp = box.querySelector('.mc-help-world') as HTMLDivElement
    this.renderWorldHelp()

    const closeBtn = box.querySelector('.mc-instructions-close')!
    const closeInstructions = (e?: Event) => { e?.preventDefault(); this.closeInstructions() }
    closeBtn.addEventListener('click', closeInstructions)
    closeBtn.addEventListener('touchstart', closeInstructions, { passive: false })
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) this.closeInstructions() })
    overlay.addEventListener('touchstart', (e) => {
      if (e.target === overlay) { e.preventDefault(); this.closeInstructions() }
    }, { passive: false })
    overlay.appendChild(box)
    root.appendChild(overlay)
    this.instructionsOverlay = overlay

    // Nameplate for the animal / block under the crosshair, with an info button.
    this.nameplate = document.createElement('div')
    this.nameplate.className = 'mc-nameplate'
    this.nameplateName = document.createElement('span')
    this.nameplateName.className = 'mc-nameplate-name'
    const infoBtn = document.createElement('button')
    infoBtn.className = 'mc-nameplate-info'
    infoBtn.textContent = 'i'
    infoBtn.title = 'How to tame / use this'
    const openInfo = (e: Event) => { e.preventDefault(); e.stopPropagation(); this.openTargetInfo() }
    infoBtn.addEventListener('click', openInfo)
    infoBtn.addEventListener('touchstart', openInfo, { passive: false })
    this.nameplate.append(this.nameplateName, infoBtn)
    root.appendChild(this.nameplate)

    const infoOverlay = document.createElement('div')
    infoOverlay.className = 'mc-instructions mc-info-overlay'
    this.infoBox = document.createElement('div')
    this.infoBox.className = 'mc-instructions-box mc-info-box'
    infoOverlay.addEventListener('mousedown', (e) => { if (e.target === infoOverlay) this.closeInfo() })
    infoOverlay.addEventListener('touchstart', (e) => {
      if (e.target === infoOverlay) { e.preventDefault(); this.closeInfo() }
    }, { passive: false })
    infoOverlay.appendChild(this.infoBox)
    root.appendChild(infoOverlay)
    this.infoOverlay = infoOverlay

    this.refresh()
  }

  refresh(): void {
    for (let i = 0; i < this.hotbarSlots.length; i++) {
      const el = this.hotbarSlots[i]
      el.classList.toggle('selected', i === this.inventory.selected)
      const slot = this.inventory.slots[i]
      const canvas = el.querySelector('canvas')!
      const count = el.querySelector('.count')!
      if (slot) {
        drawItemIcon(canvas, slot.itemId, this.atlasCanvas)
        count.textContent = String(slot.count)
        el.title = itemDef(slot.itemId)?.name ?? ''
      } else {
        canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
        count.textContent = ''
        el.title = ''
      }
    }
    // Announce the held item by name whenever the selection lands on a
    // different item (click/tap, number key, or scroll).
    const held = this.inventory.slots[this.inventory.selected]
    const key = `${this.inventory.selected}:${held?.itemId ?? 'empty'}`
    if (key !== this.lastHeldKey) {
      this.lastHeldKey = key
      if (held) this.showHeldName(itemDef(held.itemId)?.name ?? '')
      else this.heldName.style.opacity = '0'
    }
  }

  private showHeldName(name: string): void {
    this.heldName.textContent = name
    this.heldName.style.opacity = '1'
    if (this.heldNameTimer) clearTimeout(this.heldNameTimer)
    this.heldNameTimer = setTimeout(() => { this.heldName.style.opacity = '0' }, 1600)
  }

  /**
   * Sleep transition: the screen dims like eyes closing, `onDark` runs while
   * everything is black (jump to morning), then the view fades back in.
   */
  sleepTransition(onDark: () => void): void {
    this.sleepFade.style.display = 'block'
    // Force reflow so the fade-in transition starts from opacity 0.
    void this.sleepFade.offsetWidth
    this.sleepFade.style.opacity = '1'
    setTimeout(() => {
      onDark()
      setTimeout(() => {
        this.sleepFade.style.opacity = '0'
        setTimeout(() => {
          if (this.sleepFade.style.opacity === '0') this.sleepFade.style.display = 'none'
        }, 950)
      }, 500)
    }, 950)
  }

  /** Reflect the player's energy (0–100) in the bar above the hotbar. */
  setEnergy(energy: number): void {
    const v = Math.round(Math.max(0, Math.min(100, energy)))
    if (v === this.lastEnergy) return
    this.lastEnergy = v
    this.energyFill.style.width = `${v}%`
    this.energyFill.classList.toggle('low', v <= 25)
    this.energyLabel.textContent = `⚡ ${v} / 100`
  }

  update(
    dt: number,
    debugText: string,
    miningProgress: number | null,
    phaseInfo?: { phase: 'day' | 'night'; remainingSecs: number; day: number },
  ): void {
    this.debug.textContent = debugText
    if (miningProgress !== null) {
      this.miningBar.style.display = 'block'
      this.miningFill.style.width = `${Math.round(miningProgress * 100)}%`
    } else {
      this.miningBar.style.display = 'none'
    }
    if (phaseInfo) {
      const mins = Math.floor(phaseInfo.remainingSecs / 60)
      const secs = Math.floor(phaseInfo.remainingSecs % 60)
      const icon = phaseInfo.phase === 'day' ? '☀' : '🌙'
      this.dayTimer.textContent = `Day ${phaseInfo.day + 1}  ${icon} ${mins}:${secs.toString().padStart(2, '0')}`
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt
      if (this.toastTimer <= 0) this.toast.style.opacity = '0'
    }
  }

  /** Retune the instructions card for the world that just loaded. */
  setWorldKind(kind: WorldKind): void {
    if (kind === this.worldKind) return
    this.worldKind = kind
    this.renderWorldHelp()
  }

  /** The food and night-mob help, which differ between terrain and robot worlds. */
  private renderWorldHelp(): void {
    const robot = this.worldKind === 'robot'
    this.worldHelp.innerHTML = `
      <h3>Energy, Food &amp; Sleep</h3>
      <p>Mining costs energy (⚡ bar above the hotbar) — at 0 you're too tired to mine</p>
      <p>Eat to refuel: ${
        robot ? 'Canned Food +45' : 'Apple +20'
      } &nbsp; Cooked Fish +40 &nbsp; Fish Stew +80 (USE with the food held)</p>
      ${
        robot
          ? '<p>Canned Food tins stand out on the metal ground — MINE one to open it and pocket the meal</p>'
          : '<p>Cook in the crafting menu: Fish + Wood → Cooked Fish; Cooked Fish + Egg + Apple → Fish Stew</p>'
      }
      <p>Or go home and USE your bed to sleep until morning — restores full energy</p>
      <h3>${robot ? 'Bad Robots' : 'Zombies'} &amp; Swords</h3>
      <p>${
        robot
          ? 'Bad robots power up at night and shut down at dawn — they chase you and their hits drain energy'
          : 'Zombies rise at night and crumble at dawn — they chase you and their hits drain energy'
      }</p>
      <p>Attack them exactly like mining: aim and hold left-click (mobile: hold the red ⛏ button)</p>
      <p>You start with a Sword in your bag — hold it to hit much harder than bare hands</p>
      <p>Defeated ${robot ? 'bad robots' : 'zombies'} drop Gold and sometimes a Diamond</p>
      ${
        robot
          ? `<h3>Robot Village &amp; Sky</h3>
      <p>Villages are home to friendly <b>robot villagers</b> — left-click one to pick it up and carry it, left-click again to set it down</p>
      <p>Every animal here is a machine too: steel-plated, with lit optics and a signal antenna</p>
      <p>Houses are built from alloy panelling and hull plate, with glass windows, metal doors and steel railings</p>
      <p>Look up — <b>saucers</b> circle high overhead, sweeping their beams across the panelling</p>`
          : `<h3>Villagers</h3>
      <p>Left-click a villager to pick it up and carry it around; left-click again to set it back down</p>`
      }
    `
  }

  get isInstructionsOpen(): boolean {
    return this.instructionsOverlay.style.display === 'flex'
  }

  showInstructions(): void {
    if (this.isInstructionsOpen) return
    this.instructionsOverlay.style.display = 'flex'
    // Scrolled-down state from a previous read would hide the close button.
    this.instructionsOverlay.querySelector('.mc-instructions-box')!.scrollTop = 0
    this.onInstructionsOpen()
  }

  closeInstructions(): void {
    if (!this.isInstructionsOpen) return
    this.instructionsOverlay.style.display = 'none'
    this.onInstructionsClose()
  }

  /** Show (or hide, when null) the nameplate for the targeted animal / block. */
  setTarget(name: string | null, info: InfoContent | null): void {
    if (!name) {
      // Keep the nameplate visible while its info card is open.
      if (this.infoOverlay.style.display !== 'flex') {
        this.nameplate.style.display = 'none'
        this.currentInfo = null
      }
      return
    }
    this.currentInfo = info
    this.nameplateName.textContent = name
    this.nameplate.style.display = 'flex'
  }

  get isInfoOpen(): boolean {
    return this.infoOverlay.style.display === 'flex'
  }

  closeInfo(): void {
    if (!this.isInfoOpen) return
    this.infoOverlay.style.display = 'none'
    this.onInfoClose()
  }

  /** Open the info card for whatever the nameplate currently describes. Returns whether it opened. */
  openTargetInfo(): boolean {
    const info = this.currentInfo
    if (!info) return false
    this.infoBox.innerHTML = ''
    const closeBtn = document.createElement('button')
    closeBtn.className = 'mc-instructions-close'
    closeBtn.textContent = '✕ Close'
    const close = (e: Event) => { e.preventDefault(); this.closeInfo() }
    closeBtn.addEventListener('click', close)
    closeBtn.addEventListener('touchstart', close, { passive: false })
    const heading = document.createElement('h3')
    heading.textContent = info.title
    this.infoBox.append(closeBtn, heading)
    for (const line of info.lines) {
      const p = document.createElement('p')
      p.textContent = line
      this.infoBox.appendChild(p)
    }
    // Real-world note, set apart from the how-to-play lines above it.
    if (info.fact) {
      const fact = document.createElement('div')
      fact.className = 'mc-fact'
      const label = document.createElement('b')
      label.textContent = '🔎 Did you know?'
      fact.append(label, document.createTextNode(info.fact))
      this.infoBox.appendChild(fact)
    }
    const hint = document.createElement('p')
    hint.className = 'mc-instructions-hint'
    hint.textContent = 'Press Esc, click outside this card, or use ✕ Close to get back to the game.'
    this.infoBox.appendChild(hint)
    this.infoBox.scrollTop = 0
    this.infoOverlay.style.display = 'flex'
    return true
  }

  showToast(text: string): void {
    this.toast.textContent = text
    this.toast.style.opacity = '1'
    this.toastTimer = 3
  }

  /**
   * Show a brief overview of a chest's contents as an on-screen overlay.
   * Disappears after 3 seconds or as soon as the player clicks it.
   */
  showChestOverview(items: { itemId: number; count: number }[]): void {
    this.chestOverlay.innerHTML = ''
    const title = document.createElement('h4')
    title.textContent = '📦 Chest contents'
    this.chestOverlay.appendChild(title)
    if (items.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'mc-chest-overlay-row'
      empty.textContent = 'Empty'
      this.chestOverlay.appendChild(empty)
    } else {
      for (const item of items.slice(0, 8)) {
        const row = document.createElement('div')
        row.className = 'mc-chest-overlay-row'
        const canvas = document.createElement('canvas')
        canvas.width = 32
        canvas.height = 32
        drawItemIcon(canvas, item.itemId, this.atlasCanvas)
        const label = document.createElement('span')
        label.textContent = `${item.count} × ${itemDef(item.itemId)?.name ?? 'Item'}`
        row.append(canvas, label)
        this.chestOverlay.appendChild(row)
      }
      if (items.length > 8) {
        const more = document.createElement('div')
        more.className = 'mc-chest-overlay-row'
        more.textContent = `…and ${items.length - 8} more`
        this.chestOverlay.appendChild(more)
      }
    }
    const hint = document.createElement('div')
    hint.className = 'mc-chest-overlay-hint'
    hint.textContent = 'Click to dismiss'
    this.chestOverlay.appendChild(hint)

    this.chestOverlay.style.display = 'block'
    // Force reflow so the fade-in transition runs from opacity 0.
    void this.chestOverlay.offsetWidth
    this.chestOverlay.style.opacity = '1'
    if (this.chestOverlayTimer) clearTimeout(this.chestOverlayTimer)
    this.chestOverlayTimer = setTimeout(() => this.hideChestOverview(), 3000)
  }

  hideChestOverview(): void {
    if (this.chestOverlayTimer) {
      clearTimeout(this.chestOverlayTimer)
      this.chestOverlayTimer = null
    }
    this.chestOverlay.style.opacity = '0'
    setTimeout(() => {
      if (this.chestOverlay.style.opacity === '0') this.chestOverlay.style.display = 'none'
    }, 300)
  }

  setPlayerList(names: string[]): void {
    if (names.length === 0) {
      this.playerList.style.display = 'none'
      return
    }
    this.playerList.style.display = ''
    this.playerList.textContent = names.join('\n')
  }

  setChatOpen(open: boolean): void {
    this.chatBtn.classList.toggle('active', open)
  }

  setCraftOpen(open: boolean): void {
    this.craftBtnHud.classList.toggle('active', open)
  }

  setUnderwater(under: boolean): void {
    this.underwaterOverlay.style.opacity = under ? '1' : '0'
  }

  /**
   * Molten tint: a warm rim while any part of the player is touching lava, and
   * a full blaze once their eyes go under.
   */
  setLava(touching: boolean, submerged: boolean): void {
    this.lavaOverlay.style.opacity = submerged ? '1' : touching ? '0.45' : '0'
  }
}
