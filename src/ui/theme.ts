/**
 * Shared UI theme.
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
`

let installed = false

/** Inject the shared type scale once, before any panel styles are added. */
export function installTheme(): void {
  if (installed) return
  installed = true
  const style = document.createElement('style')
  style.textContent = STYLE
  document.head.appendChild(style)
}
