# Session Tracker Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome MV3 extension that records clicks, mouse movement, scroll depth, time on page, and screenshots across any website, packages the data into a ZIP compatible with the existing `heatmap-viewer.html`, and provides a minimal 3-state popup UI with no backend or cloud dependency.

**Architecture:** A thin content script captures raw events per page and forwards them via `chrome.runtime.sendMessage` to a background service worker that owns the session, stores all data in extension-context IndexedDB, takes screenshots via `chrome.tabs.captureVisibleTab`, and assembles the ZIP on Stop. The bundled viewer (`viewer/viewer.html`) is the ported `heatmap-viewer.html` with CDN refs replaced by local `vendor/` paths and inline scripts extracted to comply with MV3 CSP.

**Tech Stack:** Chrome Manifest V3, vanilla JS (no build step), IndexedDB, OffscreenCanvas, JSZip 3.10.1 (local), jsPDF 2.5.1 (local), `chrome.tabs`, `chrome.scripting`, `chrome.downloads`, `chrome.storage.local`

---

## File Map

| File | Action | Responsibility |
| --- | --- | --- |
| `manifest.json` | Create | Extension identity, permissions, entry points |
| `background/service-worker.js` | Create | Session state, IndexedDB, screenshots, heatmap render, ZIP, badge |
| `content/tracker.js` | Create | Event capture (mousemove, click, scroll, dwell), forwards to SW |
| `popup/popup.html` | Create | 3-state UI shell (no inline script) |
| `popup/popup.css` | Create | Minimal popup styles |
| `popup/popup.js` | Create | Popup logic — reads state, dispatches Start/Stop/Download/View |
| `viewer/viewer.html` | Create | Ported heatmap-viewer.html — CDN refs → local vendor/, inline JS → viewer.js |
| `viewer/viewer.js` | Create | Extracted inline script block from heatmap-viewer.html |
| `vendor/jszip.min.js` | Download | JSZip 3.10.1 — bundled, replaces CDN |
| `vendor/jspdf.umd.min.js` | Download | jsPDF 2.5.1 — bundled, replaces CDN |
| `icons/icon-16.png` | Create | Toolbar icon (placeholder, replace with real art later) |
| `icons/icon-32.png` | Create | Toolbar icon |
| `icons/icon-48.png` | Create | Extension management icon |
| `icons/icon-128.png` | Create | Chrome Web Store icon |

---

## Task 1: Extension Scaffold

**Files:**
- Create: `manifest.json`
- Create: `background/service-worker.js` (stub)
- Create: `content/tracker.js` (stub)
- Create: `popup/popup.html` (stub)
- Create: `popup/popup.css` (empty)
- Create: `popup/popup.js` (stub)
- Create: `icons/icon-16.png` through `icons/icon-128.png` (placeholders)

- [ ] **Step 1: Create the directory structure**

```bash
cd "/Users/maggiechau/Documents/_Claude/Heatmap/Heatmap extension"
mkdir -p background content popup viewer vendor icons
```

- [ ] **Step 2: Create `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Session Tracker",
  "version": "1.0.0",
  "description": "Record your own browsing session — clicks, heatmap, scroll depth, and time on page. All data stays local.",
  "permissions": [
    "activeTab",
    "scripting",
    "tabs",
    "downloads",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "content_scripts": [],
  "web_accessible_resources": [
    {
      "resources": ["viewer/viewer.html", "viewer/viewer.js", "vendor/jszip.min.js", "vendor/jspdf.umd.min.js"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

- [ ] **Step 3: Create icon placeholders**

Run this script to generate minimal valid PNGs (1×1 transparent PNG, base64 decoded):

```bash
# Minimal valid 1×1 transparent PNG (67 bytes)
ICON_B64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

cd "/Users/maggiechau/Documents/_Claude/Heatmap/Heatmap extension/icons"
echo "$ICON_B64" | base64 -d > icon-16.png
echo "$ICON_B64" | base64 -d > icon-32.png
echo "$ICON_B64" | base64 -d > icon-48.png
echo "$ICON_B64" | base64 -d > icon-128.png
```

- [ ] **Step 4: Create stub service worker**

Create `background/service-worker.js`:

```js
'use strict';

// Stub — full implementation in Task 4
chrome.runtime.onInstalled.addListener(() => {
  console.log('[SessionTracker] installed');
});
```

- [ ] **Step 5: Create stub content script**

Create `content/tracker.js`:

```js
'use strict';
// Stub — full implementation in Task 3
console.log('[SessionTracker] content script loaded');
```

- [ ] **Step 6: Create stub popup files**

Create `popup/popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="popup.css">
  <title>Session Tracker</title>
</head>
<body>
  <div id="app">Loading…</div>
  <script src="popup.js"></script>
</body>
</html>
```

Create `popup/popup.css` (empty file — styles added in Task 5).

Create `popup/popup.js`:

```js
'use strict';
// Stub — full implementation in Task 5
document.getElementById('app').textContent = 'Session Tracker';
```

- [ ] **Step 7: Load the extension in Chrome to verify scaffold loads**

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select `/Users/maggiechau/Documents/_Claude/Heatmap/Heatmap extension`
4. Extension should appear with no errors in the card
5. Click the extension icon → popup should show "Session Tracker"
6. Check `chrome://extensions` → click **Service Worker** link → console should show `[SessionTracker] installed`

