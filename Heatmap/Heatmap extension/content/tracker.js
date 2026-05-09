'use strict';

if (window.__sessionTrackerInjected) {
  // Already running — skip re-initialization to prevent duplicate listeners
} else {
window.__sessionTrackerInjected = true;

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
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'STOP_TRACKING') {
    stopTracking();
    sendResponse({ ok: true });
  }
  return false;
});

} // end injection guard
