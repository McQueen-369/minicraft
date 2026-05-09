# Session Tracker — Project Documentation

> A Chrome browser extension for self-capture of browsing behaviour: clicks, mouse movement, scroll depth, time on page, and click path — across any website, no code injection required.
>
> **Status**: Planning phase — no code yet
> **Related project**: [`../Heatmap tracker/`](../Heatmap%20tracker/) — existing script-tag tracker and viewer

---

## 1. Purpose

A general-purpose self-capture tool for anyone who needs to record their own browsing behaviour during a research session, usability evaluation, competitive analysis, or any isolated review. Not restricted to UX research.

**Key difference from the existing tracker**: No `<script>` tag injection needed. The person installs the extension once and activates it from the Chrome toolbar — works on any page, any domain.

---

## 2. Design Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Browser | Chrome first, others later | Fastest to ship; Manifest V3 is well-documented |
| Who runs it | The person themselves (self-capture) | No participant setup; researcher/evaluator tracks their own session |
| Session scope | Multi-domain | Follows the user across any navigation within one session |
| Viewer | `heatmap-viewer.html` bundled inside the extension | No external file to manage — full viewer accessible at `chrome-extension://[id]/viewer/viewer.html` |
| Export format | Same ZIP format as existing tracker | Full compatibility with `heatmap-viewer.html` for deep analysis |
| Architecture | Approach A — thin content script + background service worker | Only pattern that handles multi-domain sessions correctly without hitting storage limits |

---

## 3. Architecture

Four components, each with a single responsibility:

```text
┌─────────────────────────────────────────────────────┐
│  Chrome Browser                                      │
│                                                      │
│  ┌──────────────────┐                               │
│  │  Content Script  │  (injected per page)          │
│  │                  │                               │
│  │  • mousemove     │                               │
│  │  • click         │──chrome.runtime.sendMessage──▶│
│  │  • scroll        │                               │
│  │  • dwell time    │                               │
│  │  • navigation    │                               │
│  └──────────────────┘                               │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Background Service Worker                       │ │
│  │                                                  │ │
│  │  • Receives events from all tabs/origins         │ │
│  │  • Owns session ID (cross-origin continuity)     │ │
│  │  • Stores data in IndexedDB (extension context)  │ │
│  │  • Screenshots via chrome.tabs.captureVisibleTab │ │
│  │  • Assembles ZIP on export                       │ │
│  │  • Generates heatmap overlay images              │ │
│  └──────────────────────────┬───────────────────────┘ │
│                             │                         │
│              ┌──────────────┴──────────────┐          │
│              ▼                             ▼          │
│  ┌───────────────────┐      ┌──────────────────────┐  │
│  │  Toolbar Popup    │      │  Bundled Viewer       │  │
│  │                   │      │  (new tab)            │  │
│  │  • Start / Stop  │      │  • Full heatmap view  │  │
│  │  • View ────────▶│      │  • Click path flow    │  │
│  │  • Download      │      │  • All 4 heatmap types│  │
│  └──────────────────┘      │  • PDF / CSV export   │  │
│                                │  • Session history    │  │
│                             └──────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Data Flow

```text
Content Script ──events──▶ Background SW ──stores──▶ IndexedDB
                                                         │
                                              on export  ▼
                                                        ZIP ──▶ download to disk
                                                         │
                                                         ▼
                                             Bundled Viewer (new tab)
                                             chrome-extension://[id]/viewer/viewer.html
                                             (full heatmap-viewer.html experience,
                                              no external file needed)