Expected: No red error banners, popup opens, service worker console shows install log.

- [ ] **Step 8: Commit**

```bash
cd "/Users/maggiechau/Documents/_Claude/Heatmap/Heatmap extension"
git -C "/Users/maggiechau/Documents/_Claude" init 2>/dev/null || true
git -C "/Users/maggiechau/Documents/_Claude" add "Heatmap/Heatmap extension/"
git -C "/Users/maggiechau/Documents/_Claude" commit -m "chore: scaffold Session Tracker extension (MV3)"
```

---

## Task 2: Bundle Vendor Libraries

**Files:**
- Create: `vendor/jszip.min.js`
- Create: `vendor/jspdf.umd.min.js`

- [ ] **Step 1: Download JSZip 3.10.1**

```bash
cd "/Users/maggiechau/Documents/_Claude/Heatmap/Heatmap extension/vendor"
curl -L "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" -o jszip.min.js
```

Expected: `jszip.min.js` exists and is ~100KB.

- [ ] **Step 2: Verify JSZip downloaded correctly**

```bash
wc -c "/Users/maggiechau/Documents/_Claude/Heatmap/Heatmap extension/vendor/jszip.min.js"
```

Expected: output shows a number greater than 50000.

- [ ] **Step 3: Download jsPDF 2.5.1 UMD build**

```bash
cd "/Users/maggiechau/Documents/_Claude/Heatmap/Heatmap extension/vendor"
curl -L "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" -o jspdf.umd.min.js
```

Expected: `jspdf.umd.min.js` exists and is ~250KB.

- [ ] **Step 4: Verify jsPDF downloaded correctly**

```bash
wc -c "/Users/maggiechau/Documents/_Claude/Heatmap/Heatmap extension/vendor/jspdf.umd.min.js"
```

Expected: output shows a number greater than 200000.

- [ ] **Step 5: Commit**

```bash
git -C "/Users/maggiechau/Documents/_Claude" add "Heatmap/Heatmap extension/vendor/"
git -C "/Users/maggiechau/Documents/_Claude" commit -m "chore: bundle JSZip 3.10.1 and jsPDF 2.5.1 locally"
```

---

## Task 3: Content Script

**Files:**
- Modify: `content/tracker.js` (replace stub with full implementation)

The content script is injected into the active tab only when a session is running. It captures mousemove, click, and scroll events — mirroring the schema from `heatmap-tracker.js` lines 173–248 — and forwards each buffer to the background service worker every 3 seconds. It never stores data locally; all storage is in the background SW.

- [ ] **Step 1: Replace `content/tracker.js` with the full implementation**

```js
'use strict';

const CFG = {
  MOUSE_SAMPLE_MS: 50,
  SCROLL_SAMPLE_MS: 200,
  FLUSH_INTERVAL_MS: 3000,
};

let sessionId = null;
let pageUrl = location.href;
let pageStart = Date.now();
let tracking = false;
let lastMouseTime = 0;
let lastScrollTime = 0;
let mouseBuffer = [];
let clickBuffer = [];
let scrollBuffer = [];
let flushTimer = null;

function scrollHeight() {
  return Math.max(
    document.body.scrollHeight || 0,
    document.documentElement.scrollHeight || 0,
    document.body.offsetHeight || 0,
    document.documentElement.offsetHeight || 0
  );
}

function onMouseMove(e) {
  const now = Date.now();
  if (now - lastMouseTime < CFG.MOUSE_SAMPLE_MS) return;
  lastMouseTime = now;
  mouseBuffer.push({
    sessionId,
    type: 'mousemove',
    page: pageUrl,
    x: e.pageX,
    y: e.pageY,
    vx: e.clientX,
    vy: e.clientY,
    ts: now,
  });
}

function onClick(e) {
  const el = e.target;
  clickBuffer.push({
    sessionId,
    type: 'click',
    page: pageUrl,
    x: e.pageX,
    y: e.pageY,
    vx: e.clientX,
    vy: e.clientY,
    ts: Date.now(),
    element: {
      tag: el.tagName ? el.tagName.toLowerCase() : '',
      id: el.id || '',
      classes: el.className && typeof el.className === 'string' ? el.className : '',
      text: (el.textContent || '').trim().slice(0, 50),
    },
  });
}

function onScroll() {
  const now = Date.now();
  if (now - lastScrollTime < CFG.SCROLL_SAMPLE_MS) return;
  lastScrollTime = now;
  scrollBuffer.push({
    sessionId,
    type: 'scroll',
    page: pageUrl,
    scrollX: window.scrollX || 0,
    scrollY: window.scrollY || 0,
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
    pageH: scrollHeight(),
    ts: now,
  });
}

function flush() {
  const events = [...mouseBuffer, ...clickBuffer, ...scrollBuffer];
  mouseBuffer = [];
  clickBuffer = [];
  scrollBuffer = [];
  if (events.length === 0) return;
  chrome.runtime.sendMessage({ type: 'EVENTS', events }).catch(() => {});
}

function startTracking(sid) {
  if (tracking) return;
  sessionId = sid;
  tracking = true;
  document.addEventListener('mousemove', onMouseMove, { passive: true });
  document.addEventListener('click', onClick, true);
  window.addEventListener('scroll', onScroll, { passive: true });
  flushTimer = setInterval(flush, CFG.FLUSH_INTERVAL_MS);

  // Record page visit
  chrome.runtime.sendMessage({
    type: 'PAGE_VISIT',
    url: pageUrl,
    title: document.title,
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
    pageH: scrollHeight(),
    visitTime: pageStart,
  }).catch(() => {});
}

function stopTracking() {
  if (!tracking) return;
  tracking = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('click', onClick, true);
  window.removeEventListener('scroll', onScroll);
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flush();

  // Record dwell time
  chrome.runtime.sendMessage({
    type: 'DWELL',
    url: pageUrl,
    dwellMs: Date.now() - pageStart,
  }).catch(() => {});
}

// Ask background for current session state
chrome.runtime.sendMessage({ type: 'GET_SESSION_ID' }).then(resp => {
  if (resp && resp.sessionId) {
    startTracking(resp.sessionId);
  }
}).catch(() => {});

// Listen for stop signal from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'STOP_TRACKING') {
    stopTracking();
  }
});
```

