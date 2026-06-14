/**
 * Procedural background music — a calm looping chord progression synthesized
 * with the Web Audio API, so the game ships no audio assets. Browsers block
 * audio until a user gesture, so call start() from the first click/tap/keypress.
 */
const VOLUME = 0.13
const STEP_DUR = 0.26 // seconds per arpeggio step
const STEPS_PER_CHORD = 8

const A4 = 440
function ntof(n: number): number {
  return A4 * Math.pow(2, (n - 69) / 12)
}

// A gentle I–V–vi–IV progression (C major), as MIDI note numbers.
const CHORDS: number[][] = [
  [60, 64, 67, 72], // C
  [55, 59, 62, 67], // G
  [57, 60, 64, 69], // A minor
  [53, 57, 60, 65], // F
]
const BASS = [36, 31, 33, 29]
const ARP = [0, 1, 2, 3, 2, 1, 2, 3]

export class Music {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private timer: number | null = null
  private step = 0
  private nextTime = 0
  private started = false
  private _muted = false

  get muted(): boolean {
    return this._muted
  }

  /** Begin playback. Safe to call repeatedly; must originate from a user gesture. */
  start(): void {
    if (this.started) {
      void this.ctx?.resume()
      return
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    this.started = true
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = this._muted ? 0 : VOLUME
    this.master.connect(this.ctx.destination)
    this.nextTime = this.ctx.currentTime + 0.1
    this.timer = window.setInterval(() => this.schedule(), 25)
  }

  /** Toggle mute; returns the new muted state. */
  toggle(): boolean {
    this._muted = !this._muted
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(this._muted ? 0 : VOLUME, this.ctx.currentTime, 0.04)
    }
    return this._muted
  }

  dispose(): void {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    void this.ctx?.close()
    this.ctx = null
    this.master = null
    this.started = false
  }

  private schedule(): void {
    const ctx = this.ctx
    if (!ctx) return
    while (this.nextTime < ctx.currentTime + 0.2) {
      this.playStep(this.step, this.nextTime)
      this.nextTime += STEP_DUR
      this.step = (this.step + 1) % (CHORDS.length * STEPS_PER_CHORD)
    }
  }

  private playStep(step: number, when: number): void {
    const chordIndex = Math.floor(step / STEPS_PER_CHORD) % CHORDS.length
    const inChord = step % STEPS_PER_CHORD
    const chord = CHORDS[chordIndex]

    // Melodic arpeggio.
    const note = chord[ARP[inChord] % chord.length] + (inChord >= 4 ? 12 : 0)
    this.tone(ntof(note), when, 0.32, 'triangle', 0.5)

    if (inChord === 0) {
      // Bass + soft pad on each chord change.
      this.tone(ntof(BASS[chordIndex]), when, STEP_DUR * STEPS_PER_CHORD * 0.9, 'sine', 0.7)
      this.tone(ntof(chord[0]), when, STEP_DUR * 3, 'sine', 0.22)
      this.tone(ntof(chord[2]), when, STEP_DUR * 3, 'sine', 0.18)
    }
  }

  private tone(freq: number, when: number, dur: number, type: OscillatorType, peak: number): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, when)
    gain.gain.linearRampToValueAtTime(peak, when + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    osc.connect(gain)
    gain.connect(master)
    osc.start(when)
    osc.stop(when + dur + 0.05)
  }
}
