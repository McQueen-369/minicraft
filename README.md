# Minicraft

A browser-based Minecraft-style voxel game built from scratch with Three.js + TypeScript.
No assets, no engine — terrain, textures, animals, and UI are all generated procedurally in code.

![Minicraft](https://img.shields.io/badge/built%20with-three.js-049EF4)

## Features

- **Infinite terrain** — seeded simplex-noise hills, lakes with sand beaches, trees, streamed in 16×96×16 chunks as you explore
- **Mine & build** — hold left-click to mine (tools matter!), right-click to place; 10 block types
- **Survival inventory** — broken blocks drop into a 36-slot inventory; you can only place what you've collected
- **Tools & chests** — wood/stone pickaxes, axe, and shears spawn in naturally generated loot chests; chests store items and can be crafted… well, placed
- **Animals** — pigs, chickens, and sheep wander the world. Feed them their favorite food to tame them (they'll follow you), tell them to stay, or capture them into your pocket and release them at home
- **Day-night cycle** — 4-minute days with sunrises, sunsets, and starry-dark nights
- **Saving** — the world (edits, inventory, chests, animals, time of day) auto-saves to your browser every 10 seconds
- **Player profiles & cloud saves** — create a profile (username + password, no email) and your worlds save to Supabase every 30 seconds; play them from any device, keep as many named worlds as you like
- **Online multiplayer** — host a room and friends join with a code from anywhere, via Supabase Realtime; block edits, players, chests, and animals all sync. Host a world from your profile and the whole multiplayer session is saved back to it

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

- **Host Online Game** starts your saved world and shows a room code (e.g. `MC-4821`)
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
- Worlds live in `minicraft_*` tables in the shared Supabase project (the same one the
  other deadline-dash games use, with separate tables). Direct table access is blocked;
  the client goes through `SECURITY DEFINER` RPCs that check a session token
  (`supabase/migrations/` has the full schema). Tokens expire after 30 days

Guests without a profile keep the old behaviour: one local world per browser.

## Controls

| Input | Action |
|---|---|
| Click | capture mouse (Esc releases) |
| WASD + Space | move + jump |
| F | toggle fly mode (Space/Shift = up/down) |
| Hold left-click | mine the targeted block |
| Right-click | place held block / open chest / use item |
| 1–9 or scroll wheel | select hotbar slot |
| E | open/close inventory |
| Right-click animal with its food | tame it (pig→carrot, chicken→seeds, sheep→wheat) |
| Right-click your tamed animal | toggle follow / stay |
| Shift + right-click your animal | capture it into an inventory item |
| Right-click ground with captured animal | release it |

Food and tools are found in loot chests scattered across the world (watch for the
wooden boxes on the surface). Stone is slow to mine by hand — find a pickaxe first.

## Project structure

```
src/
├── core/      blocks, chunk-coordinate math, seeded RNG
├── world/     noise, terrain generation, chunked world with edit diffs
├── render/    procedural texture atlas, chunk mesher (hidden-face culling), day-night sky
├── player/    pointer-lock controls, AABB voxel physics
├── interact/  voxel DDA raycast, mining/placing/animal interaction
├── items/     item registry, inventory, chest loot
├── entities/  animal AI (wander/follow/stay), blocky models, manager
├── net/       message protocol, Supabase Realtime transport, remote avatars, profile/cloud-save API
├── ui/        HUD, inventory/chest panels, menus, item icons
└── persist/   localStorage save/load
```

All gameplay logic (terrain, meshing, physics, raycast, inventory, AI, protocol,
persistence, menus) is pure and unit-tested — `npm run test:run` runs 80+ tests in node.
