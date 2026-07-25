# Minicraft

A browser-based 3D voxel exploration game built with Three.js and TypeScript.
No assets — terrain, textures, animals, buildings, and UI are all generated procedurally in code.

![Minicraft](https://img.shields.io/badge/built%20with-three.js-049EF4)

## Features

### World & Exploration
- **Infinite procedural terrain** — seeded simplex-noise hills, rivers, lakes with sand beaches, streamed in chunks as you explore
- **Expanded render distance** — 12-chunk view radius for wide-open exploration
- **Ambient occlusion & detailed textures** — corner shadows and directional face shading are baked into every chunk, and block textures are drawn at double resolution with a grain-and-relief pass, so terrain reads with real depth under filmic tone mapping
- **Day/night cycle** — a bright sun disc and drifting clouds by day, moon and stars by night; a live HUD timer shows the day count and current phase
- **Villages** — procedurally placed settlements with three furnished cottages (stone plinths, timber-framed brick walls, pitched gable roofs, chimneys and porches), a market stall on a stone forecourt, a covered well, fenced kitchen gardens, lantern-lit stone lanes and villager NPCs. The whole site is levelled and packed down to the natural ground first, so nothing ever floats — over water the village stands on a sand-and-dirt embankment
- **Secret Island** — a hidden dome of land tucked inside a ring-shaped lake a few hundred blocks from spawn, deterministic per world seed. Its plaza hosts an arcade of four educational mini-games plus bonus mystery boxes (see below)
- **Carry villagers** — left-click a villager NPC to pick it up and carry it around; left-click again to set it back down (NPCs are never stored in your bag)
- **Minimap** — press M to toggle; shows nearby animals, your home spawn, and (once discovered) the secret island

### Blocks & Resources
- **12+ block types** — Grass, Dirt, Stone, Sand, Wood, Leaves, Apple Leaves, Planks, Brick, Glass, Fence, Ladder, TNT
- **Gold Ore** — shiny yellow spots appear on the surface; rich veins run through deep stone layers
- **Diamond Ore** — rare sparkling veins hidden 6+ blocks below the surface; drops Diamond gems used at the market smithy to strengthen your sword
- **Mystery Boxes** — Common, Rare, and Epic variants found in the wild, each containing random loot
- **Loot chests** — naturally generated on the surface, filled with tools and resources
- **TNT** — every session starts with 200 in your bag; place and right-click to light the fuse, or right-click placed TNT to detonate it (2 second fuse, chain-reacts with nearby TNT)

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
- **Tamed chickens lay an egg every 2 in-game days** — the nameplate flags "egg ready!"; right-click your chicken to collect it as a cooking ingredient

### Horses
- Tame with Wheat, then **right-click** to mount
- Horses are significantly faster than walking (~5.5 m/s)
- Press **F** to dismount
- Horses can jump over obstacles (Space while riding)

### Apple Trees
- About 30% of trees are apple trees — recognisable by the **red apples** visible in their leaf canopy
- Breaking apple leaves drops an Apple; regular leaves drop a Leaf block (and occasionally a Bone)

### Energy, Food & Sleep
- A ⚡ **energy bar** (0–100) sits above the hotbar — mining costs energy, and at 0 you're too tired to mine
- **Eat food to refuel**: Apple (+20), Cooked Fish (+40), Fish Stew (+80) — right-click with the food held
- **Cook** in the crafting panel: Fish + Wood → Cooked Fish; Cooked Fish + Egg + Apple → Fish Stew
- **Sleep** in a bed (right-click) to jump straight to the next morning with a fully restored bar — the screen dims like closing your eyes, then fades back in at dawn
- Energy, the day count, and island discovery all persist in your save

### Challenge Island & Mini-Games
- Sits inside a ring-shaped lake a few hundred blocks from spawn — a pink **🏝 flag on the map** always points the way (clamped to the map edge until you get close)
- Its plaza has four glowing arcade kiosks, each a small educational mini-game that pays out item prizes:
  - 🧩 **Sliding Puzzle** — reorder a shuffled 3×3 grid; fewer moves win a bigger prize
  - 🏃 **Island Runner** — endless jump-the-obstacle runner; score 150+ to win gold
  - 🎯 **Math Blaster** — shoot the target with the correct answer across 10 ramping arithmetic questions
  - 🔤 **Word Wizard** — hangman-style word guessing with vocabulary hints
- A couple of bonus Rare Mystery Boxes sit at the plaza's edge for explorers

### Fishing
- Start with a **Fishing Net** in your hotbar
- Aim at water and **right-click** to cast — works if the ray hits an underwater block or crosses the water surface
- Visible **fish schools** swim beneath the surface

### Zombies & Combat
- **Zombies rise at night** and crumble to dust at dawn — they chase you and each strike drains 8⚡ energy
- **Attacking is the mining action**: aim at a zombie and hold left-click (mobile: hold the red ⛏ button)
- **Every player starts with a Sword** in the bag — swords hit far harder than bare hands
- Defeated zombies drop **2 Gold**, with a 30% chance of a bonus **Diamond**

### Sword Upgrades
- Mine **Diamonds** deep underground, then spend them at the market **smithy**:
  - **Iron Blade** (4 💎) + Sword → **Iron Sword** (double damage) in the crafting menu
  - **Diamond Edge** (8 💎) + Iron Sword → **Diamond Sword** (one-swing zombie kills)

### Market
- Visit the market stall in any village and **right-click** to open
- **Buy** tab — spend Gold on raw materials, food, tools and furniture. Pick an amount with the −/+ stepper (or **Max**) and the trader's stock goes down as you buy; sold-out goods grey out until the next rotation
- **Sell** tab — the trader buys back anything in your bags: blocks, food, tools, gems, even captured animals. Prices are half the shelf price, and rarities like Diamonds and upgraded swords are worth far more
- The **smithy section** always stocks sword-upgrade materials, priced in Diamonds
- Stock of 8 rotating items refreshes **hourly** (seeded by the world)
- Gold is mined from Gold Ore deposits, dropped by zombies, or earned by selling

### Crafting
- Press **Z** to open the crafting table — craft planks from wood, glass from sand, and more
- Tap the **ⓘ** next to any recipe for a full instruction page: what the item does, the exact combination needed, how much of each ingredient you have, and **where to find every ingredient**
- Successful crafts give clear visual feedback — the recipe flashes green with a “✓ Crafted!” confirmation

### Item Names & Identification
- Selecting a hotbar slot pops up the item's name above the energy bar
- Tapping any item in the bag or a chest shows its name at the top of the panel — including undiscovered catalog items

### Building & Furniture
- Place doors, windows, desks, chairs, beds, sofas, chests, fences, and ladders
- **Build skyward without a ceiling** — the world column is 256 blocks tall, leaving ~230 blocks of clear air above the terrain for towers and sky bases
- **Left-click** on placed furniture to pick it back up; campfires, market stalls, and arcade kiosks are fixed
- Chests store up to 27 extra item stacks
- Opening a chest pops up a brief on-screen overview of its contents (fades after 3 seconds, or click to dismiss)

### Your Starter Cottage
- New worlds spawn you inside a furnished cottage (bedroom + living room) with plank walls, wood corner posts, and a pitched, overhanging brick-shingle gable roof with a chimney
- The adjoining farm pen is ringed by wooden **fences** (not solid walls) so you can see your animals from outside — release tamed animals in and toggle "stay" to keep them there

### Ladders
- **Stack ladders vertically** to build a climbable column as tall as you like — aim at the top of a ladder and right-click to add another above it
- Ladders are walk-through, so you can stack them even while standing on them
- Climb with **Space** (up) and **Shift** (down) while on a ladder
- **Left-click** a placed ladder to remove it and store it straight back in your bag

### Atmosphere
- **Sun & clouds** — a glowing sun arcs across a sky dotted with drifting white clouds that float high above the world
- **Colorful birds** circle overhead in the sky
- **Fish schools** swim in lakes and ponds
- Underwater blue tint when submerged
- Background music (toggle with the music button in the HUD)

### Profile & Character Customization
- **⚙ Profile Settings** on the main menu gathers everything about you: character customization plus (when signed in) username and password changes
- **🧍 Customize Character** opens the character editor with a live rotating 3D preview
- Pick a **facial expression** from 8 presets — Happy, Cheerful, Chill (sunglasses!), Surprised, Sleepy, Grumpy, Fierce, Silly — or fine-tune **eyes** and **mouth** individually
- Choose **hair style** (short, long, spiky, bowl, ponytail, mohawk, or bald) and **hair colour**
- Set **skin tone**, **eye colour**, and **clothing colours** (shirt + trousers)
- Your look is saved on this device and shown to friends in multiplayer

### Multiplayer *(requires Supabase — see setup below)*
- Host a world and share a room code (e.g. `MC-4821`) with friends
- Block edits, animals, chests, and player avatars sync in real time
- Everyone sees your **customized character** — face, hair, and outfit
- Real-time **chat** (press C or Enter)
- **Player-to-player trading** — press **T** (or the TRADE button by the hotbar) near another player to invite them to a trade

### Trading With Other Players
- Press **T** near another player, or tap **TRADE**; with several people around you pick who to invite from a list
- They get a request they can accept or decline — accepting opens the trade window on both screens
- Click items in your bag to put them on the table, and click a lot on the table to take it back; the ×1 / ×5 / ×10 / ×64 buttons set how much each click moves
- Both players must press **Confirm trade**. Changing either offer clears both confirmations, so nobody can swap the goods out at the last second
- Leave one side empty to simply give something away
- Trades cancel themselves if either player backs out, walks off the room, or no longer has what they offered

---

## Run it

```bash
npm install
npm run dev        # open http://localhost:5173
```

Other commands: `npm run test:run` (100+ unit tests), `npm run build` (production build into `dist/`).

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
- **Account settings** — once signed in, open **⚙ Settings** on the main menu to change your username or reset your password. Your saved worlds are keyed to your profile, so changing either leaves every world untouched

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
| Hold left-click on a zombie | Attack it with the held weapon (same action as mining) |
| Left-click furniture / ladder | Pick it back up into your bag |
| Left-click villager | Pick up / set down to carry the NPC around |
| Right-click | Place held block / open chest / eat held food / sleep in bed / open arcade kiosk / feed or interact with animal |
| Shift + right-click (animal) | Capture tamed animal into bag |
| Right-click ground with capture item | Release animal |
| Right-click tamed chicken with egg ready | Collect the egg |

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
- **Trade with friends** rather than grinding: one of you mines Gold while the other farms, then swap with **T**
- **Market** refreshes every real-world hour. Save up Gold and check back for new stock — and clear out your spare blocks on the **Sell** tab while you are there
- The **minimap** (M) marks animals in yellow/gold so you can find tamed ones
- Pressing **I** while looking at a block or animal shows a tooltip with taming / drop info
- Keep an eye on your **⚡ energy bar** — carry cooked food or head home to sleep before you run out mid-dig
- The **secret island** is worth the swim — its mini-games are a fast way to stock up on Gold

---

## Project structure

```
src/
├── core/      blocks, chunk-coordinate math, seeded RNG
├── world/     noise, terrain generation, chunked world with edit diffs, village + secret island builders
├── render/    procedural texture atlas, chunk mesher, day-night sky (with day counter), fish school, bird flock
├── player/    pointer-lock + touch controls, AABB voxel physics
├── interact/  voxel DDA raycast, mining / placing / animal / furniture / eating / sleeping interaction
├── items/     item registry, inventory (200 slots × 200 stack), crafting recipes, chest loot tables
├── entities/  animal AI (wander / follow / stay / ridden), egg-laying chickens, blocky 3D models, entity manager
├── net/       Supabase Realtime transport, remote avatars, multiplayer protocol, player trading, cloud-save API
├── ui/        HUD (energy bar, day timer), inventory / chest / crafting / market / trade / arcade panels, minimap, menus, mobile controls
└── persist/   localStorage save/load, 5-slot MultiWorldStore
```