```

---

## 4. What Gets Captured

| Data | Sampling | Notes |
| --- | --- | --- |
| Mouse movement | Every 50ms | x/y relative to document + viewport |
| Clicks | Every click | Includes element tag, id, classes, text |
| Scroll position | Every 200ms | scrollY, viewport size, page height |
| Time on page | Continuous | Dwell time per URL |
| Screenshots | On page load (+1.5s delay) | Via `chrome.tabs.captureVisibleTab` |
| Navigation | On tab URL change | Cross-domain, same session |
| Click path | Derived | Sequence of clicks across pages in session |

---

## 5. Export Format

ZIP compatible with the existing `heatmap-viewer.html`. Same structure:

```text
heatmap-session-<timestamp>.zip
├── metadata.json          Session summary, pages visited, duration
├── clicks.json
├── mousemoves.json
├── scrolls.json
├── raw-data.csv
├── screenshots/
│   └── <safe_page_name>.png
└── heatmaps/
    ├── clicks_<page>.png
    └── movement_<page>.png
```

---

## 6. Code Reuse from Existing Tracker

| Component | Source | Reuse plan |
| --- | --- | --- |
| Event schema (click, mousemove, scroll) | `heatmap-tracker.js` | Reuse directly — identical structure |
| Heatmap rendering algorithm | `heatmap-tracker.js` lines 320–397 | Port to background service worker |
| ZIP export logic | `heatmap-tracker.js` lines 399–604 | Port to background service worker |
| Sampling rates (CFG object) | `heatmap-tracker.js` lines 13–21 | Reuse as extension config |
| Viewer (heatmap-viewer.html) | `heatmap-viewer.html` | Bundled as `viewer/viewer.html` inside extension — no changes to logic |
| JSZip library | CDN in heatmap-viewer.html | Bundled locally as `vendor/jszip.min.js` — no CDN dependency |
| jsPDF library | CDN in heatmap-viewer.html | Bundled locally as `vendor/jspdf.umd.min.js` — no CDN dependency |

---

## 7. Planned File Structure

```text
Heatmap extension/
├── project.md             This file
├── manifest.json          Chrome extension manifest (MV3)
├── background/
│   └── service-worker.js  Session mgmt, storage, screenshots, ZIP, heatmap render
├── content/
│   └── tracker.js         Event capture, sends to background
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── viewer/
│   └── viewer.html        Full viewer — heatmap-viewer.html ported into extension
│                          (CDN refs replaced with local vendor/ paths)
├── vendor/
│   ├── jszip.min.js       Bundled locally (was CDN in original viewer)
│   └── jspdf.umd.min.js   Bundled locally (was CDN in original viewer)
└── icons/
    └── icon-*.png         16, 32, 48, 128px
```

---

## 8. Popup UI

The popup has three distinct states. Only the header colour and primary button change — layout never shifts.

| State | Header | Buttons shown |
| --- | --- | --- |
| **Idle** | Dark, grey dot | ▶ Start Session only |
| **Recording** | Dark, blinking green dot | ⏹ Stop Session only |
| **Session ready** | Dark, grey dot | ▶ Start New Session + View + Download |

- **Idle**: single button — no distractions on first launch
- **Recording**: black header unchanged; blinking green dot in header is the only recording indicator; one button to stop
- **Session ready**: all three buttons appear together once the session is saved
- **View** opens the bundled viewer as a new tab — full session history, heatmaps, export
- **Download** always downloads the most recent session directly
- **Chrome toolbar icon badge** turns green while recording — visible without opening the popup

### Session History

- Last **10 sessions** stored in extension IndexedDB
- 11th session automatically evicts the oldest (same behaviour as existing viewer)
- Full history accessible via **View** → bundled viewer
- Sessions can be renamed, deleted, or cleared from within the viewer

---

## 9. Session Flow

1. User installs the extension in Chrome
2. User clicks the toolbar icon → popup opens (Idle state)
3. User clicks **Start Session** → background SW generates a session ID, begins listening; popup transitions to Recording state; toolbar badge turns green
4. Content script is injected into the current active tab; captures events and forwards to background
5. As the user navigates within the same tab (same or different domains), new content scripts are injected per page. **New tabs opened mid-session are not tracked in v1** — tracking follows a single tab.
6. Background SW captures a screenshot ~1.5s after each page load
7. User clicks **Stop Session** in popup → tracking ceases; session saved to IndexedDB; popup transitions to Session ready state
8. User clicks **Download** → background SW assembles ZIP for the most recent session, triggers download
9. User clicks **View** → opens bundled viewer (`chrome-extension://[id]/viewer/viewer.html`) showing full session history

