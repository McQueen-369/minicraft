import * as THREE from 'three'
import { buildAvatar, disposeAvatar, type RemoteAvatar } from '../net/remotePlayer'
import {
  CLOTH_COLORS,
  EXPRESSION_PRESETS,
  EYE_COLORS,
  EYE_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  MOUTH_STYLES,
  SKIN_TONES,
  loadAppearance,
  saveAppearance,
  type Appearance,
} from '../player/appearance'

const STYLE = `
.mc-char { text-align: left; }
.mc-char-preview { display: flex; justify-content: center; margin: 4px 0 14px; }
.mc-char-preview canvas {
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  background: rgba(255,255,255,0.04);
  border-radius: var(--mc-radius, 16px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.07);
}
.mc-char-row { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
.mc-char-row .label {
  width: 78px; flex-shrink: 0; color: var(--mc-text-faint, #888);
  font-size: var(--mc-fs-2xs, 14px); font-weight: 600;
  letter-spacing: 1px; text-transform: uppercase;
}
.mc-char-row .value { flex: 1; text-align: center; font-size: var(--mc-fs-sm, 16px); color: var(--mc-text, #fff); }
.mc-char-row button.arrow {
  display: inline-block; width: 36px; margin: 0; padding: 7px 0;
  font-size: var(--mc-fs-sm, 16px); flex-shrink: 0;
}
.mc-char-swatches { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
.mc-char button.mc-char-swatch {
  display: inline-block; width: 24px; height: 24px;
  border: 1px solid rgba(255,255,255,0.2);
  cursor: pointer; padding: 0; margin: 0; border-radius: 50%; flex-shrink: 0;
  transition: transform 0.12s var(--mc-ease, ease), box-shadow 0.12s var(--mc-ease, ease);
}
.mc-char button.mc-char-swatch:hover { transform: scale(1.12); }
.mc-char button.mc-char-swatch.sel {
  border-color: #fff;
  box-shadow: 0 0 0 2px var(--mc-accent, #7cd7ff), 0 0 14px rgba(124,215,255,0.5);
}
.mc-char-presets { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 2px; }
.mc-char-presets button {
  display: inline-block; width: auto; flex: 1 1 40%; margin: 0; padding: 8px 6px;
  font-size: var(--mc-fs-xs, 14px);
}
.mc-char-presets button.sel {
  background: var(--mc-good-soft, rgba(99,221,151,0.18));
  border-color: rgba(99,221,151,0.55); color: #d8ffe8;
}
.mc-char-section-label {
  color: var(--mc-text-faint, #888); font-size: var(--mc-fs-2xs, 14px);
  font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase;
  margin: 16px 0 4px;
}
`

const STYLE_LABELS: Record<string, string> = {
  none: 'Bald', short: 'Short', long: 'Long', spiky: 'Spiky', bowl: 'Bowl', ponytail: 'Ponytail', mohawk: 'Mohawk',
  normal: 'Normal', happy: 'Happy', wink: 'Wink', sleepy: 'Sleepy', angry: 'Angry', wide: 'Wide', shades: 'Shades',
  smile: 'Smile', grin: 'Grin', neutral: 'Neutral', sad: 'Sad', open: 'Open', tongue: 'Tongue',
}

let styleInjected = false

/** Character customisation editor: live 3D preview + option pickers.
 *  Persists every change to localStorage immediately. */
export class CharacterEditor {
  private readonly appearance: Appearance
  private readonly root: HTMLDivElement
  private renderer: THREE.WebGLRenderer | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private avatar: RemoteAvatar | null = null
  private raf = 0
  private controlsEl!: HTMLDivElement

  constructor(
    parent: HTMLElement,
    private readonly playerName: string,
    private readonly onBack: () => void,
  ) {
    if (!styleInjected) {
      const style = document.createElement('style')
      style.textContent = STYLE
      document.head.appendChild(style)
      styleInjected = true
    }
    this.appearance = loadAppearance(localStorage)
    this.root = document.createElement('div')
    this.root.className = 'mc-char'
    parent.appendChild(this.root)
    this.buildPreview()
    this.buildControls()
    this.animate()
  }

