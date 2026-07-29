/**
 * Shared UI theme: type scale + the glass design tokens every panel is built
 * from.
 *
 * ## Type scale
 *
 * Every panel used to hard-code its own pixel font sizes, which drifted down
 * to 9–13px — fine on a desktop monitor, unreadable on a phone held at arm's
 * length. All UI text now pulls from one fluid scale instead: a comfortable
 * floor for small screens, `vmin` growth for large ones, and a ceiling so
 * desktop text never turns cartoonish.
 *
 * `vmin` (not `vw`) keeps the scale stable across rotation, so a landscape
 * phone gets the same readable floor as a portrait one. Every call site
 * repeats the old size as the `var()` fallback so a panel still renders
 * sensibly if it is mounted before the theme (e.g. in unit tests).
 *
 * ## Glass surfaces
 *
 * The UI used to be built from opaque light-grey boxes with hard bevelled
 * borders — a faithful 90s look that fought the 3D world behind it. Panels now
 * float over the scene instead: dark translucent surfaces, a blur behind them,
 * hairline light strokes and generous rounding. The tokens below are the only
 * place those values live, so the whole UI shifts together.
 *
 * Panel chrome uses a system UI sans; the monospace face is kept only where
 * digits should not jitter (HUD readouts, coordinates, room codes).
 */
