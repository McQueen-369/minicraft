import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { Terrain } from '../world/terrain'
import { World } from '../world/world'
import type { WorldKind } from '../world/worldKind'
import { isHostile } from './animal'
import { buildAnimalModel, disposeModel } from './animalModels'
import { EntityManager, HOSTILE_HEALTH } from './entityManager'

const SEED = 987654

function nightSession(kind: WorldKind) {
  const terrain = new Terrain(SEED, kind)
  const world = new World(terrain)
  const entities = new EntityManager(new THREE.Scene(), world, kind === 'robot' ? 'robot' : 'zombie')
  // Stand somewhere dry, so spawn attempts are not all rejected as lakes.
  let spot = { x: 0, z: 0 }
  outer: for (let x = 0; x < 400; x += 4) {
    for (let z = 0; z < 400; z += 4) {
      if (terrain.heightAt(x, z) > 34) {
        spot = { x, z }
        break outer
      }
    }
  }
  const viewer = { x: spot.x + 0.5, y: terrain.heightAt(spot.x, spot.z) + 1, z: spot.z + 0.5 }
  /** Run night ticks until at least one hostile mob has risen. */
  const riseMobs = () => {
    for (let i = 0; i < 200; i++) {
      entities.update(6, viewer, new Map(), true, 0, true)
      if ([...entities.animals.values()].some((a) => isHostile(a.kind))) break
    }
    return [...entities.animals.values()].filter((a) => isHostile(a.kind))
  }
  return { entities, viewer, riseMobs }
}

describe('night mobs by world kind', () => {
  it('sends zombies in a terrain world and bad robots in a robot world', () => {
    expect(nightSession('terrain').riseMobs()[0].kind).toBe('zombie')
    expect(nightSession('robot').riseMobs()[0].kind).toBe('robot')
  })

  it('gives a bad robot the same health, damage response and dawn cleanup as a zombie', () => {
    const { entities, viewer, riseMobs } = nightSession('robot')
    const mob = riseMobs()[0]
    expect(mob.health).toBe(HOSTILE_HEALTH)

    expect(entities.hurtHostile(mob.id, 1, viewer)).toBe('hurt')
    expect(entities.animals.get(mob.id)!.health).toBe(HOSTILE_HEALTH - 1)
    expect(entities.hurtHostile(mob.id, HOSTILE_HEALTH, viewer)).toBe('died')
    expect(entities.animals.has(mob.id)).toBe(false)

    // Daylight shuts down whatever is still standing.
    riseMobs()
    entities.update(1, viewer, new Map(), true, 0, false)
    expect([...entities.animals.values()].some((a) => isHostile(a.kind))).toBe(false)
  })

  it('builds a distinct model for the bad robot', () => {
    const robot = buildAnimalModel('robot')
    const zombie = buildAnimalModel('zombie')
    expect(robot.legs).toHaveLength(2)
    expect(robot.group.children.length).not.toBe(zombie.group.children.length)
    disposeModel(robot)
    disposeModel(zombie)
  })
})
