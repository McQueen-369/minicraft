import * as THREE from 'three'
import { FLY_SPEED, PLAYER_EYE, WALK_SPEED, WATER_LEVEL } from '../constants'
import { isSolid } from '../core/blocks'
import type { World } from '../world/world'
import type { Controls } from './controls'
import { stepPhysics, type PhysicsState } from './physics'

export class Player {
  readonly state: PhysicsState = {
    pos: { x: 0.5, y: 60, z: 0.5 },
    vel: { x: 0, y: 0, z: 0 },
    onGround: false,
  }

  constructor(private readonly world: World) {}

  spawnAt(x: number, z: number): void {
    const h = this.world.terrain.heightAt(Math.floor(x), Math.floor(z))
    this.state.pos = { x, y: h + 1.01, z }
    this.state.vel = { x: 0, y: 0, z: 0 }
  }

  update(dt: number, controls: Controls): void {
    const dir = controls.moveDirection()
    const speed = controls.fly ? FLY_SPEED : WALK_SPEED
    const gameplay = controls.gameplayInput && controls.isLocked
    let flyMoveY = 0
    if (gameplay && controls.fly) {
      if (controls.keys.has('Space')) flyMoveY += FLY_SPEED
      if (controls.keys.has('ShiftLeft') || controls.keys.has('ShiftRight')) flyMoveY -= FLY_SPEED
    }
    stepPhysics(
      this.state,
      {
        moveX: dir.x * speed,
        moveZ: dir.z * speed,
        jump: gameplay && controls.keys.has('Space'),
        fly: controls.fly,
        flyMoveY,
        swim: !controls.fly && this.state.pos.y < WATER_LEVEL,
      },
      dt,
      (x, y, z) => isSolid(this.world.getBlock(x, y, z)),
    )
    // Fell out of the world: respawn at the same column.
    if (this.state.pos.y < -20) this.spawnAt(this.state.pos.x, this.state.pos.z)
  }

  applyCamera(camera: THREE.PerspectiveCamera, controls: Controls): void {
    camera.rotation.order = 'YXZ'
    camera.rotation.y = controls.yaw
    camera.rotation.x = controls.pitch
    camera.position.set(this.state.pos.x, this.state.pos.y + PLAYER_EYE, this.state.pos.z)
  }

  get eyePosition(): THREE.Vector3 {
    return new THREE.Vector3(this.state.pos.x, this.state.pos.y + PLAYER_EYE, this.state.pos.z)
  }
}