- [ ] **Step 2: Reload the extension and verify no console errors**

1. Go to `chrome://extensions` → click the refresh icon on Session Tracker
2. Open any tab (e.g., `https://example.com`)
3. Open DevTools → Console tab for that page
4. Should see no errors (content script is injected but session is not running, so `GET_SESSION_ID` returns null and nothing starts)

Expected: No JS errors in the page console.

- [ ] **Step 3: Commit**

```bash
git -C "/Users/maggiechau/Documents/_Claude" add "Heatmap/Heatmap extension/content/"
git -C "/Users/maggiechau/Documents/_Claude" commit -m "feat: add content script for event capture"
```

---

## Task 4: Background Service Worker

**Files:**
- Modify: `background/service-worker.js` (replace stub with full implementation)

This is the core of the extension. It owns: session lifecycle, IndexedDB storage, screenshot capture, heatmap rendering via OffscreenCanvas (replacing `document.createElement('canvas')` from `heatmap-tracker.js` lines 320–397), ZIP assembly (from lines 399–604), badge management, and the message handler. JSZip is loaded via `importScripts` (non-module SW, no build step needed).

- [ ] **Step 1: Replace `background/service-worker.js` with the full implementation**

```js
'use strict';

importScripts('../vendor/jszip.min.js');

const CFG = {
  DB_NAME: 'session_tracker',
  DB_VERSION: 1,
  SCREENSHOT_DELAY_MS: 1500,
  MAX_SESSIONS: 10,
};

/* ── IndexedDB ─────────────────────────────────────── */

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CFG.DB_NAME, CFG.DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
        db.transaction.objectStore('events').createIndex('sessionId', 'sessionId');
      }
      if (!db.objectStoreNames.contains('pages')) {
        db.createObjectStore('pages', { keyPath: 'key' });
        db.transaction.objectStore('pages').createIndex('sessionId', 'sessionId');
      }
      if (!db.objectStoreNames.contains('screenshots')) {
        db.createObjectStore('screenshots', { keyPath: 'id', autoIncrement: true });
        db.transaction.objectStore('screenshots').createIndex('sessionId', 'sessionId');
      }
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'sessionId' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function dbPutAll(storeName, records) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    records.forEach(r => store.put(r));
    tx.oncomplete = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function dbPut(storeName, record) {
  return dbPutAll(storeName, [record]);
}

async function dbGetByIndex(storeName, indexName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const index = tx.objectStore(storeName).index(indexName);
    const req = index.getAll(value);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function dbGetAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/* ── Session State ─────────────────────────────────── */

async function getSessionState() {
  const result = await chrome.storage.local.get(['sessionId', 'sessionStart', 'isRecording']);
  return {
    sessionId: result.sessionId || null,
    sessionStart: result.sessionStart || null,
    isRecording: result.isRecording || false,
  };
}

async function setSessionState(patch) {
  return chrome.storage.local.set(patch);
}

/* ── Session Lifecycle ─────────────────────────────── */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}

async function startSession(tabId) {
  const sessionId = uid();
  const sessionStart = Date.now();
  await setSessionState({ sessionId, sessionStart, isRecording: true });

  // Save session record
  await dbPut('sessions', {
    sessionId,
    startTime: sessionStart,
    endTime: null,
    status: 'recording',
  });

  // Evict oldest session if we exceed MAX_SESSIONS
  await evictOldSessions();

  // Inject content script
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content/tracker.js'],
  });

  // Set green badge
  await chrome.action.setBadgeText({ text: '●' });
  await chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });

  // Schedule screenshot after delay
  setTimeout(() => captureScreenshot(tabId, sessionId), CFG.SCREENSHOT_DELAY_MS);

  return sessionId;
}

async function stopSession() {
  const state = await getSessionState();
  if (!state.isRecording || !state.sessionId) return;

  const sessionId = state.sessionId;

  // Notify all tabs to stop
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'STOP_TRACKING' });
    } catch (_) { /* tab may not have content script */ }
  }

  // Finalize session record
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readwrite');
    const store = tx.objectStore('sessions');
    const req = store.get(sessionId);
    req.onsuccess = (e) => {
      const session = e.target.result;
      if (session) {
        session.endTime = Date.now();
        session.status = 'complete';
        store.put(session);
      }
      tx.oncomplete = resolve;
    };
    req.onerror = (e) => reject(e.target.error);
  });

  await setSessionState({ isRecording: false });

  // Clear badge
  await chrome.action.setBadgeText({ text: '' });
}

async function evictOldSessions() {
  const db = await openDB();
  const sessions = await dbGetAll('sessions');
  if (sessions.length <= CFG.MAX_SESSIONS) return;

  // Sort by startTime ascending — oldest first
  sessions.sort((a, b) => a.startTime - b.startTime);
  const toDelete = sessions.slice(0, sessions.length - CFG.MAX_SESSIONS);

  for (const session of toDelete) {
    await deleteSessionData(db, session.sessionId);
  }
}

async function deleteSessionData(db, sessionId) {
  const stores = ['events', 'pages', 'screenshots'];
  for (const storeName of stores) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const index = tx.objectStore(storeName).index('sessionId');
      const req = index.openCursor(IDBKeyRange.only(sessionId));
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = resolve;
      tx.onerror = (e) => reject(e.target.error);
    });
  }
  // Delete session record
  await new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readwrite');
    tx.objectStore('sessions').delete(sessionId);
    tx.oncomplete = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}

/* ── Screenshots ───────────────────────────────────── */

async function captureScreenshot(tabId, sessionId) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    const tab = await chrome.tabs.get(tabId);
    const resp = await fetch(dataUrl);
    const blob = await resp.blob();
    await dbPut('screenshots', {
      sessionId,
      page: tab.url,
      blob,
      width: tab.width || 1280,
      height: tab.height || 800,
      ts: Date.now(),
    });
  } catch (err) {
    console.warn('[SessionTracker] Screenshot failed:', err);
  }
}

/* ── Heatmap Rendering (OffscreenCanvas) ───────────── */
// Adapted from heatmap-tracker.js lines 320–397.
// Uses OffscreenCanvas instead of document.createElement('canvas')
// because service workers have no DOM access.

function createPalette() {
  const c = new OffscreenCanvas(256, 1);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, 'rgba(0,0,255,0.4)');
  g.addColorStop(0.17, 'rgba(0,255,255,0.6)');
  g.addColorStop(0.34, 'rgba(0,255,0,0.7)');
  g.addColorStop(0.51, 'rgba(255,255,0,0.8)');
  g.addColorStop(0.68, 'rgba(255,128,0,0.9)');
  g.addColorStop(0.85, 'rgba(255,0,0,0.95)');
  g.addColorStop(1, 'rgba(128,0,0,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
}

function renderHeatmap(width, height, points, radius) {
  const canvas = new OffscreenCanvas(width, height);
  if (points.length === 0) return canvas;

  const shadow = new OffscreenCanvas(width, height);
  const sctx = shadow.getContext('2d');

  let maxVal = 0;
  for (const p of points) {
    if (p.value > maxVal) maxVal = p.value;
  }
  if (maxVal === 0) return canvas;

  for (const p of points) {
    const alpha = Math.min(p.value / maxVal, 1);
    const grad = sctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
    grad.addColorStop(0, `rgba(0,0,0,${alpha})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = grad;
    sctx.beginPath();
    sctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    sctx.fill();
  }

  const imgData = sctx.getImageData(0, 0, width, height);
  const px = imgData.data;
  const palette = createPalette();
  for (let k = 0; k < px.length; k += 4) {
    const a = px[k + 3];
    if (a > 2) {
      const idx = a * 4;
      px[k] = palette[idx];
      px[k + 1] = palette[idx + 1];
      px[k + 2] = palette[idx + 2];
      px[k + 3] = a < 15 ? 0 : Math.min(a + 80, 220);
    }
  }
  sctx.putImageData(imgData, 0, 0);
  canvas.getContext('2d').drawImage(shadow, 0, 0);
  return canvas;
}

