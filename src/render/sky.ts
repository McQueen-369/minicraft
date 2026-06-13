import * as THREE from 'three'
import { DAY_LENGTH_SECONDS } from '../constants'

const DAY = new THREE.Color(0x87ceeb)
const SUNSET = new THREE.Color(0xf4a261)
const NIGHT = new THREE.Color(0x0b1026)

export class Sky {
  private readonly sun: THREE.DirectionalLight
  private readonly ambient: THREE.AmbientLight
  private readonly skyColor = new THREE.Color()
  /** 0..1 through the day; 0 = sunrise, 0.5 = sunset. */
  time = 0.25

  constructor(private readonly scene: THREE.Scene) {
    this.sun = new THREE.DirectionalLight(0xffffff, 1)
    this.ambient = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(this.sun, this.ambient)
    scene.fog = new THREE.Fog(DAY.getHex(), 60, 110)
  }

  update(dt: number, center: THREE.Vector3): void {
    this.time = (this.time + dt / DAY_LENGTH_SECONDS) % 1
    const angle = this.time * Math.PI * 2
    // Sun travels a vertical circle; elevation in [-1, 1].
    const elevation = Math.sin(angle)
    this.sun.position.set(center.x + Math.cos(angle) * 100, center.y + elevation * 100, center.z + 30)
    this.sun.target.position.copy(center)
    this.sun.target.updateMatrixWorld()

    const daylight = THREE.MathUtils.clamp(elevation * 3 + 0.3, 0, 1)
    const sunsetness = THREE.MathUtils.clamp(1 - Math.abs(elevation) * 4, 0, 1) * daylight
    this.sun.intensity = 0.2 + daylight * 1.1
    this.ambient.intensity = 0.25 + daylight * 0.45

    this.skyColor.copy(NIGHT).lerp(DAY, daylight).lerp(SUNSET, sunsetness * 0.6)
    this.scene.background = this.skyColor
    const fog = this.scene.fog as THREE.Fog
    fog.color.copy(this.skyColor)
  }
}
