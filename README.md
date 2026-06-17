# Minicraft

A browser-based 3D voxel exploration game built with Three.js and TypeScript.
No assets — terrain, textures, animals, buildings, and UI are all generated procedurally in code.

![Minicraft](https://img.shields.io/badge/built%20with-three.js-049EF4)

## Features

### World & Exploration
- **Infinite procedural terrain** — seeded simplex-noise hills, rivers, lakes with sand beaches, streamed in chunks as you explore
- **Expanded render distance** — 12-chunk view radius for wide-open exploration
- **Day/night cycle** — sun, moon, and stars; live HUD timer shows current phase
- **Villages** — procedurally placed settlements with houses, a campfire, a market stall, and villager NPCs
- **Minimap** — press M to toggle; shows nearby animals and your home spawn

### Blocks & Resources
- **10+ block types** — Grass, Dirt, Stone, Sand, Wood, Leaves, Apple Leaves, Planks, Brick, Glass, Ladder
- **Gold Ore** — shiny yellow spots appear on the surface; rich veins run through deep stone layers
- **Mystery Boxes** — Common, Rare, and Epic variants found in the wild, each containing random loot
- **Loot chests** — naturally generated on the surface, filled with tools and resources

### Animals & Taming
| Animal | Tamed with | Notes |
|--------|-----------|-------|
| Pig | Apple | Found under trees |
| Sheep | Wheat | Roams open fields |
| Chicken | Seeds | Common everywhere |
| Rabbit | Carrot | Fast; skittish |
| Cat | Fish | Needs a fishing net |
| Dog | Bone | Mining leaves may drop bones |
| Horse | Wheat | Rideable! Press F to dismount |

- Tamed animals **follow** you by default; right-click to toggle **follow/stay**
- **Shift + right-click** a tamed animal to capture it into your bag
- Right-click on captured animal item to **release** it at a target spot

### Horses
- Tame with Wheat, then **right-click** to mount
- Horses are significantly faster than walking (~5.5 m/s)
- Press **F** to dismount
- Horses can jump over obstacles (Space while riding)

### Apple Trees
- About 30% of trees are apple trees — recognisable by the **red apples** visible in their leaf canopy
- Breaking apple leaves drops an Apple; regular leaves drop a Leaf block (and occasionally a Bone)

### Fishing
- Start with a **Fishing Net** in your hotbar
- Aim at water and **right-click** to cast — works if the ray hits an underwater block or crosses the water surface
- Visible **fish schools** swim beneath the surface

### Market
- Visit the market stall in any village and **right-click** to open
- Spend Gold to buy raw materials, food, tools, and furniture
- Stock of 8 items rotates **hourly** (seeded by the world)
- Gold is mined from Gold Ore deposits

### Crafting
- Press **Z** to open the crafting table — craft planks from wood, glass from sand, and more

### Building & Furniture
- Place doors, windows, desks, chairs, beds, sofas, chests, and ladders
- **Left-click** on placed furniture to pick it back up; campfires and market stalls are fixed
- Chests store up to 27 extra item stacks

### Atmosphere
- **Colorful birds** circle overhead in the sky
- **Fish schools** swim in lakes and ponds
- Underwater blue tint when submerged
- Background music (toggle with the music button in the HUD)

### Multiplayer *(requires Supabase — see setup below)*
- Host a world and share a room code (e.g. `MC-4821`) with friends
- Block edits, animals, chests, and player avatars sync in real time
- Real-time **chat** (press C or Enter)

---

## Run it

```bash
npm install
npm run dev        # open http://localhost:5173
```

Other commands: `npm run test:run` (80+ unit tests), `npm run build` (production build into `dist/`).

### Multiplayer setup

Copy `.env.example` to `.env.local` (contains working publishable keys for the shared Supabase project):

```bash
cp .env.example .env.local
```

Without `.env.local` the game runs in singleplayer-only mode.

### Profiles & cloud saves

Click **Create Profile** on the main menu to save worlds to the cloud (username + password — no email):

- Worlds autosave every 30 seconds and appear on any device you sign in from
- Host a profile world online; the session saves back to your profile automatically

---

## Controls

### Movement & Camera

| Input | Action |
|-------|--------|
| Click canvas | Capture mouse pointer (Esc releases) |
| W / A / S / D or Arrow keys | Move |
| Space | Jump |
| F | Toggle fly mode (Space = up, Shift = down) |
| Mouse drag | Look around |

### Horse riding

| Input | Action |
|-------|--------|
| Right-click on tamed horse | Mount horse |
| F | Dismount horse |
| W / A / S / D | Steer horse (faster than walking) |
| Space | Horse jump |

### Mining & Building

| Input | Action |
|-------|--------|
| Hold left-click | Mine the targeted block |
| Right-click | Place held block / open chest / feed or interact with animal |
| Shift + right-click (animal) | Capture tamed animal into bag |
| Right-click ground with capture item | Release animal |

### UI & Shortcuts

| Key | Action |
|-----|--------|
| E or I | Open / close inventory bag |
| Z | Open / close crafting panel |
| M | Toggle minimap |
| C or Enter | Open chat panel (multiplayer) |
| I (with target in view) | Show item / animal info |
| 1 – 9 | Select hotbar slot |
| Scroll wheel | Cycle hotbar selection |

**Mobile / tablet:** virtual joystick (bottom-left) to move, swipe right side to look, JUMP and BAG buttons on-screen.

---

## Tips

- **Gold** appears as yellow flecks on the surface and in deep stone; mine it with a pickaxe
- **Apple trees** show red apples in their canopy — only they drop Apples for taming pigs
- **Fishing net** is in your starting hotbar — aim at water and right-click
- **Horse** is the fastest way to explore. Tame with Wheat, right-click to ride, F to dismount
- **Market** refreshes every real-world hour. Save up Gold and check back for new stock
- The **minimap** (M) marks animals in yellow/gold so you can find tamed ones
- Pressing **I** while looking at a block or animal shows a tooltip with taming / drop info

---

## Project structure

```
src/
├── core/      blocks, chunk-coordinate math, seeded RNG
├── world/     noise, terrain generation, chunked world with edit diffs, village builder
├── render/    procedural texture atlas, chunk mesher, day-night sky, fish school, bird flock
├── player/    pointer-lock + touch controls, AABB voxel physics
├── interact/  voxel DDA raycast, mining / placing / animal / furniture interaction
├── items/     item registry, inventory (200 slots × 200 stack), chest loot tables
├── entities/  animal AI (wander / follow / stay / ridden), blocky 3D models, entity manager
├── net/       Supabase Realtime transport, remote avatars, multiplayer protocol, cloud-save API
├── ui/        HUD, inventory / chest / crafting / market panels, minimap, menus, mobile controls
└── persist/   localStorage save/load, 5-slot MultiWorldStore
```
