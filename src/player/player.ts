import * as THREE from 'three'
import { FLY_SPEED, PLAYER_EYE, PLAYER_HEIGHT, PLAYER_WIDTH, WALK_SPEED, WATER_LEVEL } from '../constants'
import { BlockId, isSolid } from '../core/blocks'
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
    const gameplay = controls.gameplayInput && (controls.isLocked || controls.isTouchDevice)
    let flyMoveY = 0
    const onLadder = !controls.fly && this.isOnLadder()
    if (gameplay && controls.fly) {
      if (controls.keys.has('Space')) flyMoveY += FLY_SPEED
      if (controls.keys.has('ShiftLeft') || controls.keys.has('ShiftRight')) flyMoveY -= FLY_SPEED
    }
    let climbY = 0
    if (onLadder && gameplay) {
      if (controls.keys.has('Space')) climbY = WALK_SPEED
      else if (controls.keys.has('ShiftLeft') || controls.keys.has('ShiftRight')) climbY = -WALK_SPEED
    }
    stepPhysics(
      this.state,
      {
        moveX: dir.x * speed,
        moveZ: dir.z * speed,
        jump: gameplay && controls.keys.has('Space') && !onLadder,
        fly: controls.fly,
        flyMoveY,
        swim: !controls.fly && !onLadder && this.state.pos.y < WATER_LEVEL,
        climb: onLadder,
        climbY,
      },
      dt,
      (x, y, z) => isSolid(this.world.getBlock(x, y, z)),
    )
    // Fell out of the world: respawn at the same column.
    if (this.state.pos.y < -20) this.spawnAt(this.state.pos.x, this.state.pos.z)
  }

  private isOnLadder(): boolean {
    const { pos } = this.state
    const half = PLAYER_WIDTH / 2
    const minX = Math.floor(pos.x - half + 0.05)
    const maxX = Math.floor(pos.x + half - 0.05)
    const minY = Math.floor(pos.y + 0.1)
    const maxY = Math.floor(pos.y + PLAYER_HEIGHT - 0.1)
    const minZ = Math.floor(pos.z - half + 0.05)
    const maxZ = Math.floor(pos.z + half - 0.05)
    for (let y = minY; y <= maxY; y++)
      for (let z = minZ; z <= maxZ; z++)
        for (let x = minX; x <= maxX; x++)
          if (this.world.getBlock(x, y, z) === BlockId.Ladder) return true
    return false
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
