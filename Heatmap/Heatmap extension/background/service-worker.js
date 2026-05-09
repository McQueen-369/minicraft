'use strict';

importScripts('../vendor/jszip.min.js');

const CFG = {
  DB_NAME: 'session_tracker',
  DB_VERSION: 1,
  MAX_SESSIONS: 10,
};

/* ── IndexedDB ─────────────────────────────────────── */

let _dbPromise = null;
function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(CFG.DB_NAME, CFG.DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('events')) {
        const evStore = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
        evStore.createIndex('sessionId', 'sessionId');
      }
      if (!db.objectStoreNames.contains('pages')) {
        const pgStore = db.createObjectStore('pages', { keyPath: 'key' });
        pgStore.createIndex('sessionId', 'sessionId');
      }
      if (!db.objectStoreNames.contains('screenshots')) {
        const ssStore = db.createObjectStore('screenshots', { keyPath: 'id', autoIncrement: true });
        ssStore.createIndex('sessionId', 'sessionId');
      }
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'sessionId' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return _dbPromise;
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

  await dbPut('sessions', {
    sessionId,
    startTime: sessionStart,
    endTime: null,
    status: 'recording',
  });

  await evictOldSessions();

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/tracker.js'],
    });
  } catch (_) {}

  await chrome.action.setBadgeText({ text: '●' });
  await chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });

  return sessionId;
}

let _stopInFlight = null;
async function stopSession() {
  if (_stopInFlight) return _stopInFlight;
  _stopInFlight = (async () => {
    const state = await getSessionState();
    if (!state.isRecording || !state.sessionId) return;

    const sessionId = state.sessionId;

    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'STOP_TRACKING' });
      } catch (_) {}
    }

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
    await chrome.action.setBadgeText({ text: '' });
  })();
  try { return await _stopInFlight; } finally { _stopInFlight = null; }
}

async function evictOldSessions() {
  const sessions = await dbGetAll('sessions');
  if (sessions.length <= CFG.MAX_SESSIONS) return;

  sessions.sort((a, b) => a.startTime - b.startTime);
  const toDelete = sessions.slice(0, sessions.length - CFG.MAX_SESSIONS);

  const db = await openDB();
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
  await new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readwrite');
    tx.objectStore('sessions').delete(sessionId);
    tx.oncomplete = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}

/* ── Screenshots ───────────────────────────────────── */

