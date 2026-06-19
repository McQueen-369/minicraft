import * as THREE from 'three'

const DAY = new THREE.Color(0x87ceeb)
const SUNSET = new THREE.Color(0xf4a261)
const NIGHT = new THREE.Color(0x0b1026)

/** Seconds the sun is above the horizon (time 0..0.5 of cycle). */
const DAY_DURATION = 1800
/** Seconds the sun is below the horizon (time 0.5..1 of cycle). */
const NIGHT_DURATION = 1200

const STAR_COUNT = 1800

/** Clouds drift on a high horizontal layer, well above any terrain or builds. */
const CLOUD_COUNT = 16
const CLOUD_ALTITUDE = 150
const CLOUD_RADIUS = 240

interface Cloud {
  group: THREE.Group
  material: THREE.MeshLambertMaterial
  ox: number
  oz: number
  speed: number
}

/**
 * A handful of blocky white clouds spread over a high disc that follows the
 * camera, so the sky always looks populated without the puffs ever dipping
 * into the world below.
 */
function buildClouds(): Cloud[] {
  const clouds: Cloud[] = []
  const puff = new THREE.BoxGeometry(1, 1, 1)
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    })
    const group = new THREE.Group()
    const blocks = 3 + Math.floor(Math.random() * 4)
    for (let b = 0; b < blocks; b++) {
      const mesh = new THREE.Mesh(puff, material)
      const w = 8 + Math.random() * 14
      mesh.scale.set(w, 3 + Math.random() * 3, 7 + Math.random() * 10)
      mesh.position.set((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 16)
      group.add(mesh)
    }
    // Spread clouds across the disc, biased away from the very centre.
    const ang = Math.random() * Math.PI * 2
    const rad = CLOUD_RADIUS * (0.25 + Math.random() * 0.75)
    clouds.push({
      group,
      material,
      ox: Math.cos(ang) * rad,
      oz: Math.sin(ang) * rad,
      speed: 2.5 + Math.random() * 3.5,
    })
  }
  return clouds
}