function aggregatePoints(raw) {
  const grid = {};
  const gs = 5;
  for (const item of raw) {
    const gx = Math.round(item.x / gs) * gs;
    const gy = Math.round(item.y / gs) * gs;
    const key = `${gx},${gy}`;
    if (!grid[key]) grid[key] = { x: gx, y: gy, value: 0 };
    grid[key].value++;
  }
  return Object.values(grid);
}

/* ── ZIP Assembly ──────────────────────────────────── */
// Adapted from heatmap-tracker.js lines 399–604.

function safeName(url) {
  return url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60);
}

function buildCSV(events) {
  const rows = ['type,page,x,y,viewportX,viewportY,scrollX,scrollY,timestamp,isoTime,element'];
  for (const e of events) {
    const elStr = e.element
      ? e.element.tag +
        (e.element.id ? '#' + e.element.id : '') +
        (e.element.classes ? '.' + e.element.classes.split(' ')[0] : '')
      : '';
    rows.push([
      e.type,
      '"' + (e.page || '') + '"',
      e.x || '',
      e.y || '',
      e.vx || '',
      e.vy || '',
      e.scrollX || '',
      e.scrollY || '',
      e.ts || '',
      e.ts ? new Date(e.ts).toISOString() : '',
      '"' + elStr.replace(/"/g, "'") + '"',
    ].join(','));
  }
  return rows.join('\n');
}

async function assembleZip(sessionId) {
  const [allEvents, allPages, allScreenshots, allSessions] = await Promise.all([
    dbGetByIndex('events', 'sessionId', sessionId),
    dbGetByIndex('pages', 'sessionId', sessionId),
    dbGetByIndex('screenshots', 'sessionId', sessionId),
    dbGetAll('sessions'),
  ]);

  const session = allSessions.find(s => s.sessionId === sessionId);
  const clicks = allEvents.filter(e => e.type === 'click');
  const moves = allEvents.filter(e => e.type === 'mousemove');
  const scrolls = allEvents.filter(e => e.type === 'scroll');

  const metadata = {
    sessionId,
    startTime: new Date(session.startTime).toISOString(),
    endTime: new Date(session.endTime || Date.now()).toISOString(),
    durationMs: (session.endTime || Date.now()) - session.startTime,
    totalClicks: clicks.length,
    totalMouseSamples: moves.length,
    totalScrollSamples: scrolls.length,
    userAgent: navigator.userAgent,
    pages: allPages.map(p => ({
      url: p.url,
      title: p.title,
      visitTime: new Date(p.visitTime).toISOString(),
      viewportW: p.viewportW,
      viewportH: p.viewportH,
      pageH: p.pageH,
    })),
  };

  const zip = new JSZip();
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));
  zip.file('clicks.json', JSON.stringify(clicks, null, 2));
  zip.file('mousemoves.json', JSON.stringify(moves, null, 2));
  zip.file('scrolls.json', JSON.stringify(scrolls, null, 2));
  zip.file('raw-data.csv', buildCSV(allEvents));

  const ssFolder = zip.folder('screenshots');
  const hmFolder = zip.folder('heatmaps');

  for (const ss of allScreenshots) {
    if (!ss.blob) continue;
    const pageName = safeName(ss.page);
    ssFolder.file(pageName + '.png', ss.blob);

    const imgBitmap = await createImageBitmap(ss.blob);
    const pageClicks = clicks.filter(c => c.page === ss.page);
    const pageMoves = moves.filter(m => m.page === ss.page);

    if (pageClicks.length > 0) {
      const pts = aggregatePoints(pageClicks);
      const hm = renderHeatmap(ss.width, ss.height, pts, 30);
      const comp = new OffscreenCanvas(ss.width, ss.height);
      const ctx = comp.getContext('2d');
      ctx.drawImage(imgBitmap, 0, 0);
      ctx.drawImage(hm, 0, 0);
      const blob = await comp.convertToBlob({ type: 'image/png' });
      hmFolder.file('clicks_' + pageName + '.png', blob);
    }

    if (pageMoves.length > 0) {
      const mpts = aggregatePoints(pageMoves);
      const mhm = renderHeatmap(ss.width, ss.height, mpts, 40);
      const mcomp = new OffscreenCanvas(ss.width, ss.height);
      const mctx = mcomp.getContext('2d');
      mctx.drawImage(imgBitmap, 0, 0);
      mctx.drawImage(mhm, 0, 0);
      const mblob = await mcomp.convertToBlob({ type: 'image/png' });
      hmFolder.file('movement_' + pageName + '.png', mblob);
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

async function downloadZip(sessionId) {
  const blob = await assembleZip(sessionId);
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `session-tracker-${dateStr}.zip`;
  const url = URL.createObjectURL(blob);
  await chrome.downloads.download({ url, filename, saveAs: false });
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ── Tab Navigation Listener ───────────────────────── */

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  const state = await getSessionState();
  if (!state.isRecording || !state.sessionId) return;

  // Re-inject content script on navigation (new page load in same tab)
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/tracker.js'],
    });
  } catch (_) { /* tab may not be injectable (chrome:// etc.) */ }

  // Schedule screenshot for new page
  setTimeout(() => captureScreenshot(tabId, state.sessionId), CFG.SCREENSHOT_DELAY_MS);
});

