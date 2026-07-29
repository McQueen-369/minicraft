# Minicraft

A browser-based 3D voxel exploration game built with Three.js and TypeScript.
No assets — terrain, textures, animals, buildings, and UI are all generated procedurally in code.

![Minicraft](https://img.shields.io/badge/built%20with-three.js-049EF4)

## Features

### World Types
Every new world is created as one of two types — pick one on the landing page, and the saved-world list labels each world with the type it was made as (🌍 Terrain World / 🤖 Robot World).

| | 🌍 Terrain World | 🤖 Robot World |
|---|---|---|
| Ground | Grass, dirt, sand | Riveted **metal panelling** over the same dirt and stone |
| Food | Apples from apple trees | **Canned food** — tins with a label on the lid, standing on the ground |
| Night mob | Zombies | **Bad robots** — metal chassis, red visor, antenna lamp |
| Villagers | Villagers | **Robot villagers** — lit face screens and signal antennas (pick them up just the same) |
| Animals | Pigs, sheep, horses… | The same herd rebuilt as **machines**: steel plating, glowing optics, antennas |
| Buildings | Planks, brick, picket fences | **Alloy panelling and hull plate**, glass windows, **metal doors** and **steel railings** |
| Sky | Birds and clouds | Birds, clouds and **saucers** circling overhead with lit rings and tractor beams |
| Everything else | — identical — | Same terrain shape, ores, lava, villages, market, crafting, energy rules and the **Secret Island** |

Both types share one seed-driven generator, so a robot world is the same landscape you would have explored in a terrain world, re-skinned and re-stocked. Saves record their type, so a world always reloads as what it was created as.

### World & Exploration
- **Infinite procedural terrain** — seeded simplex-noise hills, rivers, lakes with sand beaches, streamed in chunks as you explore
- **Expanded render distance** — 12-chunk view radius for wide-open exploration
- **Ambient occlusion & detailed textures** — corner shadows and directional face shading are baked into every chunk, and block textures are drawn at double resolution with a grain-and-relief pass, so terrain reads with real depth under filmic tone mapping
- **Day/night cycle** — a bright sun disc and drifting clouds by day, moon and stars by night; a live HUD timer shows the day count and current phase
- **Villages** — procedurally placed settlements with three furnished cottages (stone plinths, timber-framed brick walls, pitched gable roofs, chimneys and porches), a market stall on a stone forecourt, a covered well, fenced kitchen gardens, lantern-lit stone lanes and villager NPCs. The whole site is levelled and packed down to the natural ground first, so nothing ever floats — over water the village stands on a sand-and-dirt embankment
- **Secret Island** — a hidden dome of land tucked inside a ring-shaped lake a few hundred blocks from spawn, deterministic per world seed. Its arcade plaza is a designed place: a plank courtyard around the campfire, a dashed stone-and-brick ring path, four kiosks on raised podiums lit by lantern posts, a palm grove, a fenced rim with gates on the diagonals, prize plinths and a lighthouse beacon you can spot from the mainland (see below)
- **Carry villagers** — left-click a villager NPC (a robot villager, in a robot world) to pick it up and carry it around; left-click again to set it back down (NPCs are never stored in your bag)
- **Navigation map** — the corner radar tracks you and shows nearby animals, with 🏠/🏝 distance readouts underneath; landmarks off the edge become direction arrows rather than icons pinned to the border. Press M (or tap the radar) for the expanded map, which auto-zooms to frame you, home and the island together, so every marker always sits on its true coordinate, with live coordinates and distances listed below it

### Blocks & Resources
- **12+ block types** — Grass, Dirt, Stone, Sand, Wood, Leaves, Apple Leaves, Planks, Brick, Glass, Fence, Ladder, TNT, Metal Panel, Hull Plate (plus Lava, Canned Food tins and Metal Fencing, which live in the world but are never carried as blocks of their own — fencing is placed and collected as the ordinary Fence item, which takes the local form)
- **Gold Ore** — shiny yellow spots appear on the surface; rich veins run through deep stone layers
- **Diamond Ore** — rare sparkling veins hidden 6+ blocks below the surface; drops Diamond gems used at the market smithy to strengthen your sword
- **Lava** — glowing molten lakes pooled in the deepest stone. They always sit at least 12 blocks below the deepest ore, so breaking into one is the reward for a real dig. Lava lights its own cavern (the mesher skips face shading and occlusion on self-lit blocks, and a warm point light follows you into the chamber), cannot be mined, placed or collected, and burns your energy fast if you fall in — you sink slowly and paddle out with Space, so a scorching costs you stamina, never the session
- **Mystery Boxes** — Common, Rare, and Epic variants found in the wild, each containing random loot
- **Loot chests** — naturally generated on the surface, filled with tools and resources
- **TNT** — every session starts with 200 in your bag. Placing it does *not* light it, so you can stack a charge as high and wide as you like; MINE an unlit stick to start its 2 second fuse (the blast chain-reacts with any TNT it reaches). MINE a stick that is already lit to defuse it and take it back

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

### Robot Residents, Machines & Saucers *(robot worlds)*
- Villages are home to **robot villagers** — plated bodies, lit face screens, signal antennas. **Left-click to pick one up** and carry it around, left-click again to set it down, exactly like a villager
- Every animal is a machine as well: the same pigs, sheep, chickens, rabbits, cats, dogs and horses, steel-plated with glowing optics, a power core and an antenna. Species colours still show through the plating, so the herd stays readable
- Cottages, village houses, the market forecourt and the island plaza are built from **alloy panelling and hull plate** with **glass windows**, **metal doors** (banded blast doors with a porthole and a status lamp) and **steel railings**. Furniture inside is plated to match
- **Saucers** cruise the sky above you: spinning light rings, glass cockpit domes, and soft tractor beams sweeping the panelling below

### Canned Food *(robot worlds)*
- Robot worlds grow no apple trees; instead **canned food tins** stand on the metal ground, easy to spot by their red label
- Every tin carries its **label on the lid**, so you can pick one out from above as well as head-on
- **MINE a tin to open it** — it drops one Canned Food, worth **+45⚡** when eaten (USE with it held)
- Tins also fill robot-world chests and mystery boxes, and the market trader stocks them in either kind of world

### Energy, Food & Sleep
- A ⚡ **energy bar** (0–100) sits above the hotbar — mining costs energy, and at 0 you're too tired to mine
- **Eat food to refuel**: Apple (+20), Cooked Fish (+40), Canned Food (+45), Fish Stew (+80) — right-click with the food held
- **Cook** in the crafting panel: Fish + Wood → Cooked Fish; Cooked Fish + Egg + Apple → Fish Stew
- **Sleep** in a bed (right-click) to jump straight to the next morning with a fully restored bar — the screen dims like closing your eyes, then fades back in at dawn
- Energy, the day count, and island discovery all persist in your save

### Challenge Island & Mini-Games
- Sits inside a ring-shaped lake a few hundred blocks from spawn — a pink **🏝 flag on the map** marks its real coordinates, and the corner radar shows how far away it is
- Its plaza has four glowing arcade kiosks, each a small educational mini-game that pays out item prizes. Every kiosk opens the same way — game badge, the prize on offer, a row of "how to play" chips, one status pill, then the game, and an end-of-round card showing what you scored and won
- **Every challenge starts with a difficulty choice.** Easy, Normal or Hard each spell out both what changes about the game and what the win is worth, before you commit:

  | Tier | Reward | Puzzle | Runner | Math Blaster | Word Wizard |
  |------|--------|--------|--------|--------------|-------------|
  | 🌱 Easy | ×0.5 | 3×3, lightly shuffled | gentle pace, wide gaps | + and − only, 5 lives | short words, 8 lives |
  | ⚖️ Normal | ×1 | 3×3, fully shuffled | standard pace | + − × ÷ mixed, 3 lives | medium words, 6 lives |
  | 🔥 Hard | ×2.5 | **4×4** — fifteen tiles | fast track, tight gaps | bigger numbers and two-step sums, 2 lives | long words, 4 lives, hint hidden until your first mistake |

  Prize bundles are scaled by the tier multiplier, so the same clean round pays five times as much on Hard as on Easy. Every result card offers both **↻ Play again** at the same tier and **⚙ Change difficulty**:
  - 🧩 **Sliding Puzzle** — reorder a shuffled grid; fewer moves win a bigger prize
  - 🏃 **Island Runner** — endless jump-the-obstacle runner; clear the tier's target score to win gold
  - 🎯 **Math Blaster** — shoot the target with the correct answer across a round of ramping arithmetic
  - 🔤 **Word Wizard** — hangman-style word guessing with vocabulary hints drawn from science and geography. **Every round ends with the word's dictionary entry** — the word, its part of speech and a plain-language definition — shown on a win and a loss alike, so the word is the takeaway whether or not you guessed it. The riddle you play against and the definition you leave with are kept deliberately separate: a definition up front would hand over the round, and a riddle as the takeaway would teach nothing
- A couple of bonus Rare Mystery Boxes sit on plinths by the plaza gates for explorers

### Fun Facts & Learning
- Look at any animal, plant, block or item and press **I** (or tap the ⓘ on its nameplate) to open its info card. Under the how-to-play instructions sits a **🔎 Did you know?** panel with a real-world fact about the subject — why leaves are green, why gold never tarnishes, how a horse sleeps standing up, what lava is called before it reaches the surface
- Cards **rotate through their facts**: look at the same sheep again and you get the next one, so repeat visits keep teaching
- The **Word Wizard** kiosk teaches vocabulary the same way: each round closes on a dictionary card defining the word it hid
- Coverage spans the animals (pig, chicken, sheep, rabbit, cat, dog, horse), the plants and foods (leaves, apple trees, wood, grass, apples, wheat, carrots, seeds, eggs, fish, bones) and the materials (stone, dirt, sand, glass, brick, gold, diamond, lava, TNT)

### Look & Readability
- The interface is **glass, not chrome**: panels are dark translucent panes that blur the world behind them, edged with a hairline light stroke and a soft top-edge sheen, over rounded corners and a system UI sans. Nothing is a bevelled grey box
- One set of design tokens in `src/ui/theme.ts` (surfaces, strokes, radii, blur, accents, shadows) drives every panel, so the whole UI shifts together. Panel chrome is sans; monospace is kept only where digits should not jitter — coordinates, the day clock, item counts, room codes
- Where `backdrop-filter` is unsupported the tokens fall back to denser fills, so the world never reads through a panel
- All UI text is driven by one shared fluid type scale (also `src/ui/theme.ts`): a comfortable floor on phones, `vmin` growth on larger screens, and a ceiling so desktop text never turns cartoonish. Short landscape phones and large portrait tablets get their own steps

### Fishing
- Start with a **Fishing Net** in your hotbar
- Aim at water and **right-click** to cast — works if the ray hits an underwater block or crosses the water surface
- Visible **fish schools** swim beneath the surface

### Night Mobs & Combat
- **Zombies rise at night** in a terrain world; a robot world sends **bad robots** instead — same rules, different chassis
- They crumble (or power down) at dawn, chase you meanwhile, and each strike drains 8⚡ energy
- **Attacking is the mining action**: aim at the mob and hold left-click (mobile: hold the red ⛏ button)
- **Every player starts with a Sword** in the bag — swords hit far harder than bare hands
- Defeated mobs drop **2 Gold**, with a 30% chance of a bonus **Diamond**

### Sword Upgrades
- Mine **Diamonds** deep underground, then spend them at the market **smithy**:
  - **Iron Blade** (4 💎) + Sword → **Iron Sword** (double damage) in the crafting menu
  - **Diamond Edge** (8 💎) + Iron Sword → **Diamond Sword** (one-swing kills on any night mob)

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
- Cloud world rows show their world type. Apply `supabase/migrations/0002_world_kind.sql` so the server reports it; until then the type falls back to what this device remembers (and to Terrain World for anything older)

---

## Controls

### Movement & Camera

| Input | Action |
|-------|--------|
| Click canvas | Capture mouse pointer (Esc releases and pauses) |
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
| Left-click unlit TNT | Light its fuse (2 seconds) — placing TNT never lights it |
| Hold left-click on lit TNT | Defuse it and take it back into your bag |
| Right-click | Place held block / open chest / eat held food / sleep in bed / open arcade kiosk / feed or interact with animal |
| Shift + right-click (animal) | Capture tamed animal into bag |
| Right-click ground with capture item | Release animal |
| Right-click tamed chicken with egg ready | Collect the egg |

### UI & Shortcuts

| Key | Action |
|-----|--------|
| **Esc** | **Close whatever is open** — info card, instructions, map, bag, crafting, market, arcade — or resume from the pause screen |
| E | Open / close inventory bag |
| Z | Open / close crafting panel |
| M | Open / close the full map |
| C or Enter | Open chat panel (multiplayer) |
| I (with target in view) | Show item / animal info card, with its fun fact |
| I (nothing targeted) | Open the instructions; press again to close |
| 1 – 9 | Select hotbar slot |
| Scroll wheel | Cycle hotbar selection |

**Every panel is modal.** Opening one releases the mouse pointer so the cursor is visible and its buttons are clickable, freezes gameplay input so W/A/S/D and the hotbar do not leak through to the world underneath, and hands the pointer back to the game when it closes. Losing pointer lock with nothing open is the pause gesture, so the pause screen never appears behind a panel you just opened.

**Mobile / tablet:** virtual joystick (bottom-left) to move, swipe right side to look, JUMP and BAG buttons on-screen.

---

## Tips

- **Gold** appears as yellow flecks on the surface and in deep stone; mine it with a pickaxe
- **Apple trees** show red apples in their canopy — only they drop Apples for taming pigs
- **Fishing net** is in your starting hotbar — aim at water and right-click
- **Horse** is the fastest way to explore. Tame with Wheat, right-click to ride, F to dismount
- **Market** refreshes every real-world hour. Save up Gold and check back for new stock — and clear out your spare blocks on the **Sell** tab while you are there
- The **minimap** (M) marks animals in yellow/gold so you can find tamed ones
- Pressing **I** while looking at a block or animal shows a tooltip with taming / drop info
- Keep an eye on your **⚡ energy bar** — carry cooked food or head home to sleep before you run out mid-dig
- The **secret island** is worth the swim — its mini-games are a fast way to stock up on Gold, and picking **Hard** pays five times what Easy does for the same clean round
- **Dig deep** for lava — but bring food and something to bridge with, and remember Space paddles you out if you fall in
- Press **I** on anything you have not met before: the info card explains how it works *and* teaches you something true about it

---

## Project structure

```
src/
├── core/      blocks, chunk-coordinate math, seeded RNG
├── world/     world kinds (terrain / robot), build palettes, noise, terrain generation, chunked world with edit diffs, village + secret island builders
├── render/    procedural texture atlas, chunk mesher, day-night sky (with day counter), fish school, bird flock, UFO fleet
├── player/    pointer-lock + touch controls, AABB voxel physics
├── interact/  voxel DDA raycast, mining / placing / animal / furniture / eating / sleeping interaction
├── items/     item registry, inventory (200 slots × 200 stack), crafting recipes, chest loot tables
├── entities/  animal AI (wander / follow / stay / ridden), night mobs (zombie / bad robot), egg-laying chickens, blocky 3D models, entity manager
├── net/       Supabase Realtime transport, remote avatars, multiplayer protocol, cloud-save API
├── ui/        HUD (energy bar, day timer), inventory / chest / crafting / market / arcade panels, minimap, menus, mobile controls,
│           info cards + fun facts, challenge difficulty tiers
└── persist/   localStorage save/load (world kind included), 10-slot MultiWorldStore
```
