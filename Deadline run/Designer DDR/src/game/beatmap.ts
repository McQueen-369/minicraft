import type { BeatMap, BeatMapNote } from './types'
import { BPM_MAX, BPM_RAMP_INTERVAL_CYCLES, BPM_RAMP_STEP } from './constants'

export async function loadBeatMap(id: string): Promise<BeatMap> {
  const response = await fetch(`/songs/${id}.json`)
  if (!response.ok) throw new Error(`Beat map not found: ${id}`)
  return response.json() as Promise<BeatMap>
}

const COMMON_BPMS = [60, 70, 80, 90, 100, 110, 120, 128, 130, 140, 150, 160, 170, 174, 180]

export function snapBpm(raw: number): number {
  const clamped = Math.max(60, Math.min(BPM_MAX, raw))
  let closest = COMMON_BPMS[0]
  let minDist = Math.abs(clamped - closest)
  for (const bpm of COMMON_BPMS) {
    const dist = Math.abs(clamped - bpm)
    if (dist < minDist) { minDist = dist; closest = bpm }
  }
  return minDist <= 5 ? closest : clamped
}

/** Detect BPM from AudioBuffer using energy-peak onset analysis */
export async function detectBpm(buffer: AudioBuffer): Promise<number> {
  const sampleRate = buffer.sampleRate
  const data = buffer.getChannelData(0)
  const windowSize = Math.floor(sampleRate * 0.01) // 10ms windows
  const energies: number[] = []

  for (let i = 0; i + windowSize < data.length; i += windowSize) {
    let energy = 0
    for (let j = 0; j < windowSize; j++) energy += data[i + j] ** 2
    energies.push(energy / windowSize)
  }

  const mean = energies.reduce((s, e) => s + e, 0) / energies.length
  const threshold = mean * 1.5
  const onsetFrames: number[] = []
  let lastOnset = -20

  for (let i = 1; i < energies.length; i++) {
    if (energies[i] > threshold && energies[i] > energies[i - 1] && i - lastOnset > 5) {
      onsetFrames.push(i)
      lastOnset = i
    }
  }

  if (onsetFrames.length < 4) return 120

  const intervals: number[] = []
  for (let i = 1; i < Math.min(onsetFrames.length, 32); i++) {
    intervals.push((onsetFrames[i] - onsetFrames[i - 1]) * 0.01)
  }
  const sorted = [...intervals].sort((a, b) => a - b)
  const medianInterval = sorted[Math.floor(sorted.length / 2)]
  let bpm = 60 / medianInterval

  if (bpm < 60) bpm = bpm * 2
  if (bpm > 180) bpm = bpm / 2

  return snapBpm(Math.round(bpm))
}

/** Generate an algorithmic beat pattern for uploaded tracks */
export function generatePattern(bpm: number, durationSec: number): BeatMapNote[] {
  const notes: BeatMapNote[] = []
  let currentBpm = bpm
  let beatInterval = 60 / currentBpm
  let cycle = 0
  let t = beatInterval

  while (t < durationSec - 1) {
    const isChord = cycle % 8 === 4 && currentBpm >= 100
    const lanePool = [0, 1, 2, 3]
    const lanes: number[] = []

    if (isChord) {
      const idx1 = Math.floor(Math.random() * lanePool.length)
      lanes.push(lanePool.splice(idx1, 1)[0])
      const idx2 = Math.floor(Math.random() * lanePool.length)
      lanes.push(lanePool.splice(idx2, 1)[0])
    } else {
      const idx = Math.floor(Math.random() * lanePool.length)
      lanes.push(lanePool[idx])
    }

    notes.push({ time: Math.round(t * 1000) / 1000, lanes })
    cycle++
    t += beatInterval

    if (cycle % (4 * BPM_RAMP_INTERVAL_CYCLES) === 0 && currentBpm < BPM_MAX) {
      currentBpm = Math.min(BPM_MAX, currentBpm + BPM_RAMP_STEP)
      beatInterval = 60 / currentBpm
    }
  }

  return notes
}

/** Create a BeatMap for an uploaded track */
export function createUploadedBeatMap(
  title: string,
  buffer: AudioBuffer,
  detectedBpm: number,
): BeatMap {
  return {
    id: `upload-${Date.now()}`,
    title,
    artist: 'Uploaded',
    bpm: detectedBpm,
    offset: 0,
    audioFile: '',
    notes: generatePattern(detectedBpm, buffer.duration),
  }
}