/* ── Message Handler ───────────────────────────────── */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case 'GET_SESSION_ID': {
        const state = await getSessionState();
        sendResponse(state.isRecording ? { sessionId: state.sessionId } : { sessionId: null });
        break;
      }
      case 'START_SESSION': {
        const tabId = msg.tabId;
        const sessionId = await startSession(tabId);
        sendResponse({ sessionId });
        break;
      }
      case 'STOP_SESSION': {
        await stopSession();
        sendResponse({ ok: true });
        break;
      }
      case 'DOWNLOAD_ZIP': {
        const state = await getSessionState();
        if (state.sessionId) {
          await downloadZip(state.sessionId);
        }
        sendResponse({ ok: true });
        break;
      }
      case 'GET_STATE': {
        const state = await getSessionState();
        const sessions = await dbGetAll('sessions');
        const completedSessions = sessions.filter(s => s.status === 'complete');
        sendResponse({
          ...state,
          hasSession: completedSessions.length > 0,
          latestSessionId: completedSessions.length > 0
            ? completedSessions.sort((a, b) => b.endTime - a.endTime)[0].sessionId
            : null,
        });
        break;
      }
      case 'EVENTS': {
        const state = await getSessionState();
        if (!state.isRecording) break;
        await dbPutAll('events', msg.events);
        sendResponse({ ok: true });
        break;
      }
      case 'PAGE_VISIT': {
        const state = await getSessionState();
        if (!state.isRecording) break;
        await dbPut('pages', {
          key: state.sessionId + '::' + msg.url,
          sessionId: state.sessionId,
          url: msg.url,
          title: msg.title,
          viewportW: msg.viewportW,
          viewportH: msg.viewportH,
          pageH: msg.pageH,
          visitTime: msg.visitTime,
        });
        sendResponse({ ok: true });
        break;
      }
      case 'DWELL': {
        const state = await getSessionState();
        if (!state.isRecording) break;
        const db = await openDB();
        await new Promise((resolve, reject) => {
          const tx = db.transaction('pages', 'readwrite');
          const store = tx.objectStore('pages');
          const req = store.get(state.sessionId + '::' + msg.url);
          req.onsuccess = (e) => {
            const page = e.target.result;
            if (page) {
              page.dwellMs = msg.dwellMs;
              store.put(page);
            }
            tx.oncomplete = resolve;
          };
          req.onerror = (e) => reject(e.target.error);
        });
        sendResponse({ ok: true });
        break;
      }
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true; // Keep message channel open for async response
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[SessionTracker] installed');
});
```

- [ ] **Step 2: Reload extension in Chrome and check for service worker errors**

1. `chrome://extensions` → refresh Session Tracker
2. Click **Service Worker** → should show no errors in console
3. Check that `importScripts` for JSZip loaded without error

