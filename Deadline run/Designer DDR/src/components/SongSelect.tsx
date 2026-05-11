import { useState, useRef } from 'react'
import { BUNDLED_SONGS } from '../game/constants'
import { playBpmPreview } from '../game/audio'
import { detectBpm } from '../game/beatmap'

const BPM_PRESETS = [
  { label: 'CHILL', bpm: 90 },
  { label: 'NORMAL', bpm: 120 },
  { label: 'RUSH', bpm: 150 },
  { label: 'CHAOS', bpm: 174 },
]

interface UploadedSong {
  id: string
  title: string
  bpm: number
  arrayBuffer: ArrayBuffer
}

interface Props {
  onSelect: (songId: string, uploadedBpm?: number, uploadedBuffer?: ArrayBuffer) => void
  onBack: () => void
}

export function SongSelect({ onSelect, onBack }: Props) {
  const [selected, setSelected] = useState<string>(BUNDLED_SONGS[0].id)
  const [uploaded, setUploaded] = useState<UploadedSong | null>(null)
  const [detecting, setDetecting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setDetecting(true)
    const buffer = await file.arrayBuffer()
    const audioCtx = new AudioContext()
    const decoded = await audioCtx.decodeAudioData(buffer.slice(0))
    const bpm = await detectBpm(decoded)
    await audioCtx.close()
    const song: UploadedSong = {
      id: `upload-${Date.now()}`,
      title: file.name.replace(/\.[^.]+$/, ''),
      bpm,
      arrayBuffer: buffer,
    }
    setUploaded(song)
    setSelected(song.id)
    setDetecting(false)
  }

  function handlePreview() {
    const bpm = uploaded && selected === uploaded.id
      ? uploaded.bpm
      : (BUNDLED_SONGS.find((s) => s.id === selected)?.bpm ?? 120)
    playBpmPreview(bpm)
  }

  const currentSong = BUNDLED_SONGS.find((s) => s.id === selected)
  const isUpload = uploaded && selected === uploaded.id

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', padding: '28px 20px' }}>
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16, color: '#696255' }}>← Back</button>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 20 }}>Select Song</div>

        {BUNDLED_SONGS.map((song) => (
          <div key={song.id} onClick={() => setSelected(song.id)} style={{
            padding: '10px 14px', marginBottom: 8,
            border: '1.5px solid #0a0a0a', borderRadius: 4, cursor: 'pointer',
            background: selected === song.id ? '#0a0a0a' : '#f5f0e8',
            color: selected === song.id ? '#f5f0e8' : '#0a0a0a',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{song.title}</div>
              <div style={{ fontSize: 9, letterSpacing: 1, opacity: 0.7 }}>{song.difficulty}</div>
            </div>
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{song.bpm} BPM · {song.genre} · {song.duration}</div>
          </div>
        ))}

        {/* Upload slot */}
        <div
          onClick={() => { if (!detecting) fileRef.current?.click() }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          style={{
            padding: 14, marginTop: 8,
            border: '1.5px dashed #0a0a0a', borderRadius: 4, cursor: 'pointer', textAlign: 'center',
            background: isUpload ? '#0a0a0a' : 'transparent',
            color: isUpload ? '#f5f0e8' : '#0a0a0a',
          }}
        >
          {detecting
            ? <span style={{ fontSize: 11, letterSpacing: 1 }}>Detecting BPM…</span>
            : uploaded
              ? <div onClick={(e) => { e.stopPropagation(); setSelected(uploaded.id) }}>
                  <div style={{ fontWeight: 700 }}>{uploaded.title}</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>Detected: {uploaded.bpm} BPM</div>
                </div>
              : <span style={{ fontSize: 11, letterSpacing: 1 }}>Drop your own MP3 / OGG / WAV</span>
          }
        </div>
        <input ref={fileRef} type="file" accept=".mp3,.ogg,.wav" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

        {/* BPM override for uploaded tracks */}
        {isUpload && uploaded && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {BPM_PRESETS.map((p) => (
              <button key={p.label} onClick={() => setUploaded({ ...uploaded, bpm: p.bpm })} style={{
                flex: 1, padding: '5px 0',
                border: '1.5px solid #0a0a0a', borderRadius: 3,
                background: uploaded.bpm === p.bpm ? '#0a0a0a' : '#f5f0e8',
                color: uploaded.bpm === p.bpm ? '#f5f0e8' : '#0a0a0a',
                fontSize: 9, fontWeight: 700, letterSpacing: 1, cursor: 'pointer',
              }}>{p.label}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={handlePreview} style={{
            flex: 1, padding: '10px 0',
            border: '1.5px solid #0a0a0a', borderRadius: 3, background: '#f5f0e8', color: '#0a0a0a',
            fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: 'pointer',
          }}>▶ PREVIEW BEAT</button>
          <button
            onClick={() => isUpload && uploaded
              ? onSelect(selected, uploaded.bpm, uploaded.arrayBuffer)
              : onSelect(selected)
            }
            style={{
              flex: 2, padding: '10px 0',
              background: '#0a0a0a', color: '#f5f0e8', border: 'none', borderRadius: 3,
              fontSize: 11, fontWeight: 700, letterSpacing: 2, cursor: 'pointer',
            }}
          >PLAY →</button>
        </div>

        {currentSong && !isUpload && (
          <div style={{ fontSize: 9, color: '#696255', textAlign: 'center', marginTop: 12 }}>
            Music by Kevin MacLeod (incompetech.com) — CC BY 4.0
          </div>
        )}
      </div>
    </div>
  )
}
