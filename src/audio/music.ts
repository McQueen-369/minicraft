import musicUrl from './mossy-counterpoint.mp3'

/**
 * Background music: loops a bundled MP3 track. Browsers block audio until a
 * user gesture, so call start() from the first click/tap/keypress.
 */
const VOLUME = 0.4

export class Music {
  private readonly audio: HTMLAudioElement
  private started = false
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

  /** Begin (or resume) playback. Safe to call repeatedly; must come from a user gesture. */
  start(): void {
    this.started = true
    if (this._muted) return
    void this.audio.play().catch(() => {
      // Autoplay was blocked; the next gesture will retry.
      this.started = false
    })
  }

  /** Toggle mute; returns the new muted state. */
  toggle(): boolean {
    this._muted = !this._muted
    if (this._muted) {
      this.audio.pause()
    } else if (this.started) {
      void this.audio.play().catch(() => {})
    }
    return this._muted
  }

  dispose(): void {
    this.audio.pause()
    this.audio.src = ''
    this.started = false
  }
}