  private buildPreview(): void {
    const wrap = document.createElement('div')
    wrap.className = 'mc-char-preview'
    this.root.appendChild(wrap)
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true })
      this.renderer.setSize(180, 220)
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      wrap.appendChild(this.renderer.domElement)
      this.scene = new THREE.Scene()
      this.scene.background = new THREE.Color(0x1a2028)
      this.scene.add(new THREE.AmbientLight(0xffffff, 0.75))
      const sun = new THREE.DirectionalLight(0xffffff, 1.6)
      sun.position.set(2, 4, 3)
      this.scene.add(sun)
      this.camera = new THREE.PerspectiveCamera(40, 180 / 220, 0.1, 20)
      this.camera.position.set(0, 1.35, 2.7)
      this.camera.lookAt(0, 1.05, 0)
      this.rebuildAvatar()
    } catch {
      // WebGL unavailable (headless/test): editor still works without preview
      wrap.remove()
    }
  }

  private rebuildAvatar(): void {
    if (!this.scene) return
    const yaw = this.avatar?.group.rotation.y ?? 0.4
    if (this.avatar) {
      this.scene.remove(this.avatar.group)
      disposeAvatar(this.avatar)
    }
    this.avatar = buildAvatar(this.playerName, { ...this.appearance })
    this.avatar.group.rotation.y = yaw
    this.scene.add(this.avatar.group)
  }

  private animate = (): void => {
    if (!this.root.isConnected && this.raf !== 0) {
      // Menu re-rendered over us — release the GL context and stop.
      this.dispose()
      return
    }
    this.raf = requestAnimationFrame(this.animate)
    if (this.renderer && this.scene && this.camera && this.avatar) {
      this.avatar.group.rotation.y += 0.012
      this.renderer.render(this.scene, this.camera)
    }
  }

  private dispose(): void {
    cancelAnimationFrame(this.raf)
    if (this.avatar) disposeAvatar(this.avatar)
    this.renderer?.dispose()
    this.renderer = null
    this.avatar = null
    this.scene = null
  }

  private changed(): void {
    saveAppearance(localStorage, this.appearance)
    this.rebuildAvatar()
    this.renderControls()
  }

  private buildControls(): void {
    this.controlsEl = document.createElement('div')
    this.root.appendChild(this.controlsEl)
    this.renderControls()
    const back = document.createElement('button')
    back.textContent = '✓ Done'
    back.addEventListener('click', () => {
      this.dispose()
      this.onBack()
    })
    this.root.appendChild(back)
  }

  private renderControls(): void {
    const a = this.appearance
    this.controlsEl.innerHTML = ''

    this.sectionLabel('Expression')
    const presets = document.createElement('div')
    presets.className = 'mc-char-presets'
    for (const p of EXPRESSION_PRESETS) {
      const b = document.createElement('button')
      b.textContent = `${p.emoji} ${p.name}`
      if (a.eyes === p.eyes && a.mouth === p.mouth) b.classList.add('sel')
      b.addEventListener('click', () => {
        a.eyes = p.eyes
        a.mouth = p.mouth
        this.changed()
      })
      presets.appendChild(b)
    }
    this.controlsEl.appendChild(presets)

    this.sectionLabel('Fine-tune the face')
    this.cycleRow('Eyes', EYE_STYLES, a.eyes, (v) => { a.eyes = v; this.changed() })
    this.swatchRow('Eye colour', EYE_COLORS, a.eyeColor, (v) => { a.eyeColor = v; this.changed() })
    this.cycleRow('Mouth', MOUTH_STYLES, a.mouth, (v) => { a.mouth = v; this.changed() })
    this.swatchRow('Skin', SKIN_TONES, a.skin, (v) => { a.skin = v; this.changed() })

    this.sectionLabel('Hair')
    this.cycleRow('Style', HAIR_STYLES, a.hair, (v) => { a.hair = v; this.changed() })
    this.swatchRow('Colour', HAIR_COLORS, a.hairColor, (v) => { a.hairColor = v; this.changed() })

    this.sectionLabel('Clothing')
    this.swatchRow('Shirt', CLOTH_COLORS, a.shirt, (v) => { a.shirt = v; this.changed() })
    this.swatchRow('Trousers', CLOTH_COLORS, a.pants, (v) => { a.pants = v; this.changed() })
  }

  private sectionLabel(text: string): void {
    const el = document.createElement('div')
    el.className = 'mc-char-section-label'
    el.textContent = text
    this.controlsEl.appendChild(el)
  }

  private cycleRow<T extends string>(
    label: string,
    options: readonly T[],
    current: T,
    onPick: (value: T) => void,
  ): void {
    const row = document.createElement('div')
    row.className = 'mc-char-row'
    const lab = document.createElement('div')
    lab.className = 'label'
    lab.textContent = label
    const value = document.createElement('div')
    value.className = 'value'
    value.textContent = STYLE_LABELS[current] ?? current
    const idx = options.indexOf(current)
    const arrow = (text: string, delta: number) => {
      const b = document.createElement('button')
      b.className = 'arrow'
      b.textContent = text
      b.addEventListener('click', () => onPick(options[(idx + delta + options.length) % options.length]))
      return b
    }
    row.appendChild(lab)
    row.appendChild(arrow('◀', -1))
    row.appendChild(value)
    row.appendChild(arrow('▶', 1))
    this.controlsEl.appendChild(row)
  }

  private swatchRow(
    label: string,
    colors: readonly string[],
    current: string,
    onPick: (value: string) => void,
  ): void {
    const row = document.createElement('div')
    row.className = 'mc-char-row'
    const lab = document.createElement('div')
    lab.className = 'label'
    lab.textContent = label
    row.appendChild(lab)
    const swatches = document.createElement('div')
    swatches.className = 'mc-char-swatches'
    for (const c of colors) {
      const b = document.createElement('button')
      b.className = 'mc-char-swatch' + (c === current ? ' sel' : '')
      b.style.background = c
      b.title = c
      b.addEventListener('click', () => onPick(c))
      swatches.appendChild(b)
    }
    row.appendChild(swatches)
    this.controlsEl.appendChild(row)
  }
}
