import { LANE_GLYPHS } from '../game/constants'

interface Props {
  onHit: (lane: number) => void
  canvasWidth: number
}

export function MobileControls({ onHit, canvasWidth }: Props) {
  return (
    <div style={{
      display: 'flex',
      width: canvasWidth,
      border: '1.5px solid #0a0a0a',
    }}>
      {LANE_GLYPHS.map((glyph, i) => (
        <button
          key={i}
          onPointerDown={(e) => { e.preventDefault(); onHit(i) }}
          style={{
            flex: 1,
            height: 64,
            border: 'none',
            borderRight: i < 3 ? '1.5px solid #0a0a0a' : 'none',
            background: '#f5f0e8',
            color: '#0a0a0a',
            fontSize: 24,
            fontWeight: 700,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
          }}
        >
          {glyph}
        </button>
      ))}
    </div>
  )
}
