import { BlockId } from '../core/blocks'
import { ItemId } from './items'

export interface Recipe {
  id: string
  inputs: { itemId: number; count: number }[]
  output: { itemId: number; count: number }
}

export const RECIPES: Recipe[] = [
  // Basic materials
  { id: 'plank', inputs: [{ itemId: BlockId.Wood, count: 3 }], output: { itemId: BlockId.Plank, count: 6 } },
  { id: 'brick', inputs: [{ itemId: BlockId.Stone, count: 4 }], output: { itemId: BlockId.Brick, count: 4 } },
  { id: 'glass', inputs: [{ itemId: BlockId.Sand, count: 4 }], output: { itemId: BlockId.Glass, count: 3 } },
  { id: 'ladder', inputs: [{ itemId: BlockId.Wood, count: 2 }, { itemId: BlockId.Stone, count: 2 }], output: { itemId: BlockId.Ladder, count: 4 } },
  // Tools
  { id: 'wood-pickaxe', inputs: [{ itemId: BlockId.Plank, count: 3 }, { itemId: BlockId.Stone, count: 2 }], output: { itemId: ItemId.WoodPickaxe, count: 1 } },
  { id: 'stone-pickaxe', inputs: [{ itemId: BlockId.Plank, count: 3 }, { itemId: BlockId.Stone, count: 4 }], output: { itemId: ItemId.StonePickaxe, count: 1 } },
  { id: 'axe', inputs: [{ itemId: BlockId.Plank, count: 2 }, { itemId: BlockId.Stone, count: 3 }], output: { itemId: ItemId.Axe, count: 1 } },
  { id: 'shears', inputs: [{ itemId: BlockId.Plank, count: 2 }, { itemId: BlockId.Stone, count: 1 }], output: { itemId: ItemId.Shears, count: 1 } },
  { id: 'net', inputs: [{ itemId: BlockId.Leaves, count: 3 }], output: { itemId: ItemId.Net, count: 1 } },
  // Storage
  { id: 'chest', inputs: [{ itemId: BlockId.Stone, count: 4 }, { itemId: BlockId.Plank, count: 2 }], output: { itemId: BlockId.Chest, count: 1 } },
  // Furniture
  { id: 'door', inputs: [{ itemId: BlockId.Plank, count: 4 }], output: { itemId: ItemId.Door, count: 1 } },
  { id: 'window', inputs: [{ itemId: BlockId.Plank, count: 2 }, { itemId: BlockId.Glass, count: 2 }], output: { itemId: ItemId.Window, count: 1 } },
  { id: 'desk', inputs: [{ itemId: BlockId.Plank, count: 6 }], output: { itemId: ItemId.Desk, count: 1 } },
  { id: 'chair', inputs: [{ itemId: BlockId.Plank, count: 3 }], output: { itemId: ItemId.Chair, count: 1 } },
  { id: 'bed', inputs: [{ itemId: BlockId.Plank, count: 4 }, { itemId: BlockId.Leaves, count: 2 }], output: { itemId: ItemId.Bed, count: 1 } },
  { id: 'sofa', inputs: [{ itemId: BlockId.Plank, count: 4 }, { itemId: BlockId.Stone, count: 2 }], output: { itemId: ItemId.Sofa, count: 1 } },
]
