# Minicraft

A browser-based Minecraft-style voxel game built from scratch with Three.js + TypeScript.
No assets, no engine — terrain, textures, animals, and UI are all generated procedurally in code.

![Minicraft](https://img.shields.io/badge/built%20with-three.js-049EF4)

## Features

- **Infinite terrain** — seeded simplex-noise hills, lakes with sand beaches, trees, streamed in 16×96×16 chunks as you explore
- **Mine & build** — hold left-click to mine (tools matter!), right-click to place; 10 block types
- **Inventory** — 200-slot inventory with stacks up to 200; open with E or the bag button; hotbar slots 1–9
- **Tools & chests** — wood/stone pickaxes, axe, and shears spawn in naturally generated loot chests; chests store items
- **Animals** — pigs, chickens, sheep, rabbits, cats, and dogs wander the world. Feed them to tame (pigs→carrot, chickens→seeds, sheep→wheat, rabbits→apple, cats→fish, dogs→bone), tell them to follow or stay, capture them to carry
- **Day-night cycle** — 30-minute days and 20-minute nights with sunrises, sunsets, and starry-dark nights; a live HUD timer shows time remaining in the current phase
- **5 local save slots** — keep up to 5 named worlds per browser; your existing save is automatically migrated to Slot 1
- **Player profiles & cloud saves** — create a profile (username + password, no email) and your worlds save to Supabase every 30 seconds; play them from any device, keep as many named worlds as you like
- **Online multiplayer** — host a room from any local or cloud world and friends join with a code from anywhere, via Supabase Realtime; block edits, players, chests, and animals all sync

## Run it

```bash
npm install
npm run dev        # open http://localhost:5173
```

Other commands: `npm run test:run` (unit tests), `npm run build` (production build into dist/).

### Multiplayer setup

Copy `.env.example` to `.env.local` (already contains working publishable keys for the
shared Supabase project — these are client-side keys, safe in the browser):

```bash
cp .env.example .env.local
```

Without `.env.local` the game runs in singleplayer (localStorage saves) only.

- **Host** opens a room from a local world slot and shows a room code (e.g. `MC-4821`)
- Friends pick **Join Game** and enter the code — they spawn at your world's spawn point
- The host's browser is the source of truth: it simulates animals and saves the world

### Profiles & cloud worlds

Click **Create Profile** on the menu (username + password — no email involved) to
save worlds to the cloud instead of the browser:

- **Create New World** makes a named world stored in your profile; it autosaves every
  30 seconds and on quit, and shows up on any device you sign in from
- **Play** / **Host** / **✕** next to each world load it, host it online, or delete it
- Hosting a profile world saves the multiplayer session back to the **host's** profile —
  guests with their own profiles can join with the room code, but only the initiator's
  copy of the world is written
- Signed-in players appear in multiplayer under their profile username
- Worlds live in `minicraft_*` tables in the shared Supabase project. Direct table access is blocked;
  the client goes through `SECURITY DEFINER` RPCs that check a session token
  (`supabase/migrations/` has the full schema). Tokens expire after 30 days

Guests without a profile get up to 5 local world slots in the browser (one per slot).

## Controls

| Input | Action |
|---|---|
| Click | capture mouse (Esc releases) |
| WASD / Arrow keys | move |
| Space | jump |
| F | toggle fly mode (Space/Shift = up/down) |
| E | open/close inventory |
| Hold left-click | mine the targeted block |
| Right-click | place held block / open chest / use item |
| 1–9 or scroll wheel | select hotbar slot |
| Right-click animal with its food | tame it |
| Right-click your tamed animal | toggle follow / stay |
| Shift + right-click your animal | capture it into an inventory item |
| Right-click ground with captured animal | release it |

**Mobile / iPad:** virtual joystick (bottom-left) to move, swipe right side to look, JUMP and BAG buttons on-screen. Controls appear automatically when a touch device is detected.

Food and tools are found in loot chests scattered across the world (watch for the
wooden boxes on the surface). Stone is slow to mine by hand — find a pickaxe first.

## Project structure

```
src/
├── core/      blocks, chunk-coordinate math, seeded RNG
├── world/     noise, terrain generation, chunked world with edit diffs
├── render/    procedural texture atlas, chunk mesher (hidden-face culling), day-night sky
├── player/    pointer-lock + touch controls, AABB voxel physics
├── interact/  voxel DDA raycast, mining/placing/animal interaction
├── items/     item registry, inventory (200 slots x 200 stack), chest loot
├── entities/  animal AI (wander/follow/stay), blocky 3D models, manager
├── net/       message protocol, Supabase Realtime transport, remote avatars, profile/cloud-save API
├── ui/        HUD (hotbar, day-night timer, mining bar), inventory/chest panels, menus, mobile controls, item icons
└── persist/   localStorage save/load, 5-slot MultiWorldStore with legacy migration
```

All gameplay logic (terrain, meshing, physics, raycast, inventory, AI, protocol,
persistence, menus) is pure and unit-tested — `npm run test:run` runs 80+ tests in node.
