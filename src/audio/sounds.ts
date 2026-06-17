import type { AnimalKind } from '../items/items'

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function tone(
  type: OscillatorType,
  freq: number,
  endFreq: number,
  duration: number,
  volume: number,
  startTime: number,
): void {
  const ac = getCtx()
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ac.currentTime + startTime)
  osc.frequency.linearRampToValueAtTime(endFreq, ac.currentTime + startTime + duration)
  gain.gain.setValueAtTime(0, ac.currentTime + startTime)
  gain.gain.linearRampToValueAtTime(volume, ac.currentTime + startTime + 0.01)
  gain.gain.setValueAtTime(volume, ac.currentTime + startTime + duration - 0.05)
  gain.gain.linearRampToValueAtTime(0, ac.currentTime + startTime + duration)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(ac.currentTime + startTime)
  osc.stop(ac.currentTime + startTime + duration)
}

function click(freq: number, startTime: number): void {
  const ac = getCtx()
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(freq, ac.currentTime + startTime)
  gain.gain.setValueAtTime(0.15, ac.currentTime + startTime)
  gain.gain.linearRampToValueAtTime(0, ac.currentTime + startTime + 0.04)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(ac.currentTime + startTime)
  osc.stop(ac.currentTime + startTime + 0.04)
}

export function playAnimalSound(kind: AnimalKind): void {
  try {
    switch (kind) {
      case 'sheep':
        // Baa: warm sine with gentle pitch droop
        tone('sine', 380, 300, 0.35, 0.18, 0)
        tone('sine', 380, 300, 0.25, 0.1, 0.4)
        break
      case 'pig':
        // Oink: two short square-wave bursts
        tone('square', 160, 120, 0.12, 0.12, 0)
        tone('square', 150, 110, 0.1, 0.1, 0.18)
        break
      case 'chicken':
        // Cluck: rapid high clicks
        click(900, 0)
        click(1100, 0.07)
        click(800, 0.14)
        break
      case 'rabbit':
        // Soft high squeak
        tone('sine', 900, 700, 0.1, 0.1, 0)
        tone('sine', 850, 650, 0.08, 0.07, 0.15)
        break
      case 'cat':
        // Meow: sawtooth sliding down
        tone('sawtooth', 450, 260, 0.4, 0.1, 0)
        break
      case 'dog':
        // Woof: deep sine burst
        tone('sine', 220, 180, 0.15, 0.2, 0)
        tone('sine', 200, 160, 0.12, 0.15, 0.22)
        break
      default:
        break
    }
  } catch {
    // AudioContext unavailable
  }
}
