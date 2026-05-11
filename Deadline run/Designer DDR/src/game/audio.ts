let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

export async function loadAudioBuffer(url: string): Promise<AudioBuffer> {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  return getCtx().decodeAudioData(arrayBuffer)
}

export async function loadAudioBufferFromArray(data: ArrayBuffer): Promise<AudioBuffer> {
  return getCtx().decodeAudioData(data)
}

let songSource: AudioBufferSourceNode | null = null

export function playSong(buffer: AudioBuffer, startAtContextTime: number): void {
  stopSong()
  const source = getCtx().createBufferSource()
  source.buffer = buffer
  source.connect(getCtx().destination)
  source.start(startAtContextTime)
  songSource = source
}

export function stopSong(): void {
  try { songSource?.stop() } catch { /* already stopped */ }
  songSource = null
}

export function getAudioCurrentTime(): number {
  return getCtx().currentTime
}

export function getAudioContextTime(): number {
  return getCtx().currentTime
}

/** Returns the AudioContext time that corresponds to Date.now() + delayMs in the future */
export function futureContextTime(delayMs: number): number {
  return getCtx().currentTime + delayMs / 1000
}

/** Resume suspended context (required after user gesture on some browsers) */
export async function resumeAudio(): Promise<void> {
  if (getCtx().state === 'suspended') await getCtx().resume()
}

/** Play synthesised tick preview at BPM — 8 ticks, first tick is accented */
export function playBpmPreview(bpm: number): void {
  const c = getCtx()
  const intervalSec = 60 / bpm
  const now = c.currentTime + 0.05
  for (let i = 0; i < 8; i++) {
    const t = now + i * intervalSec
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.frequency.value = i === 0 ? 880 : 440
    gain.gain.setValueAtTime(0.3, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
    osc.start(t)
    osc.stop(t + 0.08)
  }
}

/** Single tick sound for hit feedback */
export function playTick(isChord = false): void {
  const c = getCtx()
  const t = c.currentTime
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(c.destination)
  osc.frequency.value = isChord ? 880 : 660
  gain.gain.setValueAtTime(0.2, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
  osc.start(t)
  osc.stop(t + 0.07)
}