Expected: Service worker console shows `[SessionTracker] installed`, no errors about missing files or syntax.

- [ ] **Step 3: Commit**

```bash
git -C "/Users/maggiechau/Documents/_Claude" add "Heatmap/Heatmap extension/background/"
git -C "/Users/maggiechau/Documents/_Claude" commit -m "feat: add background service worker — session, storage, screenshots, ZIP"
```

---

## Task 5: Popup UI

**Files:**
- Modify: `popup/popup.html`
- Modify: `popup/popup.css`
- Modify: `popup/popup.js`

Three states as specified:
- **Idle**: dark header, grey dot, only `▶ Start Session` button
- **Recording**: dark header, blinking green dot, only `⏹ Stop Session` button
- **Session ready**: dark header, grey dot, three buttons: `▶ Start New Session`, `View`, `Download`

- [ ] **Step 1: Write `popup/popup.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="popup.css">
  <title>Session Tracker</title>
</head>
<body>
  <header id="header">
    <span id="dot" class="dot"></span>
    <span class="title">Session Tracker</span>
  </header>
  <main id="main">
    <div id="state-idle" class="state hidden">
      <button id="btn-start" class="btn btn-primary">&#9654; Start Session</button>
    </div>
    <div id="state-recording" class="state hidden">
      <button id="btn-stop" class="btn btn-secondary">&#9632; Stop Session</button>
    </div>
    <div id="state-ready" class="state hidden">
      <button id="btn-start-new" class="btn btn-primary">&#9654; Start New Session</button>
      <div class="btn-row">
        <button id="btn-view" class="btn btn-ghost">View</button>
        <button id="btn-download" class="btn btn-ghost">Download</button>
      </div>
    </div>
  </main>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `popup/popup.css`**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 220px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #18181b;
  color: #f4f4f5;
}

header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: #09090b;
  border-bottom: 1px solid #27272a;
}

.title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #52525b;
  flex-shrink: 0;
}

.dot.recording {
  background: #22c55e;
  animation: blink 1.2s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
}

main {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.state {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.state.hidden {
  display: none;
}

.btn {
  width: 100%;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  letter-spacing: 0.01em;
}

.btn-primary {
  background: #3f3f46;
  color: #f4f4f5;
}

.btn-primary:hover {
  background: #52525b;
}

.btn-secondary {
  background: #27272a;
  color: #a1a1aa;
}

.btn-secondary:hover {
  background: #3f3f46;
}

.btn-row {
  display: flex;
  gap: 6px;
}

.btn-row .btn {
  flex: 1;
}

.btn-ghost {
  background: #27272a;
  color: #a1a1aa;
}

.btn-ghost:hover {
  background: #3f3f46;
  color: #f4f4f5;
}
```

- [ ] **Step 3: Write `popup/popup.js`**

