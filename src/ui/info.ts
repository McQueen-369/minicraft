import { blockDef, BlockId, type ToolType } from '../core/blocks'
import { itemDef, type AnimalKind } from '../items/items'

/** A short, human-readable help card for an animal or item. */
export interface InfoContent {
  title: string
  lines: string[]
}

const TAME_FOOD: Partial<Record<AnimalKind, string>> = {
  pig: 'Apple',
  chicken: 'Seeds',
  sheep: 'Wheat',
  rabbit: 'Carrot',
  cat: 'Fish',
  dog: 'Bone',
  horse: 'Wheat',
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s
}

/** How to tame, command, capture and release a given animal. */
export function animalInfo(kind: AnimalKind): InfoContent {
  if (kind === 'zombie') {
    return {
      title: 'Zombie',
      lines: [
        'A hostile mob that only comes out at night — it crumbles away at dawn.',
        'It chases you, and each strike drains your energy (⚡).',
        'Attack: hold MINE (left-click) while aiming at it — the same action as mining. A sword hits much harder than bare hands.',
        'Defeated zombies drop Gold and sometimes a Diamond.',
      ],
    }
  }
  if (kind === 'villager') {
    return {
      title: 'Villager',
      lines: ['A friendly inhabitant of the village.', 'Villagers wander peacefully and cannot be tamed or captured.'],
    }
  }
  const food = TAME_FOOD[kind]!
  if (kind === 'horse') {
    return {
      title: 'Horse',
      lines: [
        `Tame: hold ${food} in your hand and USE (right-click) on the horse to feed it. Feed it to make it yours.`,
        'Ride: USE (or tap) your tamed horse to mount it. Dismount with F — on mobile, double-tap the screen.',
        'Capture: hold Shift + right-click — on mobile hold DOWN then tap USE — on your tamed horse to pack it into a carry item.',
        'Release: select the captured horse item and USE on open ground to set it back down.',
      ],
    }
  }
  return {
    title: capitalize(kind),
    lines: [
      `Tame: hold ${food} in your hand and USE (right-click) on the ${kind} to feed it. Feed it to make it yours.`,
      `Command: USE on your tamed ${kind} to toggle between following you and staying put.`,
      `Capture: hold Shift + right-click — on mobile hold DOWN then tap USE — on your tamed ${kind} to pack it into a carry item.`,
      `Release: select the captured ${kind} item and USE on open ground to set it back down.`,
    ],
  }
}

function toolWord(tool: ToolType | null): string {
  if (tool === 'pickaxe') return 'a pickaxe'
  if (tool === 'axe') return 'an axe'
  if (tool === 'shears') return 'shears'
  return 'your hand'
}

function toolBestFor(tool: ToolType): string {
  if (tool === 'pickaxe') return 'Best for stone, brick and other hard blocks.'
  if (tool === 'axe') return 'Best for wood, planks and chests.'
  return 'Best for leaves and wool.'
}

/** How to use and obtain a given item (or placed block). */
export function itemInfo(itemId: number): InfoContent {
  const def = itemDef(itemId)
  if (!def) return { title: 'Unknown', lines: [] }
  if (itemId === BlockId.TNT) {
    return {
      title: 'TNT',
      lines: [
        'Use: place it and step back — the fuse burns for a couple of seconds, then it blasts away every block around it.',
        'USE (right-click) a placed TNT block to relight its fuse; mine it before it blows to defuse and pick it back up.',
        'Get: starts in your bag (and refills when empty). Craft more from Sand and Stone.',
      ],
    }
  }
  const lines: string[] = []
  if (def.kind === 'block') {
    lines.push('Use: select it on the hotbar and USE (right-click) on a surface to place the block.')
    const bd = def.block !== undefined ? blockDef(def.block) : null
    if (bd) lines.push(`Get: mine ${def.name} blocks with ${toolWord(bd.tool)} to collect them.`)
  } else if (def.kind === 'tool' && def.damage !== undefined && !def.tool) {
    // Pure weapons (swords)
    lines.push(`Use: hold it and attack zombies with MINE (hold left-click) — deals ${def.damage} damage per swing.`)
    lines.push('Upgrade: buy smithing materials with Diamonds at the market, then forge in the crafting menu.')
    lines.push('Get: every player starts with a Sword in the bag; stronger tiers are forged.')
  } else if (def.kind === 'tool') {
    lines.push('Use: hold it and mine matching blocks — it breaks them much faster than bare hands.')
    if (def.tool) lines.push(toolBestFor(def.tool.type))
    if (def.damage !== undefined) lines.push(`It also deals ${def.damage} damage per swing against zombies.`)
    lines.push('Get: tools are found inside treasure boxes scattered around the world.')
  } else if (def.kind === 'material') {
    if (itemId === 201 /* Diamond */) {
      lines.push('A precious gem — spend it at the market smithy on materials that strengthen your sword.')
      lines.push('Get: mine Diamond Ore found deep underground, or defeat night zombies for a chance at one.')
    } else {
      lines.push('Smithing material — combine it with your sword in the crafting menu to forge a stronger weapon.')
      lines.push('Get: buy it with Diamonds at the market smithy.')
    }
  } else if (def.kind === 'food') {
    lines.push(`Use: hold it and USE (right-click) on a ${def.food} to feed and tame it.`)
    lines.push('Get: harvested from crops or found inside treasure boxes.')
  } else if (def.kind === 'capture') {
    lines.push(`Use: select it and USE on open ground to release your ${def.animal}.`)
    lines.push(`Get: capture a tamed ${def.animal} with Shift + right-click (mobile: hold DOWN then USE).`)
  } else if (def.kind === 'furniture') {
    lines.push('Place: select it and USE (right-click) against a wall, floor or surface to set it down.')
    if (def.furniture === 'door') lines.push('USE a placed door to swing it open or closed.')
    lines.push('Pick up: MINE (hold left-click) the piece to collect it back into your bag.')
    lines.push('Get: your starter house comes furnished, and furniture is found in treasure boxes.')
  } else if (def.kind === 'net') {
    lines.push('Use: hold it and right-click (USE on mobile) while aiming at a pond or lake to catch fish.')
    lines.push('Fish is used to tame cats. You can also find fish in treasure boxes.')
    lines.push('Get: starts in your bag at the beginning of every new world.')
  }
  return { title: def.name, lines }
}
