import { BlockId } from '../core/blocks'
import { ItemId } from './items'

export interface Recipe {
  id: string
  inputs: { itemId: number; count: number }[]
  output: { itemId: number; count: number }
  /** What the crafted item is for — shown on the recipe detail screen. */
  desc: string
}

export const RECIPES: Recipe[] = [
  // Basic materials
  { id: 'plank', inputs: [{ itemId: BlockId.Wood, count: 3 }], output: { itemId: BlockId.Plank, count: 6 }, desc: 'The basic building board — most tools and furniture start with planks.' },
  { id: 'brick', inputs: [{ itemId: BlockId.Stone, count: 4 }], output: { itemId: BlockId.Brick, count: 4 }, desc: 'A sturdy decorative building block for smart-looking walls.' },
  { id: 'glass', inputs: [{ itemId: BlockId.Sand, count: 4 }], output: { itemId: BlockId.Glass, count: 3 }, desc: 'A see-through block — build windows and skylights you can look out of.' },
  { id: 'ladder', inputs: [{ itemId: BlockId.Wood, count: 2 }, { itemId: BlockId.Stone, count: 2 }], output: { itemId: BlockId.Ladder, count: 4 }, desc: 'Place on a wall and walk into it to climb: Space goes up, Shift comes down.' },
  { id: 'tnt', inputs: [{ itemId: BlockId.Sand, count: 2 }, { itemId: BlockId.Stone, count: 1 }], output: { itemId: BlockId.TNT, count: 2 }, desc: 'Stack as many as you like — placing it does not light it. MINE a stick to start its 2 second fuse, then stand back.' },
  { id: 'fence', inputs: [{ itemId: BlockId.Wood, count: 2 }], output: { itemId: BlockId.Fence, count: 6 }, desc: 'Pens in your tamed animals — build a ring of it around your farm.' },
  // Cooking (restores energy when eaten)
  { id: 'cooked-fish', inputs: [{ itemId: ItemId.Fish, count: 1 }, { itemId: BlockId.Wood, count: 1 }], output: { itemId: ItemId.CookedFish, count: 1 }, desc: 'A hot meal — eat it (hold + right-click/USE) to restore 40⚡ energy.' },
  { id: 'fish-stew', inputs: [{ itemId: ItemId.CookedFish, count: 1 }, { itemId: ItemId.Egg, count: 1 }, { itemId: ItemId.Apple, count: 1 }], output: { itemId: ItemId.FishStew, count: 1 }, desc: 'The heartiest dish in the game — eating it restores a huge 80⚡ energy.' },
  // Tools
  { id: 'wood-pickaxe', inputs: [{ itemId: BlockId.Plank, count: 3 }, { itemId: BlockId.Stone, count: 2 }], output: { itemId: ItemId.WoodPickaxe, count: 1 }, desc: 'Mines stone 4× faster than bare hands — your first real tool.' },
  { id: 'stone-pickaxe', inputs: [{ itemId: BlockId.Plank, count: 3 }, { itemId: BlockId.Stone, count: 4 }], output: { itemId: ItemId.StonePickaxe, count: 1 }, desc: 'Mines stone 8× faster — needed to dig deep for diamond ore.' },
  { id: 'axe', inputs: [{ itemId: BlockId.Plank, count: 2 }, { itemId: BlockId.Stone, count: 3 }], output: { itemId: ItemId.Axe, count: 1 }, desc: 'Chops wood 4× faster — clear whole trees in moments.' },
  { id: 'shears', inputs: [{ itemId: BlockId.Plank, count: 2 }, { itemId: BlockId.Stone, count: 1 }], output: { itemId: ItemId.Shears, count: 1 }, desc: 'Snips leaves quickly — the fastest way to hunt for apples and bones.' },
  // Weapons — upgrade materials are bought with diamonds at the market smithy
  { id: 'sword', inputs: [{ itemId: BlockId.Plank, count: 2 }, { itemId: BlockId.Stone, count: 3 }], output: { itemId: ItemId.Sword, count: 1 }, desc: 'Deals 6 damage per swing — fight night zombies instead of running.' },
  { id: 'iron-sword', inputs: [{ itemId: ItemId.Sword, count: 1 }, { itemId: ItemId.IronBlade, count: 1 }], output: { itemId: ItemId.IronSword, count: 1 }, desc: 'Upgraded blade dealing 12 damage — fells a zombie twice as fast.' },
  { id: 'diamond-sword', inputs: [{ itemId: ItemId.IronSword, count: 1 }, { itemId: ItemId.DiamondEdge, count: 1 }], output: { itemId: ItemId.DiamondSword, count: 1 }, desc: 'The ultimate weapon — 24 damage per swing shreds zombies instantly.' },
  { id: 'net', inputs: [{ itemId: BlockId.Leaves, count: 3 }], output: { itemId: ItemId.Net, count: 1 }, desc: 'Hold it and use on a pond to catch fish — food for you and for taming cats.' },
  // Storage
  { id: 'chest', inputs: [{ itemId: BlockId.Stone, count: 4 }, { itemId: BlockId.Plank, count: 2 }], output: { itemId: BlockId.Chest, count: 1 }, desc: 'Place it and use it to store items — great for stockpiling near home.' },
  // Furniture
  { id: 'door', inputs: [{ itemId: BlockId.Plank, count: 4 }], output: { itemId: ItemId.Door, count: 1 }, desc: 'A swinging front door for your house — use it to open and close.' },
  { id: 'window', inputs: [{ itemId: BlockId.Plank, count: 2 }, { itemId: BlockId.Glass, count: 2 }], output: { itemId: ItemId.Window, count: 1 }, desc: 'A framed pane that lets light into your builds.' },
  { id: 'desk', inputs: [{ itemId: BlockId.Plank, count: 6 }], output: { itemId: ItemId.Desk, count: 1 }, desc: 'A handsome work table to furnish your cottage.' },
  { id: 'chair', inputs: [{ itemId: BlockId.Plank, count: 3 }], output: { itemId: ItemId.Chair, count: 1 }, desc: 'A simple seat — pull one up to your desk.' },
  { id: 'bed', inputs: [{ itemId: BlockId.Plank, count: 4 }, { itemId: BlockId.Leaves, count: 2 }], output: { itemId: ItemId.Bed, count: 1 }, desc: 'Use it at night to sleep until morning and fully restore your energy.' },
  { id: 'sofa', inputs: [{ itemId: BlockId.Plank, count: 4 }, { itemId: BlockId.Stone, count: 2 }], output: { itemId: ItemId.Sofa, count: 1 }, desc: 'A comfy two-seater to make your living room feel like home.' },
]