---

## 10. Privacy & Compliance

### Data Storage Guarantee

All captured data stays on the user's machine. There is no backend, no cloud sync, no external server of any kind.

| Data | Where it lives | When it leaves the machine |
| --- | --- | --- |
| Events (clicks, moves, scrolls) | Extension's IndexedDB (local) | Only when user explicitly exports a ZIP |
| Screenshots | Extension's IndexedDB (local) | Only when user explicitly exports a ZIP |
| Session metadata | Extension's IndexedDB (local) | Only when user explicitly exports a ZIP |
| ZIP export | User's local Downloads folder | Never — user controls what they do with it |

No telemetry, no analytics, no crash reporting, no remote logging is built into the extension.

### Explicit Consent & Control

- **Tracking is always opt-in** — the extension only captures when the user explicitly clicks **Start Session**. It does not run passively in the background.
- **Clear session data** — user can delete all stored sessions from within the extension at any time.
- **Visual indicator** — a badge on the extension icon shows when tracking is active; no silent capture.
- **Scoped to user-initiated sessions** — content script is injected only after the user starts a session, not on every page load by default.

### Chrome Web Store Permissions

Chrome Web Store requires justification for every sensitive permission:

| Permission | Reason | Sensitivity |
| --- | --- | --- |
| `activeTab` | Inject content script into the current tab when user starts a session | Medium — scoped to active tab only |
| `scripting` | Programmatically inject tracker content script (MV3 requirement) | Medium |
| `tabs` | Listen for navigation events (URL changes) to track page transitions within a session | Medium |
| `downloads` | Trigger ZIP file download to user's local machine | Low |
| `storage` | Persist extension state (is session running, session ID) across popup open/close | Low |
| `<all_urls>` host permission | Content script must work on any domain to support multi-domain sessions | **High** — requires explicit Store justification |

> **Note on `<all_urls>`**: This broad host permission is scrutinised heavily by Chrome Web Store reviewers. The Store listing must clearly state: (1) data never leaves the device, (2) tracking is always user-initiated, (3) there is no passive background capture.

### Chrome Web Store Submission Checklist

- [ ] **Privacy policy** — required for any extension that handles browsing data. Must state: data stays local, no transmission to any server, user controls all exports.
- [ ] **Single purpose description** — clearly describe the one thing the extension does (session behaviour capture) with no ambiguity.
- [ ] **Permission justifications** — written explanation for `<all_urls>` and `scripting` submitted during Store review.
- [ ] **No remote code** — MV3 already prohibits remotely-fetched scripts; bundling vendor libs in `vendor/` satisfies this requirement.

### Content Security Policy (MV3)

MV3 enforces strict CSP by default — no inline scripts, no dynamic code execution, no remote script loading. All JavaScript must live in separate `.js` files (no inline `<script>` blocks in HTML). The viewer port from `heatmap-viewer.html` must comply with this. This is a platform-level security guarantee, not something we need to implement ourselves.

---

## 11. Out of Scope (v1)

- Firefox / Safari support (v2+)
- Live heatmap overlay on the page while tracking
- Multi-session aggregation / overlay
- Touch / mobile events
- Incognito mode support (requires explicit permission flag in manifest)
- Cloud sync or backend storage
- Side panel UI (Chrome 114+ SidePanel API) — can layer in later

---

## 12. Deferred Decisions (v2+)

- **Keyboard shortcut** — mirroring the current `Ctrl+Shift+H` pattern; deferred to v2
- **Multi-tab tracking** — follow the user across multiple open tabs in one session; deferred to v2
- **Live stats in popup** — click counter, page count, elapsed time; decided against for v1 to keep popup minimal