/* ── Heatmap Rendering (OffscreenCanvas) ───────────── */

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
  if (!session) throw new Error(`Session ${sessionId} not found`);
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

  // Group scroll-strip captures by page URL, then stitch into one image per page
  const capturesByPage = {};
  for (const ss of allScreenshots) {
    if (!ss.blob) continue;
    if (!capturesByPage[ss.page]) capturesByPage[ss.page] = [];
    capturesByPage[ss.page].push(ss);
  }

  for (const [pageUrl, captures] of Object.entries(capturesByPage)) {
    captures.sort((a, b) => (a.scrollY || 0) - (b.scrollY || 0));

    const vw = captures[0].viewportW || 1280;
    const vh = captures[0].viewportH || 800;
    const totalH = Math.max(...captures.map(c => (c.scrollY || 0) + vh));
    const pageName = safeName(pageUrl);

    // Stitch strips into one full-page image
    const stitchCanvas = new OffscreenCanvas(vw, totalH);
    const stitchCtx = stitchCanvas.getContext('2d');
    for (const cap of captures) {
      const bm = await createImageBitmap(cap.blob);
      try { stitchCtx.drawImage(bm, 0, cap.scrollY || 0); } finally { bm.close(); }
    }
    const stitchedBlob = await stitchCanvas.convertToBlob({ type: 'image/png' });
    ssFolder.file(pageName + '.png', stitchedBlob);

    // Render heatmaps on the stitched background
    const stitchedBitmap = await createImageBitmap(stitchedBlob);
    try {
      const pageClicks = clicks.filter(c => c.page === pageUrl);
      const pageMoves = moves.filter(m => m.page === pageUrl);

      if (pageClicks.length > 0) {
        const hm = renderHeatmap(vw, totalH, aggregatePoints(pageClicks), 30);
        const comp = new OffscreenCanvas(vw, totalH);
        const ctx = comp.getContext('2d');
        ctx.drawImage(stitchedBitmap, 0, 0);
        ctx.drawImage(hm, 0, 0);
        hmFolder.file('clicks_' + pageName + '.png', await comp.convertToBlob({ type: 'image/png' }));
      }

      if (pageMoves.length > 0) {
        const mhm = renderHeatmap(vw, totalH, aggregatePoints(pageMoves), 40);
        const mcomp = new OffscreenCanvas(vw, totalH);
        const mctx = mcomp.getContext('2d');
        mctx.drawImage(stitchedBitmap, 0, 0);
        mctx.drawImage(mhm, 0, 0);
        hmFolder.file('movement_' + pageName + '.png', await mcomp.convertToBlob({ type: 'image/png' }));
      }
    } finally {
      stitchedBitmap.close();
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

async function downloadZip(sessionId) {
  const blob = await assembleZip(sessionId);
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `session-tracker-${dateStr}.zip`;
  // URL.createObjectURL is not available in MV3 service workers; use FileReader instead
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  await chrome.downloads.download({ url: dataUrl, filename, saveAs: false });
}

/* ── Tab Navigation Listener ───────────────────────── */

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  const state = await getSessionState();
  if (!state.isRecording || !state.sessionId) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/tracker.js'],
    });
  } catch (_) {}

  // Direct SW-side capture: tab.url is frozen from the event so it stays correct
  // even if the user navigates away before the async calls below complete.
  if (tab.active) {
    try {
      const current = await chrome.tabs.get(tabId);
      if (current.url === tab.url) {
        const dataUrl = await chrome.tabs.captureVisibleTab(current.windowId, { format: 'png' });
        const resp = await fetch(dataUrl);
        const blob = await resp.blob();
        await dbPut('screenshots', {
          sessionId: state.sessionId,
          page: tab.url,
          scrollY: 0,
          viewportW: current.width || 1280,
          viewportH: current.height || 800,
          blob,
          ts: Date.now(),
        });
      }
    } catch (_) {}
  }
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
        const sessions = await dbGetAll('sessions');
        const completed = sessions
          .filter(s => s.status === 'complete')
          .sort((a, b) => b.endTime - a.endTime);
        if (completed.length > 0) {
          await downloadZip(completed[0].sessionId);
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
      case 'CAPTURE_VIEWPORT': {
        const state = await getSessionState();
        if (!state.isRecording) { sendResponse({ ok: true }); break; }
        try {
          const tab = await chrome.tabs.get(sender.tab.id);
          // Guard: skip if tab navigated away or is not visible
          if (tab.active && tab.url === msg.page) {
            const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
            const resp = await fetch(dataUrl);
            const blob = await resp.blob();
            await dbPut('screenshots', {
              sessionId: state.sessionId,
              page: msg.page,        // URL from content script, frozen at page load
              scrollY: msg.scrollY || 0,
              viewportW: msg.viewportW,
              viewportH: msg.viewportH,
              pageH: msg.pageH,
              blob,
              ts: Date.now(),
            });
          }
        } catch (_) {}
        sendResponse({ ok: true });
        break;
      }
      case 'EVENTS': {
        const state = await getSessionState();
        if (!state.isRecording) break;
        const events = msg.events.map(e => ({ ...e, sessionId: state.sessionId }));
        await dbPutAll('events', events);
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
  return true;
});

// Restore badge if a recording session was active when the SW was suspended
(async () => {
  const state = await getSessionState();
  if (state.isRecording) {
    chrome.action.setBadgeText({ text: '●' });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
  }
})();

chrome.runtime.onInstalled.addListener(() => {});