/** Where to find each craftable ingredient out in the world. */
const ITEM_SOURCES = new Map<number, string>([
  [BlockId.Wood, 'Chop tree trunks — hold left-click (or the red ⛏ button); an Axe speeds it up.'],
  [BlockId.Stone, 'Mine grey stone on hillsides or dig below the grass — faster with a pickaxe.'],
  [BlockId.Sand, 'Dig sandy beaches around lakes and along the shoreline.'],
  [BlockId.Leaves, 'Break leafy tree canopies — Shears make quick work of them.'],
  [BlockId.Plank, 'Craft it here: 3 Wood → 6 Planks.'],
  [BlockId.Glass, 'Craft it here: 4 Sand → 3 Glass.'],
  [ItemId.Fish, 'Catch with the Fishing Net at a pond, and cats sometimes gift them.'],
  [ItemId.CookedFish, 'Craft it here: Fish + Wood → Cooked Fish.'],
  [ItemId.Egg, 'Tamed chickens lay one every 2 days — use (right-click) your chicken to collect.'],
  [ItemId.Apple, 'Break tree leaves for a chance drop; apple trees are the best spot.'],
  [ItemId.Sword, 'You start with one in your bag, or craft it here: 2 Planks + 3 Stone.'],
  [ItemId.IronSword, 'Craft it here: Sword + Iron Blade.'],
  [ItemId.IronBlade, 'Buy at the market smithy for 4 Diamonds (mine diamond ore deep underground).'],
  [ItemId.DiamondEdge, 'Buy at the market smithy for 8 Diamonds (mine diamond ore deep underground).'],
])

/** How to obtain an item, for the crafting detail screen. */
export function itemSource(itemId: number): string {
  const direct = ITEM_SOURCES.get(itemId)
  if (direct) return direct
  const recipe = RECIPES.find((r) => r.output.itemId === itemId)
  if (recipe) return 'Craft it here — open its details for the full recipe.'
  return 'Explore the world — mine, trade, and open treasure chests.'
}