const STYLE = `
:root {
  --mc-fs-2xs: clamp(11px, 1.45vmin, 13px);
  --mc-fs-xs: clamp(12.5px, 1.7vmin, 15px);
  --mc-fs-sm: clamp(14px, 1.95vmin, 17px);
  --mc-fs-md: clamp(16px, 2.3vmin, 19px);
  --mc-fs-lg: clamp(18px, 2.7vmin, 22px);
  --mc-fs-xl: clamp(22px, 3.2vmin, 28px);
  --mc-fs-2xl: clamp(28px, 4.2vmin, 36px);
  --mc-fs-3xl: clamp(34px, 6vmin, 52px);

  /* --- typefaces ------------------------------------------------------- */
  --mc-font: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  --mc-font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas,
    'Courier New', monospace;

  /* --- glass surfaces --------------------------------------------------- */
  /* Dialog / panel body. */
  --mc-surface: rgba(19, 23, 31, 0.72);
  /* Docked chrome that sits over the world (hotbar buttons, minimap tags). */
  --mc-surface-soft: rgba(16, 19, 26, 0.52);
  /* A raised block *inside* a panel: rows, slots, inputs. */
  --mc-raised: rgba(255, 255, 255, 0.06);
  --mc-raised-hover: rgba(255, 255, 255, 0.12);
  /* Full-screen scrim behind a modal. */
  --mc-scrim: rgba(6, 8, 12, 0.58);
  --mc-scrim-strong: rgba(6, 8, 12, 0.76);

  --mc-stroke: rgba(255, 255, 255, 0.12);
  --mc-stroke-strong: rgba(255, 255, 255, 0.26);

  --mc-blur: blur(20px) saturate(140%);
  --mc-blur-soft: blur(12px) saturate(130%);

  --mc-radius-xs: 6px;
  --mc-radius-sm: 10px;
  --mc-radius: 16px;
  --mc-radius-lg: 22px;
  --mc-radius-pill: 999px;

  --mc-shadow: 0 24px 64px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.35);
  --mc-shadow-sm: 0 6px 18px rgba(0, 0, 0, 0.35);
  /* Hairline highlight along the top edge — what sells the "pane of glass". */
  --mc-sheen: inset 0 1px 0 rgba(255, 255, 255, 0.14);

  /* --- text ------------------------------------------------------------- */
  --mc-text: #eef2f7;
  --mc-text-dim: rgba(234, 240, 248, 0.66);
  --mc-text-faint: rgba(234, 240, 248, 0.42);

  /* --- accents ---------------------------------------------------------- */
  --mc-accent: #7cd7ff;
  --mc-accent-soft: rgba(124, 215, 255, 0.16);
  --mc-accent-line: rgba(124, 215, 255, 0.55);
  --mc-good: #63dd97;
  --mc-good-soft: rgba(99, 221, 151, 0.18);
  --mc-warn: #ffcc5c;
  --mc-warn-soft: rgba(255, 204, 92, 0.18);
  --mc-bad: #ff8272;
  --mc-bad-soft: rgba(255, 130, 114, 0.18);
  --mc-gold: #ffd77a;

  --mc-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
}
/* Short landscape phones: vertical space is the scarce resource, so trim the
   scale slightly to keep tall panels (crafting, menus) scrollable-but-sane. */
@media (max-height: 430px) {
  :root {
    --mc-fs-2xs: 11px;
    --mc-fs-xs: 12px;
    --mc-fs-sm: 13.5px;
    --mc-fs-md: 15px;
    --mc-fs-lg: 17px;
    --mc-fs-xl: 20px;
    --mc-fs-2xl: 24px;
    --mc-fs-3xl: 30px;
  }
}
/* Large phones / tablets in portrait: vmin is driven by the narrow axis, so
   nudge body text up a step — these screens have the room for it. */
@media (min-width: 600px) and (max-width: 900px) {
  :root {
    --mc-fs-2xs: 13px;
    --mc-fs-xs: 15px;
    --mc-fs-sm: 16.5px;
    --mc-fs-md: 18px;
    --mc-fs-lg: 21px;
  }
}

/* ---------------------------------------------------------------- shared */

/* A floating pane of glass: the base every dialog and popover is built on. */
.mc-glass {
  background: var(--mc-surface);
  -webkit-backdrop-filter: var(--mc-blur);
  backdrop-filter: var(--mc-blur);
  border: 1px solid var(--mc-stroke);
  border-radius: var(--mc-radius);
  box-shadow: var(--mc-shadow), var(--mc-sheen);
  color: var(--mc-text);
  font-family: var(--mc-font);
}

/* Dimmed, blurred backdrop behind a modal pane. */
.mc-scrim {
  background: var(--mc-scrim);
  -webkit-backdrop-filter: var(--mc-blur-soft);
  backdrop-filter: var(--mc-blur-soft);
}

/*
 * Buttons. \`.mc-ui-btn\` is the neutral pill; the modifiers tint it. Every
 * variant keeps the same geometry so mixed rows line up.
 */
.mc-ui-btn {
  font-family: var(--mc-font);
  font-size: var(--mc-fs-sm, 14px);
  font-weight: 600;
  letter-spacing: 0.2px;
  color: var(--mc-text);
  background: var(--mc-raised);
  border: 1px solid var(--mc-stroke);
  border-radius: var(--mc-radius-sm);
  padding: 9px 16px;
  cursor: pointer;
  transition: background 0.16s var(--mc-ease), border-color 0.16s var(--mc-ease),
    transform 0.1s var(--mc-ease);
  -webkit-tap-highlight-color: transparent;
}
.mc-ui-btn:hover { background: var(--mc-raised-hover); border-color: var(--mc-stroke-strong); }
.mc-ui-btn:active { transform: translateY(1px); }
.mc-ui-btn:disabled { opacity: 0.38; cursor: default; transform: none; }
.mc-ui-btn.primary {
  background: var(--mc-good-soft);
  border-color: rgba(99, 221, 151, 0.5);
  color: #d8ffe8;
}
.mc-ui-btn.primary:hover:not(:disabled) {
  background: rgba(99, 221, 151, 0.3);
  border-color: var(--mc-good);
}
.mc-ui-btn.accent {
  background: var(--mc-accent-soft);
  border-color: var(--mc-accent-line);
  color: #dcf3ff;
}
.mc-ui-btn.accent:hover:not(:disabled) { background: rgba(124, 215, 255, 0.28); }
.mc-ui-btn.ghost { background: transparent; }
.mc-ui-btn.ghost:hover { background: var(--mc-raised); }

/* Close affordance shared by every dismissible panel. */
.mc-close-btn {
  flex: 0 0 auto;
  display: flex; align-items: center; justify-content: center;
  width: 2em; height: 2em; padding: 0;
  font-family: var(--mc-font); font-size: var(--mc-fs-md, 16px); line-height: 1;
  color: var(--mc-text-dim);
  background: var(--mc-raised);
  border: 1px solid var(--mc-stroke);
  border-radius: var(--mc-radius-pill);
  cursor: pointer;
  transition: background 0.16s var(--mc-ease), color 0.16s var(--mc-ease);
  -webkit-tap-highlight-color: transparent;
}
.mc-close-btn:hover, .mc-close-btn:active {
  background: var(--mc-bad-soft); border-color: rgba(255,130,114,0.45); color: #ffd9d3;
}

/* Item slot / tile: an inset well that the pixel-art icon sits in. */
.mc-tile {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--mc-stroke);
  border-radius: var(--mc-radius-sm);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07);
}

/* Scrollbars inside panels: thin and unobtrusive rather than OS-chrome grey. */
.mc-glass ::-webkit-scrollbar, .mc-glass::-webkit-scrollbar { width: 8px; height: 8px; }
.mc-glass ::-webkit-scrollbar-track, .mc-glass::-webkit-scrollbar-track { background: transparent; }
.mc-glass ::-webkit-scrollbar-thumb, .mc-glass::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.16); border-radius: var(--mc-radius-pill);
}
.mc-glass ::-webkit-scrollbar-thumb:hover, .mc-glass::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.28);
}

/* Panels fade + lift in rather than snapping on. */
@keyframes mc-pane-in {
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: no-preference) {
  .mc-pane-in { animation: mc-pane-in 0.18s var(--mc-ease); }
}

/*
 * Backdrop blur is expensive on low-end mobile GPUs and simply unsupported on
 * a few older browsers. Where it is missing the translucent surfaces would let
 * the world read straight through, so fall back to denser fills.
 */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  :root {
    --mc-surface: rgba(19, 23, 31, 0.94);
    --mc-surface-soft: rgba(16, 19, 26, 0.82);
    --mc-scrim: rgba(6, 8, 12, 0.78);
    --mc-scrim-strong: rgba(6, 8, 12, 0.9);
  }
}
`

/**
 * Replay a pane's entrance animation.
 *
 * Panels are built once and toggled with `display`, which does not re-run a
 * CSS animation — so the class is dropped, layout is flushed, and it goes back
 * on. Call this right after making the pane visible.
 */
export function revealPane(pane: HTMLElement): void {
  pane.classList.remove('mc-pane-in')
  void pane.offsetWidth
  pane.classList.add('mc-pane-in')
}

let installed = false

/** Inject the shared type scale + glass tokens once, before any panel styles. */
export function installTheme(): void {
  if (installed) return
  installed = true
  const style = document.createElement('style')
  style.textContent = STYLE
  document.head.appendChild(style)
}