```js
'use strict';

const dot = document.getElementById('dot');
const stateIdle = document.getElementById('state-idle');
const stateRecording = document.getElementById('state-recording');
const stateReady = document.getElementById('state-ready');

function showState(state) {
  stateIdle.classList.add('hidden');
  stateRecording.classList.add('hidden');
  stateReady.classList.add('hidden');
  dot.classList.remove('recording');

  if (state === 'idle') {
    stateIdle.classList.remove('hidden');
  } else if (state === 'recording') {
    stateRecording.classList.remove('hidden');
    dot.classList.add('recording');
  } else if (state === 'ready') {
    stateReady.classList.remove('hidden');
  }
}

async function loadState() {
  const resp = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
  if (resp.isRecording) {
    showState('recording');
  } else if (resp.hasSession) {
    showState('ready');
  } else {
    showState('idle');
  }
}

document.getElementById('btn-start').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.runtime.sendMessage({ type: 'START_SESSION', tabId: tab.id });
  showState('recording');
});

document.getElementById('btn-stop').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'STOP_SESSION' });
  showState('ready');
});

document.getElementById('btn-start-new').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.runtime.sendMessage({ type: 'START_SESSION', tabId: tab.id });
  showState('recording');
});

document.getElementById('btn-view').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('viewer/viewer.html') });
});

document.getElementById('btn-download').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'DOWNLOAD_ZIP' });
});

loadState();
```

- [ ] **Step 4: Reload extension and test all three popup states**

1. `chrome://extensions` → refresh Session Tracker
2. Click extension icon → should show **Idle** state (only Start Session button visible)
3. Click **Start Session** → popup should show **Recording** state (blinking green dot, only Stop button)
4. Click **Stop Session** → popup should show **Session ready** state (three buttons)
5. Click **Start New Session** → back to Recording state

Expected: All three states render correctly, no layout shift, blinking animation works.

- [ ] **Step 5: Commit**

```bash
git -C "/Users/maggiechau/Documents/_Claude" add "Heatmap/Heatmap extension/popup/"
git -C "/Users/maggiechau/Documents/_Claude" commit -m "feat: add popup UI — 3-state (idle, recording, session ready)"
```

---

## Task 6: Port the Viewer

**Files:**
- Create: `viewer/viewer.html`
- Create: `viewer/viewer.js`

The existing `heatmap-viewer.html` has two problems that must be fixed for MV3 CSP compliance:
1. CDN `<script>` tags (JSZip, jsPDF) → must point to `../vendor/` instead
2. One large inline `<script>` block → must be extracted to `viewer/viewer.js`

The viewer logic itself is unchanged — only the script loading changes.

- [ ] **Step 1: Copy `heatmap-viewer.html` as the starting point**

```bash
cp "/Users/maggiechau/Documents/_Claude/Heatmap/Heatmap tracker/heatmap-viewer.html" \
   "/Users/maggiechau/Documents/_Claude/Heatmap/Heatmap extension/viewer/viewer.html"
```

- [ ] **Step 2: Find the CDN script tags in `viewer/viewer.html`**

```bash
grep -n "cdnjs\|jsdelivr\|unpkg\|<script" \
  "/Users/maggiechau/Documents/_Claude/Heatmap/Heatmap extension/viewer/viewer.html"
```

Note the exact line numbers for the CDN script tags and the opening `<script>` tag of the inline block.

- [ ] **Step 3: Replace CDN script tags with local vendor paths**

Find lines that look like:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/..."></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/..."></script>
```

Replace them with:
```html
<script src="../vendor/jszip.min.js"></script>
<script src="../vendor/jspdf.umd.min.js"></script>
```

Use the Edit tool with the exact text found in Step 2.

- [ ] **Step 4: Extract the inline script block**

Find the large inline `<script>` block (everything between `<script>` and `</script>` that is not a CDN load). Extract the content to `viewer/viewer.js`, then replace the inline block with:

```html
<script src="viewer.js"></script>
```

Use the Edit tool: replace the full inline script block (from `<script>` to `</script>`) with the single `<script src="viewer.js"></script>` line.

The extracted content goes into `viewer/viewer.js` as-is (no changes to the JS logic).

- [ ] **Step 5: Verify viewer.html has no remaining inline scripts or CDN references**

```bash
grep -n "cdnjs\|jsdelivr\|unpkg" \
  "/Users/maggiechau/Documents/_Claude/Heatmap/Heatmap extension/viewer/viewer.html"
grep -n "<script>" \
  "/Users/maggiechau/Documents/_Claude/Heatmap/Heatmap extension/viewer/viewer.html"
```

Expected: Both commands return no output (no CDN refs, no inline script blocks remaining).

- [ ] **Step 6: Reload extension and open the viewer**

1. `chrome://extensions` → refresh Session Tracker
2. Navigate to `chrome-extension://[extension-id]/viewer/viewer.html` in a new tab
   (Get the extension ID from `chrome://extensions`)
3. Viewer should load — check DevTools console for CSP errors

Expected: Viewer loads, no CSP errors in console, no "Refused to execute inline script" messages.

- [ ] **Step 7: Commit**

```bash
git -C "/Users/maggiechau/Documents/_Claude" add "Heatmap/Heatmap extension/viewer/"
git -C "/Users/maggiechau/Documents/_Claude" commit -m "feat: port heatmap-viewer into extension (MV3 CSP compliant)"
```

---

## Task 7: End-to-End Verification

No new files. Manual test of the full happy path.

