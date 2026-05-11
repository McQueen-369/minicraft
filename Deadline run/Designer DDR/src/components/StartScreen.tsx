import { useState, useEffect, useRef } from 'react'

interface Props {
  onSinglePlayer: (name: string) => void
  onMultiplayer: (name: string) => void
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20, background: '#f5f0e8' },
  title: { fontSize: 36, fontWeight: 900, letterSpacing: 6, textTransform: 'uppercase' as const },
  sub: { fontSize: 12, color: '#696255', letterSpacing: 1 },
  input: { width: 240, padding: '8px 12px', border: '1.5px solid #0a0a0a', borderRadius: 3, background: '#f5f0e8', fontSize: 14, fontWeight: 700, outline: 'none', fontFamily: 'inherit', color: '#0a0a0a' },
  btnPrimary: { width: 240, padding: '10px 0', border: '1.5px solid #0a0a0a', borderRadius: 3, background: '#0a0a0a', color: '#f5f0e8', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, cursor: 'pointer' },
  btnOutline: { width: 240, padding: '10px 0', border: '1.5px solid #0a0a0a', borderRadius: 3, background: '#f5f0e8', color: '#0a0a0a', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, cursor: 'pointer' },
  attribution: { fontSize: 9, color: '#696255', textAlign: 'center' as const, maxWidth: 280, lineHeight: 1.6 },
}

export function StartScreen({ onSinglePlayer, onMultiplayer }: Props) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('deadline-dash-name')
    if (saved) setName(saved)
    inputRef.current?.focus()
  }, [])

  function saveName(n: string) {
    localStorage.setItem('deadline-dash-name', n)
  }

  const trimmed = name.trim()
  const disabled = !trimmed

  return (
    <div style={S.page}>
      <svg width="60" height="80" viewBox="0 0 60 80" fill="none" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="30" cy="12" r="9" />
        <line x1="30" y1="21" x2="30" y2="50" />
        <line x1="30" y1="30" x2="12" y2="42" />
        <line x1="30" y1="30" x2="48" y2="42" />
        <line x1="30" y1="50" x2="16" y2="70" />
        <line x1="30" y1="50" x2="44" y2="70" />
      </svg>
      <div style={S.title}>DEADLINE DASH</div>
      <div style={S.sub}>A rhythm game for those past due</div>
      <input
        ref={inputRef}
        style={S.input}
        placeholder="Your name"
        value={name}
        maxLength={20}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && (saveName(trimmed), onSinglePlayer(trimmed))}
      />
      <button style={{ ...S.btnPrimary, opacity: disabled ? 0.4 : 1 }} disabled={disabled}
        onClick={() => { saveName(trimmed); onSinglePlayer(trimmed) }}>
        Single Player
      </button>
      <button style={{ ...S.btnOutline, opacity: disabled ? 0.4 : 1 }} disabled={disabled}
        onClick={() => { saveName(trimmed); onMultiplayer(trimmed) }}>
        Multiple Players
      </button>
      <div style={S.attribution}>
        Music by Kevin MacLeod (incompetech.com) — Licensed under CC BY 4.0
      </div>
    </div>
  )
}
