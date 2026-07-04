---
name: verify
description: Build, launch, and drive minicraft in a headless browser to verify gameplay changes end-to-end.
---

# Verifying minicraft changes

Minicraft is a three.js voxel game (Vite + TypeScript, no framework). The
surface is the browser: menu DOM + a WebGL canvas driven by pointer lock.

## Launch

```bash
npm install
npm run dev -- --port 5199 --strictPort   # background it
```

Drive with Playwright against a pre-installed Chromium
(`/opt/pw-browsers/chromium-*/chrome-linux/chrome` in remote sessions).
Launch with `args: ['--no-proxy-server']` — otherwise localhost is routed
through the outbound proxy and the page never loads.

## Gotchas that cost time

- `window.__minicraft` is an intentional debug handle exposed by `main.ts`.
- Menu: click `text=Create New World`, then the **exact** `Create` button
  (`getByRole('button', { name: 'Create', exact: true })`) — a plain
  `has-text("Create")` matches the "Create Profile" auth button instead.
- Replaying a saved slot: `▶ Play` → `▶ Play without profile`.
- World readiness: wait until the HUD text contains `fps` and no longer
  contains `generating world`.
- Pointer lock works headless (click the canvas), but **Escape does not
  release it** — call `document.exitPointerLock()` via `page.evaluate` to
  reach the pause menu.
- Camera look: `page.mouse.move` produces no movementX under lock. Dispatch
  synthetic `mousemove` events with `movementX/Y` defined via
  `Object.defineProperty`.
- Place/use = `mousedown` with `button: 2` dispatched on `document`;
  mine = hold `button: 0`. Hotbar via `Digit1..9`, bag via `KeyE`.
- The bag/hotbar renders item names on canvas — assert on screenshots, not
  `innerText`.
- To give the player arbitrary items, quit via `Save & Quit to Menu`, edit
  the JSON in `localStorage['minicraft-slot-v1-0']` (`inventory[i] =
  { itemId, count }`), reload, and replay the slot — this exercises the real
  persistence path.

## Touch / mobile controls

- Emulate with a Playwright context `{ hasTouch: true }` — `isTouchDevice`
  checks `maxTouchPoints`, which makes the mobile joystick/buttons appear and
  bypasses pointer lock entirely.
- `page.touchscreen.tap` twice is too slow for the game's 300ms double-tap
  window (protocol round-trips add ~400ms). Dispatch both taps in one
  `page.evaluate`: build `new Touch({identifier, target, clientX, clientY})`
  and fire `touchstart`/`touchend` `TouchEvent`s on `.mc-look-zone`, ~120ms
  apart.
- Tap on the look zone = right-click (place/use/mount); double-tap =
  dismount horse / store targeted animal.
- To stage an animal, use the `window.__minicraft` handle:
  `session.entities.release(kind, pos, playerId)` spawns it tamed; set
  `mode = 'stay'` so it doesn't wander. Aim by setting `controls.yaw/pitch`
  from the eye→animal vector (pitch negative = down), then confirm with
  `session.interaction.targetAnimal?.kind` before tapping.

## Flows worth driving

- Fresh world spawn (starter house), HUD, minimap.
- Place a block: lock pointer, pitch down (~300 movementY), right-click.
- TNT: place → "TNT primed" toast → 2s fuse → crater + "💥 BOOM!" toast.
- Glass: place and confirm the world shows through the pane centers.