- [ ] **Step 1: Load the extension fresh**

1. `chrome://extensions` → refresh Session Tracker
2. Confirm no error banners on the extension card

- [ ] **Step 2: Record a session across two pages**

1. Open `https://example.com`
2. Click extension icon → popup shows **Idle** state (only Start Session button)
3. Click **Start Session** → popup transitions to **Recording** (blinking green dot, only Stop button)
4. Click several links/elements on the page — generate at least 5 clicks
5. Navigate to `https://www.wikipedia.org` — this is a different domain, session should continue
6. Click a few more elements on Wikipedia
7. Click the extension icon → still shows **Recording** state

- [ ] **Step 3: Stop and verify session ready state**

1. Click **Stop Session**
2. Popup transitions to **Session ready** (three buttons: Start New Session, View, Download)
3. Extension toolbar icon badge is cleared (no green dot)

- [ ] **Step 4: Download the ZIP and inspect its contents**

1. Click **Download**
2. A file named `session-tracker-YYYY-MM-DDTHH-MM-SS.zip` appears in Downloads
3. Open the ZIP — verify structure:
   - `metadata.json` — present, contains `pages` array with both URLs
   - `clicks.json` — contains click events from both domains
   - `mousemoves.json` — contains mousemove events
   - `scrolls.json` — contains scroll events
   - `raw-data.csv` — present
   - `screenshots/` — at least 2 PNG files (one per page)
   - `heatmaps/` — at least 2 PNG files (clicks heatmap per page)

- [ ] **Step 5: Open the bundled viewer**

1. Click **View** → a new tab opens with the bundled viewer
2. The viewer should display the recorded session
3. Click through the session data — heatmap overlays should be visible

- [ ] **Step 6: Verify session history limit**

Conceptual check (no need to record 10 sessions manually):
- The `evictOldSessions()` function in `service-worker.js` deletes the oldest when sessions exceed `CFG.MAX_SESSIONS = 10`
- Confirm the constant is set to 10 in the service worker

- [ ] **Step 7: Verify no data leaves the device**

1. Open DevTools Network tab while recording
2. Filter by XHR/Fetch
3. Start and stop a session
4. Confirm: zero network requests made by the extension to any external host

Expected: Network tab shows no outbound requests from the extension.

- [ ] **Step 8: Final commit**

```bash
git -C "/Users/maggiechau/Documents/_Claude" add "Heatmap/Heatmap extension/"
git -C "/Users/maggiechau/Documents/_Claude" commit -m "docs: mark Session Tracker implementation complete"
```

---

## Self-Review: Spec Coverage

| Spec Requirement | Covered In |
| --- | --- |
| Chrome-first, MV3 | Task 1 — `manifest.json` with `manifest_version: 3` |
| Mousemove (50ms), click, scroll (200ms) | Task 3 — `content/tracker.js` event handlers |
| Time on page (dwell) | Task 3 — `DWELL` message on stop |
| Screenshots on page load (+1.5s) | Task 4 — `captureScreenshot` with `SCREENSHOT_DELAY_MS` |
| Multi-domain session continuity | Task 4 — background SW owns session ID in `chrome.storage.local` |
| Thin content script, no storage | Task 3 — content script sends to SW, never writes to storage |
| IndexedDB for all event data | Task 4 — `openDB()`, stores: events, pages, screenshots, sessions |
| ZIP format identical to existing tracker | Task 4 — `assembleZip()` produces same structure |
| OffscreenCanvas for heatmap (no DOM in SW) | Task 4 — `renderHeatmap()` uses `new OffscreenCanvas()` |
| `canvas.convertToBlob()` not `toDataURL()` | Task 4 — `comp.convertToBlob({ type: 'image/png' })` |
| JSZip bundled locally (no CDN) | Task 2 — downloaded to `vendor/`, loaded via `importScripts` |
| jsPDF bundled locally (no CDN) | Task 2 — downloaded to `vendor/`, referenced in viewer |
| Viewer ported, CSP compliant | Task 6 — CDN refs replaced, inline script extracted |
| 3-state popup UI (idle/recording/ready) | Task 5 — `popup.js` `showState()`, CSS states |
| Idle: only Start button | Task 5 — `state-idle` div, only `btn-start` rendered |
| Recording: black header, blinking green dot | Task 5 — `dot.recording` CSS animation |
| Session ready: Start New + View + Download | Task 5 — `state-ready` div with three buttons |
| Toolbar badge turns green while recording | Task 4 — `chrome.action.setBadgeText` + `setBadgeBackgroundColor` |
| Last 10 sessions, oldest evicted | Task 4 — `evictOldSessions()` with `CFG.MAX_SESSIONS = 10` |
| View opens bundled viewer in new tab | Task 5 — `chrome.tabs.create` with `viewer/viewer.html` |
| Download always gets most recent session | Task 4 — `GET_STATE` returns `latestSessionId` |
| All data local, no cloud | Task 4 — no fetch/XHR to external hosts |
| Privacy: tracking only when user starts | Task 4 — content script injected only after `START_SESSION` |
| Visual recording indicator | Task 4 — badge + Task 5 — blinking dot |