function buildStarField(): THREE.Points {
  const pos = new Float32Array(STAR_COUNT * 3)
  for (let i = 0; i < STAR_COUNT; i++) {
    // Uniform random points on the UPPER hemisphere only (y >= 0) — prevents
    // stars showing underground or below the horizon when flying.
    const u = Math.random()          // [0, 1] → upper half
    const theta = Math.random() * Math.PI * 2
    const r = Math.sqrt(1 - u * u)
    pos[i * 3] = r * Math.cos(theta) * 190
    pos[i * 3 + 1] = u * 190
    pos[i * 3 + 2] = r * Math.sin(theta) * 190
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const mat = new THREE.PointsMaterial({
    color: 0xddeeff,
    size: 0.7,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    fog: false,
    depthTest: true,   // terrain occludes stars naturally
    depthWrite: false,
  })
  return new THREE.Points(geo, mat)
}

export class Sky {
  private readonly sun: THREE.DirectionalLight
  private readonly ambient: THREE.AmbientLight
  private readonly moonLight: THREE.DirectionalLight
  private readonly stars: THREE.Points
  private readonly moon: THREE.Mesh
  private readonly moonGlow: THREE.Mesh
  private readonly sunDisc: THREE.Mesh
  private readonly sunGlow: THREE.Mesh
  private readonly clouds: Cloud[]
  private readonly skyColor = new THREE.Color()
  /** 0..1 through the day; 0 = sunrise, 0.5 = sunset. */
  time = 0.25

  constructor(private readonly scene: THREE.Scene) {
    this.sun = new THREE.DirectionalLight(0xffffff, 1)
    this.ambient = new THREE.AmbientLight(0xffffff, 0.5)

    this.moonLight = new THREE.DirectionalLight(0x8899cc, 0)

    this.stars = buildStarField()

    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xf2edd8,
      fog: false,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      opacity: 0,
    })
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(4.5, 14, 14), moonMat)

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xbbc8e8,
      fog: false,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      opacity: 0,
    })
    this.moonGlow = new THREE.Mesh(new THREE.SphereGeometry(7.5, 14, 14), glowMat)

    // Visible daytime sun disc with a soft halo (mirrors the moon setup).
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfff2c0,
      fog: false,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      opacity: 0,
    })
    this.sunDisc = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 16), sunMat)
    const sunGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffe39a,
      fog: false,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      opacity: 0,
    })
    this.sunGlow = new THREE.Mesh(new THREE.SphereGeometry(12, 16, 16), sunGlowMat)

    this.clouds = buildClouds()

    scene.add(this.sun, this.ambient, this.moonLight, this.stars, this.moonGlow, this.moon, this.sunGlow, this.sunDisc)
    for (const c of this.clouds) scene.add(c.group)
    scene.fog = new THREE.Fog(DAY.getHex(), 60, 110)
  }

  get phaseInfo(): { phase: 'day' | 'night'; remainingSecs: number } {
    if (this.time < 0.5) {
      return { phase: 'day', remainingSecs: (1 - this.time / 0.5) * DAY_DURATION }
    }
    return { phase: 'night', remainingSecs: (1 - (this.time - 0.5) / 0.5) * NIGHT_DURATION }
  }

  update(dt: number, center: THREE.Vector3): void {
    const rate = this.time < 0.5 ? 0.5 / DAY_DURATION : 0.5 / NIGHT_DURATION
    this.time = (this.time + dt * rate) % 1
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

    // Sun disc: sits in the sun's direction, fades out around dusk/dawn.
    const sunDir = new THREE.Vector3(Math.cos(angle), elevation, 0.3).normalize()
    this.sunDisc.position.copy(center).addScaledVector(sunDir, 185)
    this.sunGlow.position.copy(this.sunDisc.position)
    const sunVisible = elevation > -0.08
    this.sunDisc.visible = sunVisible
    this.sunGlow.visible = sunVisible
    if (sunVisible) {
      const sunAlpha = THREE.MathUtils.clamp(elevation * 6, 0, 1)
      ;(this.sunDisc.material as THREE.MeshBasicMaterial).opacity = sunAlpha
      ;(this.sunGlow.material as THREE.MeshBasicMaterial).opacity = sunAlpha * 0.35
    }

    // Clouds: drift along the high layer, recentred on the camera so the sky is
    // always populated, and fade away at night.
    const cloudAlpha = THREE.MathUtils.clamp(daylight * 1.1, 0, 1) * 0.9
    for (const c of this.clouds) {
      c.ox += c.speed * dt
      if (c.ox > CLOUD_RADIUS) c.ox -= CLOUD_RADIUS * 2
      c.group.position.set(center.x + c.ox, CLOUD_ALTITUDE, center.z + c.oz)
      c.group.visible = cloudAlpha > 0.02
      c.material.opacity = cloudAlpha
    }

    // Moon sits diametrically opposite the sun.
    const moonAngle = angle + Math.PI
    const moonElev = Math.sin(moonAngle) // = -elevation
    const moonX = center.x + Math.cos(moonAngle) * 150
    const moonY = center.y + moonElev * 150
    const moonZ = center.z + 30

    // Night factor: 1 at full night, 0 at full day.
    const nightFactor = 1 - daylight
    const moonVisible = moonElev > -0.05 && nightFactor > 0.01

    this.moon.position.set(moonX, moonY, moonZ)
    this.moonGlow.position.set(moonX, moonY, moonZ)
    this.moon.visible = moonVisible
    this.moonGlow.visible = moonVisible
    if (moonVisible) {
      const moonAlpha = THREE.MathUtils.clamp(moonElev * 5, 0, 1) * nightFactor
      ;(this.moon.material as THREE.MeshBasicMaterial).opacity = moonAlpha
      ;(this.moonGlow.material as THREE.MeshBasicMaterial).opacity = moonAlpha * 0.18
      this.moonLight.position.set(moonX, moonY, moonZ)
      this.moonLight.target.position.copy(center)
      this.moonLight.target.updateMatrixWorld()
      this.moonLight.intensity = moonAlpha * 0.3
    } else {
      this.moonLight.intensity = 0
    }

    // Stars follow the camera and fade with daylight.
    this.stars.position.copy(center)
    ;(this.stars.material as THREE.PointsMaterial).opacity = nightFactor

    this.skyColor.copy(NIGHT).lerp(DAY, daylight).lerp(SUNSET, sunsetness * 0.6)
    this.scene.background = this.skyColor
    const fog = this.scene.fog as THREE.Fog
    fog.color.copy(this.skyColor)
  }
}
