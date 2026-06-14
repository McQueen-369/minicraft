import musicUrl from './mossy-counterpoint.mp3'

/**
 * Background music: loops a bundled MP3 track. Browsers block audio until a
 * user gesture, so call start() from the first click/tap/keypress. Playback is
 * gated on `active` so the track only sounds while the game is actually being
 * played (not on the menu or while paused).
 */
const VOLUME = 0.4

export class Music {
  private readonly audio: HTMLAudioElement
  private started = false
  private active = false
  private _muted = false

  constructor() {
    this.audio = new Audio(musicUrl)
    this.audio.loop = true
    this.audio.preload = 'auto'
    this.audio.volume = VOLUME
  }

  get muted(): boolean {
    return this._muted
  }

  /** Unlock audio from a user gesture. Safe to call repeatedly. */
  start(): void {
    this.started = true
    this.sync()
  }

  /** Mark the game as actively being played (vs. menu / paused). */
  setActive(active: boolean): void {
    if (this.active === active) return
    this.active = active
    this.sync()
  }

  /** Toggle mute; returns the new muted state. */
  toggle(): boolean {
    this._muted = !this._muted
    this.sync()
    return this._muted
  }

  /** Play when unlocked, active, and not muted; pause otherwise. */
  private sync(): void {
    if (this.started && this.active && !this._muted) {
      void this.audio.play().catch(() => {
        // Autoplay was blocked; the next gesture will retry.
        this.started = false
      })
    } else {
      this.audio.pause()
    }
  }

  dispose(): void {
    this.audio.pause()
    this.audio.src = ''
    this.started = false
    this.active = false
  }
}
