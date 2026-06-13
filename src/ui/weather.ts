import type { WeatherType } from '../render/sky'

const DROP_COUNT = 60

const STYLE = `
.mc-weather-rain {
  position: absolute; inset: 0; pointer-events: none; z-index: 2;
  overflow: hidden; display: none;
}
.mc-rain-drop {
  position: absolute;
  width: 1px;
  background: linear-gradient(to bottom, transparent, rgba(140,185,220,0.7));
  animation: mc-rain-fall linear infinite;
}
@keyframes mc-rain-fall {
  from { transform: translateY(-40px) skewX(-5deg); }
  to   { transform: translateY(110vh)  skewX(-5deg); }
}
.mc-weather-rainbow {
  position: absolute; top: 0; left: 0; right: 0;
  height: 65vh; pointer-events: none; z-index: 2;
  overflow: hidden; display: none;
}
.mc-weather-rainbow::after {
  content: '';
  position: absolute;
  left: 50%; top: 100%;
  transform: translate(-50%, -50%);
  width: 130vw; height: 130vw;
  border-radius: 50%;
  box-shadow:
    0 0 0 4px  rgba(148,0,211,0.28),
    0 0 0 10px rgba(75,0,130,0.20),
    0 0 0 18px rgba(0,0,255,0.25),
    0 0 0 26px rgba(0,128,0,0.28),
    0 0 0 34px rgba(255,255,0,0.28),
    0 0 0 42px rgba(255,165,0,0.28),
    0 0 0 50px rgba(255,0,0,0.25);
}
`

export class WeatherUI {
  private readonly rainEl: HTMLDivElement
  private readonly rainbowEl: HTMLDivElement
  private current: WeatherType = 'clear'

  constructor(root: HTMLElement) {
    const style = document.createElement('style')
    style.textContent = STYLE
    document.head.appendChild(style)

    this.rainEl = document.createElement('div')
    this.rainEl.className = 'mc-weather-rain'

    for (let i = 0; i < DROP_COUNT; i++) {
      const drop = document.createElement('div')
      drop.className = 'mc-rain-drop'
      const left = Math.random() * 110 - 5
      const height = 20 + Math.random() * 25
      const duration = 0.35 + Math.random() * 0.3
      const delay = -(Math.random() * duration * 4)
      const opacity = 0.4 + Math.random() * 0.4
      drop.style.cssText = `
        left: ${left}%; height: ${height}px;
        animation-duration: ${duration.toFixed(2)}s;
        animation-delay: ${delay.toFixed(2)}s;
        opacity: ${opacity.toFixed(2)};
      `
      this.rainEl.appendChild(drop)
    }

    this.rainbowEl = document.createElement('div')
    this.rainbowEl.className = 'mc-weather-rainbow'

    root.appendChild(this.rainEl)
    root.appendChild(this.rainbowEl)
  }

  update(weather: WeatherType): void {
    if (weather === this.current) return
    this.current = weather
    this.rainEl.style.display = weather === 'rain' ? '' : 'none'
    this.rainbowEl.style.display = weather === 'rainbow' ? '' : 'none'
  }

  show(): void {
    this.rainEl.style.display = this.current === 'rain' ? '' : 'none'
    this.rainbowEl.style.display = this.current === 'rainbow' ? '' : 'none'
  }

  hide(): void {
    this.rainEl.style.display = 'none'
    this.rainbowEl.style.display = 'none'
  }
}
