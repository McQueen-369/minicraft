  (function () {
    'use strict';

    var HISTORY_DB = 'heatmap_viewer_history';
    var HISTORY_DB_VERSION = 1;
    var HISTORY_MAX = 10;

    /* ── Application State ──────────────────── */
    var App = {
      metadata: null,
      clicks: [],
      moves: [],
      scrolls: [],
      screenshots: {},
      currentPage: null,
      currentType: 'clicks',
      radius: 80,
      opacity: 0.4,
      historyDb: null,
      currentHistoryId: null,
      mode: 'single',
      viewMode: 'fit',
      zoomLevel: 1,
      sessionB: null,
    };

    /* ── DOM refs ───────────────────────────── */
    var $importZone = document.getElementById('import-zone');
    var $fileInput = document.getElementById('file-input');
    var $viewer = document.getElementById('viewer');
    var $canvas = document.getElementById('canvas');
    var $ctx = $canvas.getContext('2d');
    var $historySection = document.getElementById('history-section');
    var $historyList = document.getElementById('history-list');

    /* ── Page Dropdown (custom select) ───────── */
    var PageSelect = (function () {
      var wrap = document.getElementById('page-dropdown');
      var trigger = document.getElementById('page-dropdown-trigger');
      var list = document.getElementById('page-dropdown-list');
      var items = [];
      var selectedIdx = -1;
      var changeCallbacks = [];

      function close() { wrap.classList.remove('open'); }
      function toggle() { wrap.classList.toggle('open'); }

      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        toggle();
      });

      document.addEventListener('click', function (e) {
        if (!wrap.contains(e.target)) close();
      });

      document.addEventListener('keydown', function (e) {
        if (!wrap.classList.contains('open')) return;
        if (e.key === 'Escape') { close(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); select(Math.min(selectedIdx + 1, items.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); select(Math.max(selectedIdx - 1, 0)); }
        if (e.key === 'Enter') { close(); }
      });

      function updateTrigger() {
        var tTitle = trigger.querySelector('.pd-title');
        var tCaption = trigger.querySelector('.pd-caption');
        if (selectedIdx < 0 || selectedIdx >= items.length) {
          tTitle.textContent = '—';
          tCaption.textContent = '';
          return;
        }
        var it = items[selectedIdx];
        tTitle.textContent = it.title;
        tCaption.textContent = it.caption;
      }

      function select(idx) {
        if (idx < 0 || idx >= items.length) return;
        selectedIdx = idx;
        list.querySelectorAll('.page-dropdown-item').forEach(function (el, i) {
          el.classList.toggle('active', i === idx);
        });
        updateTrigger();
        changeCallbacks.forEach(function (cb) { cb(); });
      }

      return {
        clear: function () {
          list.innerHTML = '';
          items = [];
          selectedIdx = -1;
          updateTrigger();
        },
        addOption: function (value, title, caption) {
          var idx = items.length;
          items.push({ value: value, title: title, caption: caption });
          var el = document.createElement('div');
          el.className = 'page-dropdown-item';
          el.innerHTML = '<div class="pd-title"></div><div class="pd-caption"></div>';
          el.querySelector('.pd-title').textContent = title;
          el.querySelector('.pd-caption').textContent = caption;
          el.addEventListener('click', function () {
            select(idx);
            close();
          });
          list.appendChild(el);
        },
        get value() { return selectedIdx >= 0 ? items[selectedIdx].value : ''; },
        get selectedIndex() { return selectedIdx; },
        get length() { return items.length; },
        selectFirst: function () { if (items.length > 0) select(0); },
        selectByValue: function (v) {
          for (var i = 0; i < items.length; i++) {
            if (items[i].value === v) { select(i); return; }
          }
        },
        onChange: function (cb) { changeCallbacks.push(cb); }
      };
    })();

    /* ── History DB ─────────────────────────── */
    function openHistoryDB() {
      return new Promise(function (resolve, reject) {
        var req = indexedDB.open(HISTORY_DB, HISTORY_DB_VERSION);
        req.onupgradeneeded = function (e) {
          var db = e.target.result;
          if (!db.objectStoreNames.contains('sessions')) {
            var store = db.createObjectStore('sessions', { keyPath: 'id' });
            store.createIndex('importedAt', 'importedAt', { unique: false });
          }
        };
        req.onsuccess = function (e) { resolve(e.target.result); };
        req.onerror = function (e) { reject(e.target.error); };
      });
    }

    function historyGetAll() {
      return new Promise(function (resolve, reject) {
        var tx = App.historyDb.transaction('sessions', 'readonly');
        var req = tx.objectStore('sessions').getAll();
        req.onsuccess = function () {
          var results = req.result || [];
          results.sort(function (a, b) { return b.importedAt - a.importedAt; });
          resolve(results);
        };
        req.onerror = function (e) { reject(e.target.error); };
      });
    }

    function historySave(entry) {
      return new Promise(function (resolve, reject) {
        var tx = App.historyDb.transaction('sessions', 'readwrite');
        tx.objectStore('sessions').put(entry);
        tx.oncomplete = resolve;
        tx.onerror = function (e) { reject(e.target.error); };
      });
    }

    function historyDelete(id) {
      return new Promise(function (resolve, reject) {
        var tx = App.historyDb.transaction('sessions', 'readwrite');
        tx.objectStore('sessions').delete(id);
        tx.oncomplete = resolve;
        tx.onerror = function (e) { reject(e.target.error); };
      });
    }

    function historyClearAll() {
      return new Promise(function (resolve, reject) {
        var tx = App.historyDb.transaction('sessions', 'readwrite');
        tx.objectStore('sessions').clear();
        tx.oncomplete = resolve;
        tx.onerror = function (e) { reject(e.target.error); };
      });
    }

    function historyEnforceCap() {
      return historyGetAll().then(function (entries) {
        if (entries.length <= HISTORY_MAX) return;
        var toRemove = entries.slice(HISTORY_MAX);
        return Promise.all(toRemove.map(function (e) { return historyDelete(e.id); }));
      });
    }

    function generateHistoryName(meta) {
      var dateStr = '—';
      if (meta && meta.startTime) {
        try {
          dateStr = new Date(meta.startTime).toLocaleDateString('en-AU', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          });
        } catch (_) {}
      }
      var pages = (meta && meta.pages) ? meta.pages.length : 0;
      var clicks = (meta && meta.totalClicks) || 0;
      return dateStr + ' — ' + pages + ' page' + (pages !== 1 ? 's' : '') + ', ' + clicks + ' click' + (clicks !== 1 ? 's' : '');
    }

    function saveToHistory(zipBlob) {
      var meta = App.metadata || {};
      var entry = {
        id: 'hist_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: generateHistoryName(meta),
        importedAt: Date.now(),
        summary: {
          startTime: meta.startTime || null,
          durationMs: meta.durationMs || 0,
          pages: (meta.pages || []).length,
          clicks: meta.totalClicks || App.clicks.length,
          moves: meta.totalMouseSamples || App.moves.length,
        },
        zipBlob: zipBlob,
      };
      App.currentHistoryId = entry.id;
      return historySave(entry).then(historyEnforceCap).then(renderHistory);
    }

    function loadFromHistory(id) {
      return new Promise(function (resolve, reject) {
        var tx = App.historyDb.transaction('sessions', 'readonly');
        var req = tx.objectStore('sessions').get(id);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function (e) { reject(e.target.error); };
      }).then(function (entry) {
        if (!entry || !entry.zipBlob) return;
        App.currentHistoryId = entry.id;
        return JSZip.loadAsync(entry.zipBlob).then(parseZip);
      });
    }

    function renderHistory() {
      return historyGetAll().then(function (entries) {
        var viewerActive = !$viewer.classList.contains('hidden');
        if (entries.length === 0 || viewerActive) {
          $historySection.classList.add('hidden');
          if (entries.length === 0) return;
        } else {
          $historySection.classList.remove('hidden');
        }
        document.getElementById('history-count').textContent = '(' + entries.length + ')';
        $historyList.innerHTML = '';

        entries.forEach(function (entry) {
          var div = document.createElement('div');
          div.className = 'history-item';
          div.dataset.id = entry.id;

          var dur = entry.summary && entry.summary.durationMs
            ? formatDuration(entry.summary.durationMs)
            : '—';
          var importDate = new Date(entry.importedAt).toLocaleDateString('en-AU', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
          });

          var actionsHtml;
          if (App.mode === 'compare') {
            actionsHtml =
              '<button class="hi-load-a" title="Load as Session A" style="color:var(--accent);font-weight:600;">→ A</button>' +
              '<button class="hi-load-b" title="Load as Session B" style="color:var(--success);font-weight:600;">→ B</button>' +
              '<button class="hi-delete" title="Delete">Delete</button>';
          } else {
            actionsHtml =
              '<button class="hi-rename" title="Rename">Rename</button>' +
              '<button class="hi-delete" title="Delete">Delete</button>';
          }

          div.innerHTML =
            '<div class="hi-icon">&#x1F4CA;</div>' +
            '<div class="hi-info">' +
              '<div class="hi-name">' + escapeHtml(entry.name) + '</div>' +
              '<div class="hi-meta">Imported ' + importDate + ' &middot; Duration: ' + dur + '</div>' +
            '</div>' +
            '<div class="hi-actions">' + actionsHtml + '</div>';

          if (App.mode === 'compare') {
            div.querySelector('.hi-load-a').addEventListener('click', function (e) {
              e.stopPropagation();
              loadHistoryIntoSlot(entry, 0);
            });
            div.querySelector('.hi-load-b').addEventListener('click', function (e) {
              e.stopPropagation();
              loadHistoryIntoSlot(entry, 1);
            });
          } else {
            div.querySelector('.hi-rename').addEventListener('click', function (e) {
              e.stopPropagation();
              var newName = prompt('Rename session:', entry.name);
              if (newName && newName.trim()) {
                entry.name = newName.trim();
                historySave(entry).then(renderHistory);
              }
            });
            div.addEventListener('click', function () {
              loadFromHistory(entry.id);
            });
          }

          div.querySelector('.hi-delete').addEventListener('click', function (e) {
            e.stopPropagation();
            if (confirm('Delete this session from history?')) {
              historyDelete(entry.id).then(renderHistory);
            }
          });

          $historyList.appendChild(div);
        });
      });
    }

    document.getElementById('btn-clear-history').addEventListener('click', function () {
      if (confirm('Delete all session history? This cannot be undone.')) {
        historyClearAll().then(renderHistory);
      }
    });

    /* ── Import ─────────────────────────────── */
    $importZone.addEventListener('click', function () { $fileInput.click(); });
    $fileInput.addEventListener('change', function () {
      if ($fileInput.files.length) handleFile($fileInput.files[0]);
    });
    $importZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      $importZone.classList.add('dragover');
    });
    $importZone.addEventListener('dragleave', function () {
      $importZone.classList.remove('dragover');
    });
    $importZone.addEventListener('drop', function (e) {
      e.preventDefault();
      $importZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    var _pendingZipBlob = null;

    function handleFile(file) {
      if (!file.name.endsWith('.zip')) {
        alert('Please select a .zip file exported by heatmap-tracker.js');
        return;
      }
      file.arrayBuffer().then(function (buf) {
        _pendingZipBlob = new Blob([buf], { type: 'application/zip' });
        return JSZip.loadAsync(buf);
      }).then(parseZip).catch(function (err) {
        alert('Failed to read ZIP: ' + err.message);
      });
    }

    function parseZip(zip) {
      var tasks = [];

      tasks.push(
        zip.file('metadata.json')
          ? zip.file('metadata.json').async('string').then(function (s) { App.metadata = JSON.parse(s); })
          : Promise.resolve()
      );
      tasks.push(
        zip.file('clicks.json')
          ? zip.file('clicks.json').async('string').then(function (s) { App.clicks = JSON.parse(s); })
          : Promise.resolve()
      );
      tasks.push(
        zip.file('mousemoves.json')
          ? zip.file('mousemoves.json').async('string').then(function (s) { App.moves = JSON.parse(s); })
          : Promise.resolve()
      );
      tasks.push(
        zip.file('scrolls.json')
          ? zip.file('scrolls.json').async('string').then(function (s) { App.scrolls = JSON.parse(s); })
          : Promise.resolve()
      );

      var ssFolder = zip.folder('screenshots');
      if (ssFolder) {
        ssFolder.forEach(function (path, entry) {
          if (entry.dir || !path.endsWith('.png')) return;
          tasks.push(
            entry.async('blob').then(function (blob) {
              var pageName = path.replace(/\.png$/, '');
              App.screenshots[pageName] = blob;
            })
          );
        });
      }

      return Promise.all(tasks).then(function () {
        if (_pendingZipBlob) {
          saveToHistory(_pendingZipBlob);
          _pendingZipBlob = null;
        }
        renderSession();
      });
    }

    /* ── Compare Mode ────────────────────────── */
    function switchMode(mode) {
      App.mode = mode;
      document.querySelectorAll('#mode-btns button').forEach(function (b) {
        b.classList.toggle('active', b.dataset.mode === mode);
      });

      var $compareImport = document.getElementById('compare-import');
      var $vp = document.getElementById('viewport');
      var $cvp = document.getElementById('compare-viewport');
      var $sessionBar = document.getElementById('session-bar');
      var $pageStats = document.getElementById('page-stats');
      var $dataSection = document.getElementById('data-section');

      if (mode === 'single') {
        $compareImport.classList.add('hidden');
        $cvp.classList.add('hidden');
        $sessionBar.classList.remove('hidden');
        $pageStats.classList.remove('hidden');
        $dataSection.classList.remove('hidden');

        if (App.metadata) {
          $importZone.classList.add('hidden');
          $viewer.classList.remove('hidden');
          $vp.classList.remove('hidden');
          var $ha = document.getElementById('header-actions');
          $ha.classList.remove('hidden');
          $ha.style.display = 'flex';
          renderSession();
        } else {
          $importZone.classList.remove('hidden');
          $viewer.classList.add('hidden');
          var $ha2 = document.getElementById('header-actions');
          $ha2.classList.add('hidden');
          $ha2.style.display = 'none';
        }
      } else {
        $importZone.classList.add('hidden');
        $compareImport.classList.remove('hidden');
        $vp.classList.add('hidden');
        $sessionBar.classList.add('hidden');
        $pageStats.classList.add('hidden');
        $dataSection.classList.add('hidden');

        if (App.metadata) {
          document.getElementById('slot-a').classList.add('loaded');
          document.getElementById('slot-a-file').textContent = 'Session loaded';
        }
        if (App.sessionB) {
          document.getElementById('slot-b').classList.add('loaded');
          document.getElementById('slot-b-file').textContent = 'Session loaded';
        }

        if (App.metadata && App.sessionB) {
          showCompareViewer();
        } else {
          $viewer.classList.add('hidden');
          var $ha3 = document.getElementById('header-actions');
          $ha3.classList.add('hidden');
          $ha3.style.display = 'none';
        }
      }
      renderHistory();
    }

    function setupCompareImport() {
      var slots = [
        { el: document.getElementById('slot-a'), input: document.getElementById('file-input-a'), idx: 0 },
        { el: document.getElementById('slot-b'), input: document.getElementById('file-input-b'), idx: 1 },
      ];
      slots.forEach(function (s) {
        s.el.addEventListener('click', function () {
          if (!s.el.classList.contains('loaded')) s.input.click();
        });
        s.input.addEventListener('change', function () {
          if (s.input.files.length) handleCompareFile(s.input.files[0], s.idx);
        });
        s.el.addEventListener('dragover', function (e) {
          e.preventDefault();
          if (!s.el.classList.contains('loaded')) s.el.classList.add('dragover');
        });
        s.el.addEventListener('dragleave', function () {
          s.el.classList.remove('dragover');
        });
        s.el.addEventListener('drop', function (e) {
          e.preventDefault();
          s.el.classList.remove('dragover');
          if (e.dataTransfer.files.length) handleCompareFile(e.dataTransfer.files[0], s.idx);
        });
      });
    }

    function handleCompareFile(file, slotIndex) {
      if (!file.name.endsWith('.zip')) {
        alert('Please select a .zip file exported by heatmap-tracker.js');
        return;
      }
      file.arrayBuffer().then(function (buf) {
        return JSZip.loadAsync(buf);
      }).then(function (zip) {
        return parseZipToSession(zip);
      }).then(function (session) {
        if (slotIndex === 0) {
          App.metadata = session.metadata;
          App.clicks = session.clicks;
          App.moves = session.moves;
          App.scrolls = session.scrolls;
          App.screenshots = session.screenshots;
        } else {
          App.sessionB = session;
        }
        var slotEl = document.getElementById(slotIndex === 0 ? 'slot-a' : 'slot-b');
        slotEl.classList.add('loaded');
        document.getElementById(slotIndex === 0 ? 'slot-a-file' : 'slot-b-file').textContent = file.name;

        if (App.metadata && App.sessionB) {
          showCompareViewer();
        }
      }).catch(function (err) {
        alert('Failed to read ZIP: ' + err.message);
      });
    }

    function parseZipToSession(zip) {
      var session = { metadata: null, clicks: [], moves: [], scrolls: [], screenshots: {} };
      var tasks = [];
      tasks.push(
        zip.file('metadata.json')
          ? zip.file('metadata.json').async('string').then(function (s) { session.metadata = JSON.parse(s); })
          : Promise.resolve()
      );
      tasks.push(
        zip.file('clicks.json')
          ? zip.file('clicks.json').async('string').then(function (s) { session.clicks = JSON.parse(s); })
          : Promise.resolve()
      );
      tasks.push(
        zip.file('mousemoves.json')
          ? zip.file('mousemoves.json').async('string').then(function (s) { session.moves = JSON.parse(s); })
          : Promise.resolve()
      );
      tasks.push(
        zip.file('scrolls.json')
          ? zip.file('scrolls.json').async('string').then(function (s) { session.scrolls = JSON.parse(s); })
          : Promise.resolve()
      );
      var ssFolder = zip.folder('screenshots');
      if (ssFolder) {
        ssFolder.forEach(function (path, entry) {
          if (entry.dir || !path.endsWith('.png')) return;
          tasks.push(
            entry.async('blob').then(function (blob) {
              session.screenshots[path.replace(/\.png$/, '')] = blob;
            })
          );
        });
      }
      return Promise.all(tasks).then(function () { return session; });
    }

    function showCompareViewer() {
      document.getElementById('compare-import').classList.add('hidden');
      $historySection.classList.add('hidden');
      $viewer.classList.remove('hidden');
      document.getElementById('viewport').classList.add('hidden');
      document.getElementById('compare-viewport').classList.remove('hidden');
      document.getElementById('session-bar').classList.add('hidden');
      document.getElementById('page-stats').classList.add('hidden');
      document.getElementById('click-path-section').classList.add('hidden');
      document.getElementById('data-section').classList.add('hidden');
      var $ha = document.getElementById('header-actions');
      $ha.classList.remove('hidden');
      $ha.style.display = 'flex';
      populateComparePages();
      renderCompareView();
    }

    function getSessionPages(metadata, clicks, moves, scrolls) {
      var pages = (metadata && metadata.pages) || [];
      var urls = [];
      pages.forEach(function (p) { if (urls.indexOf(p.url) === -1) urls.push(p.url); });
      if (urls.length === 0) {
        var urlSet = {};
        clicks.concat(moves).concat(scrolls).forEach(function (e) {
          if (e.page) urlSet[e.page] = true;
        });
        urls = Object.keys(urlSet);
      }
      return urls;
    }

    function populateComparePages() {
      var urlsA = getSessionPages(App.metadata, App.clicks, App.moves, App.scrolls);
      var urlsB = App.sessionB
        ? getSessionPages(App.sessionB.metadata, App.sessionB.clicks, App.sessionB.moves, App.sessionB.scrolls)
        : [];
      var allUrls = [];
      urlsA.forEach(function (u) { if (allUrls.indexOf(u) === -1) allUrls.push(u); });
      urlsB.forEach(function (u) { if (allUrls.indexOf(u) === -1) allUrls.push(u); });

      PageSelect.clear();
      allUrls.forEach(function (url, i) {
        PageSelect.addOption(url, 'Page ' + (i + 1), shortenUrl(url));
      });
      if (allUrls.length > 0) {
        PageSelect.selectFirst();
        App.currentPage = allUrls[0];
      }
      updatePageCounter();
    }

    function renderCompareView() {
      if (!App.currentPage) return;
      renderComparePanel(
        'canvas-a', 'stats-a',
        App.clicks, App.moves, App.scrolls, App.screenshots, App.metadata
      );
      if (App.sessionB) {
        renderComparePanel(
          'canvas-b', 'stats-b',
          App.sessionB.clicks, App.sessionB.moves, App.sessionB.scrolls,
          App.sessionB.screenshots, App.sessionB.metadata
        );
      } else {
        var cb = document.getElementById('canvas-b');
        cb.width = 400; cb.height = 300;
        var ctxB = cb.getContext('2d');
        ctxB.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface-2').trim() || '#1e1e3a';
        ctxB.fillRect(0, 0, 400, 300);
        ctxB.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-dim').trim() || '#999';
        ctxB.font = '14px sans-serif';
        ctxB.textAlign = 'center';
        ctxB.fillText('No session loaded', 200, 150);
        document.getElementById('stats-b').textContent = '';
      }
    }

    function renderComparePanel(canvasId, statsId, clicks, moves, scrolls, screenshots, metadata) {
      var page = App.currentPage;
      var pageClicks = clicks.filter(function (e) { return e.page === page; });
      var pageMoves = moves.filter(function (e) { return e.page === page; });
      var pageScrolls = scrolls.filter(function (e) { return e.page === page; });
      var canvas = document.getElementById(canvasId);
      var ctx = canvas.getContext('2d');
      var $stats = document.getElementById(statsId);

      var ssKey = findScreenshotKeyForSession(page, screenshots);
      var ssBlob = ssKey ? screenshots[ssKey] : null;

      function drawPanel(bgImg, w, h) {
        canvas.width = w;
        canvas.height = h;
        if (bgImg) {
          ctx.drawImage(bgImg, 0, 0);
        } else {
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, w, h);
          if (pageClicks.length + pageMoves.length + pageScrolls.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No data for this page', w / 2, h / 2);
            $stats.textContent = 'No data';
            return;
          }
        }
        var overlay = null;
        var type = App.currentType;
        if (type === 'clicks') {
          overlay = renderPointHeatmap(w, h, aggregatePoints(pageClicks), App.radius);
        } else if (type === 'movement') {
          overlay = renderPointHeatmap(w, h, aggregatePoints(pageMoves), App.radius);
        } else if (type === 'scroll') {
          overlay = renderScrollDepth(w, h, pageScrolls);
        } else if (type === 'dwell') {
          overlay = renderPointHeatmap(w, h, computeDwell(pageMoves), App.radius);
        }
        if (overlay) {
          ctx.globalAlpha = App.opacity;
          ctx.drawImage(overlay, 0, 0);
          ctx.globalAlpha = 1;
        }
        var maxScroll = 0, pageH = 1;
        pageScrolls.forEach(function (s) {
          if (s.scrollY + s.viewportH > maxScroll) maxScroll = s.scrollY + s.viewportH;
          if (s.pageH > pageH) pageH = s.pageH;
        });
        var panelTime = calcPageTimeSpent(page, clicks, moves, scrolls);
        $stats.textContent = formatDuration(panelTime) + '  |  Clicks: ' + pageClicks.length + '  |  Scroll: ' + Math.round(maxScroll / pageH * 100) + '%';
      }

      if (ssBlob) {
        createImageBitmap(ssBlob).then(function (img) { drawPanel(img, img.width, img.height); });
      } else {
        var pageInfo = (metadata && metadata.pages || []).find(function (p) { return p.url === page; });
        var w = (pageInfo && pageInfo.pageW) || 1200;
        var h = (pageInfo && pageInfo.pageH) || 800;
        drawPanel(null, w, h);
      }
    }

    function findScreenshotKeyForSession(pageUrl, screenshots) {
      var safe = pageUrl.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
      if (screenshots[safe]) return safe;
      var keys = Object.keys(screenshots);
      for (var i = 0; i < keys.length; i++) {
        if (safe.indexOf(keys[i]) !== -1 || keys[i].indexOf(safe) !== -1) return keys[i];
      }
      return keys.length > 0 ? keys[0] : null;
    }

    function loadHistoryIntoSlot(entry, slotIndex) {
      if (!entry || !entry.zipBlob) return;
      JSZip.loadAsync(entry.zipBlob).then(function (zip) {
        return parseZipToSession(zip);
      }).then(function (session) {
        if (slotIndex === 0) {
          App.metadata = session.metadata;
          App.clicks = session.clicks;
          App.moves = session.moves;
          App.scrolls = session.scrolls;
          App.screenshots = session.screenshots;
          document.getElementById('slot-a').classList.add('loaded');
          document.getElementById('slot-a-file').textContent = entry.name;
        } else {
          App.sessionB = session;
          document.getElementById('slot-b').classList.add('loaded');
          document.getElementById('slot-b-file').textContent = entry.name;
        }
        if (App.metadata && App.sessionB) showCompareViewer();
      });
    }

    function updateView() {
      if (App.mode === 'compare' && App.sessionB) {
        renderCompareView();
      } else {
        renderHeatmap();
      }
    }

    /* ── Render Session ─────────────────────── */
    function renderSession() {
      $importZone.classList.add('hidden');
      $historySection.classList.add('hidden');
      $viewer.classList.remove('hidden');
      var $ha = document.getElementById('header-actions');
      $ha.classList.remove('hidden');
      $ha.style.display = 'flex';

      var m = App.metadata || {};
      document.getElementById('s-date').textContent = m.startTime
        ? new Date(m.startTime).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';
      document.getElementById('s-duration').textContent = m.durationMs ? formatDuration(m.durationMs) : '—';
      document.getElementById('s-pages').textContent = (m.pages || []).length;
      document.getElementById('s-clicks').textContent = m.totalClicks || App.clicks.length;
      document.getElementById('s-moves').textContent = m.totalMouseSamples || App.moves.length;

      PageSelect.clear();
      var pages = m.pages || [];
      var uniqueUrls = [];
      pages.forEach(function (p) {
        if (uniqueUrls.indexOf(p.url) === -1) uniqueUrls.push(p.url);
      });
      if (uniqueUrls.length === 0) {
        var urlSet = {};
        App.clicks.concat(App.moves).concat(App.scrolls).forEach(function (e) {
          if (e.page) urlSet[e.page] = true;
        });
        uniqueUrls = Object.keys(urlSet);
      }
      uniqueUrls.forEach(function (url, i) {
        var pageInfo = pages.find(function (p) { return p.url === url; });
        var title = (pageInfo && pageInfo.title) ? pageInfo.title : 'Page ' + (i + 1);
        PageSelect.addOption(url, title, shortenUrl(url));
      });

      if (uniqueUrls.length > 0) {
        PageSelect.selectFirst();
        App.currentPage = uniqueUrls[0];
      }

      updatePageCounter();
      renderDataTable();
      renderHeatmap();
    }

    /* ── Heatmap Rendering ──────────────────── */
    function renderHeatmap() {
      if (!App.currentPage) return;

      var ssKey = findScreenshotKey(App.currentPage);
      var ssBlob = ssKey ? App.screenshots[ssKey] : null;

      if (ssBlob) {
        createImageBitmap(ssBlob).then(function (img) {
          drawWithBackground(img, img.width, img.height);
        });
      } else {
        var pageInfo = (App.metadata && App.metadata.pages || []).find(function (p) { return p.url === App.currentPage; });
        var w = (pageInfo && pageInfo.pageW) || 1200;
        var h = (pageInfo && pageInfo.pageH) || 800;
        drawWithBackground(null, w, h);
      }
    }

    function drawWithBackground(bgImg, w, h) {
      $canvas.width = w;
      $canvas.height = h;

      if (bgImg) {
        $ctx.drawImage(bgImg, 0, 0);
      } else {
        $ctx.fillStyle = '#f0f0f0';
        $ctx.fillRect(0, 0, w, h);
        $ctx.fillStyle = '#999';
        $ctx.font = '16px sans-serif';
        $ctx.fillText('No screenshot available for this page', 20, 40);
      }

      var overlay = null;
      var type = App.currentType;

      if (type === 'clicks') {
        var pts = aggregatePoints(filterByPage(App.clicks));
        overlay = renderPointHeatmap(w, h, pts, App.radius);
      } else if (type === 'movement') {
        var mpts = aggregatePoints(filterByPage(App.moves));
        overlay = renderPointHeatmap(w, h, mpts, App.radius);
      } else if (type === 'scroll') {
        overlay = renderScrollDepth(w, h, filterByPage(App.scrolls));
      } else if (type === 'dwell') {
        var dpts = computeDwell(filterByPage(App.moves));
        overlay = renderPointHeatmap(w, h, dpts, App.radius);
      }

      if (overlay) {
        $ctx.globalAlpha = App.opacity;
        $ctx.drawImage(overlay, 0, 0);
        $ctx.globalAlpha = 1;
      }

      applyCanvasDisplaySize();
      renderPageStats();
      renderClickPath();
    }

    function applyCanvasDisplaySize() {
      var cw = $canvas.width;
      var ch = $canvas.height;
      if (cw <= 0 || ch <= 0) return;

      if (App.viewMode === 'original') {
        $canvas.style.width = '';
        $canvas.style.height = '';
        updateZoomLabel();
        return;
      }

      var vp = document.getElementById('viewport');
      var availW = vp.clientWidth - 32;
      var maxH = window.innerHeight * 0.72;
      var baseScale = Math.min(availW / cw, maxH / ch, 1);
      var scale = baseScale * App.zoomLevel;
      $canvas.style.width = Math.round(cw * scale) + 'px';
      $canvas.style.height = Math.round(ch * scale) + 'px';
      updateZoomLabel();
    }

    function updateZoomLabel() {
      var el = document.getElementById('zoom-level');
      if (!el) return;
      if (App.viewMode === 'original') {
        el.textContent = '1:1';
      } else {
        el.textContent = Math.round(App.zoomLevel * 100) + '%';
      }
    }

    function filterByPage(events) {
      var page = App.currentPage;
      return events.filter(function (e) { return e.page === page; });
    }

    function findScreenshotKey(pageUrl) {
      var safe = pageUrl.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
      if (App.screenshots[safe]) return safe;
      var keys = Object.keys(App.screenshots);
      for (var i = 0; i < keys.length; i++) {
        if (safe.indexOf(keys[i]) !== -1 || keys[i].indexOf(safe) !== -1) return keys[i];
      }
      return keys.length > 0 ? keys[0] : null;
    }

    /* ── Point Heatmap ──────────────────────── */
    function aggregatePoints(events) {
      var grid = {};
      var gs = 5;
      for (var i = 0; i < events.length; i++) {
        var x = events[i].x;
        var y = events[i].y;
        if (x == null || y == null) continue;
        var gx = Math.round(x / gs) * gs;
        var gy = Math.round(y / gs) * gs;
        var key = gx + ',' + gy;
        if (!grid[key]) grid[key] = { x: gx, y: gy, value: 0 };
        grid[key].value++;
      }
      return Object.values(grid);
    }

    function computeDwell(moves) {
      var zones = {};
      var zoneSize = 50;
      for (var i = 0; i < moves.length - 1; i++) {
        var dt = moves[i + 1].ts - moves[i].ts;
        if (dt > 2000 || dt < 0) continue;
        var zx = Math.floor(moves[i].x / zoneSize) * zoneSize + zoneSize / 2;
        var zy = Math.floor(moves[i].y / zoneSize) * zoneSize + zoneSize / 2;
        var key = zx + ',' + zy;
        if (!zones[key]) zones[key] = { x: zx, y: zy, value: 0 };
        zones[key].value += dt;
      }
      return Object.values(zones);
    }

    function createPalette() {
      var c = document.createElement('canvas');
      c.width = 256; c.height = 1;
      var ctx = c.getContext('2d');
      var g = ctx.createLinearGradient(0, 0, 256, 0);
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

    var _palette = null;
    function palette() {
      if (!_palette) _palette = createPalette();
      return _palette;
    }

    function renderPointHeatmap(w, h, points, radius) {
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      if (points.length === 0) return canvas;

      var shadow = document.createElement('canvas');
      shadow.width = w;
      shadow.height = h;
      var sctx = shadow.getContext('2d');

      var maxVal = 0;
      for (var i = 0; i < points.length; i++) {
        if (points[i].value > maxVal) maxVal = points[i].value;
      }
      if (maxVal === 0) return canvas;

      for (var j = 0; j < points.length; j++) {
        var p = points[j];
        var alpha = Math.min(p.value / maxVal, 1);
        var grad = sctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        grad.addColorStop(0, 'rgba(0,0,0,' + alpha + ')');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        sctx.fillStyle = grad;
        sctx.beginPath();
        sctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        sctx.fill();
      }

      var imgData = sctx.getImageData(0, 0, w, h);
      var px = imgData.data;
      var pal = palette();
      for (var k = 0; k < px.length; k += 4) {
        var a = px[k + 3];
        if (a > 2) {
          var idx = a * 4;
          px[k] = pal[idx];
          px[k + 1] = pal[idx + 1];
          px[k + 2] = pal[idx + 2];
          px[k + 3] = a < 15 ? 0 : Math.min(a + 80, 220);
        }
      }
      sctx.putImageData(imgData, 0, 0);
      canvas.getContext('2d').drawImage(shadow, 0, 0);
      return canvas;
    }

    /* ── Scroll Depth ───────────────────────── */
    function renderScrollDepth(w, h, scrollEvents) {
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      if (scrollEvents.length === 0) return canvas;
      var ctx = canvas.getContext('2d');

      var actualPageH = h;
      for (var i = 0; i < scrollEvents.length; i++) {
        var ev = scrollEvents[i];
        if (ev.pageH && ev.pageH > actualPageH) actualPageH = ev.pageH;
        var reach = (ev.scrollY || 0) + (ev.viewportH || 0);
        if (reach > actualPageH) actualPageH = reach;
      }

      var bucketSize = 4;
      var bucketCount = Math.ceil(actualPageH / bucketSize);
      var exposure = new Float32Array(bucketCount);

      for (var j = 0; j < scrollEvents.length; j++) {
        var ev = scrollEvents[j];
        var top = Math.floor((ev.scrollY || 0) / bucketSize);
        var bottom = Math.min(Math.ceil(((ev.scrollY || 0) + (ev.viewportH || 0)) / bucketSize), bucketCount);
        for (var b = top; b < bottom; b++) {
          exposure[b]++;
        }
      }

      var maxExp = 0;
      for (var m = 0; m < exposure.length; m++) {
        if (exposure[m] > maxExp) maxExp = exposure[m];
      }
      if (maxExp === 0) return canvas;

      var scale = h / actualPageH;

      for (var n = 0; n < bucketCount; n++) {
        var ratio = exposure[n] / maxExp;
        if (ratio > 0.01) {
          var r = Math.round(255 * (1 - ratio));
          var g = Math.round(200 * ratio);
          var drawY = Math.floor(n * bucketSize * scale);
          var drawH = Math.max(Math.ceil(bucketSize * scale), 1);
          ctx.fillStyle = 'rgba(' + r + ',' + g + ',60,0.35)';
          ctx.fillRect(0, drawY, w, drawH);
        }
      }

      var maxDepthPct = 0;
      for (var p = 0; p < scrollEvents.length; p++) {
        var pct = ((scrollEvents[p].scrollY || 0) + (scrollEvents[p].viewportH || 0)) / actualPageH * 100;
        if (pct > maxDepthPct) maxDepthPct = pct;
      }

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, h - 28, w, 28);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('Scroll Depth — Green = high exposure, Red = low  |  Max depth: ' + Math.round(maxDepthPct) + '%', 12, h - 10);

      return canvas;
    }

    /* ── Click Path Analysis ──────────────── */
    function formatClickTime(ts) {
      if (!ts) return '';
      var d = new Date(ts);
      return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function describeElement(el) {
      if (!el) return 'unknown';
      var parts = [];
      if (el.tag) parts.push(el.tag);
      if (el.id) parts.push('#' + el.id);
      if (el.text) {
        var t = el.text.length > 30 ? el.text.slice(0, 27) + '...' : el.text;
        parts.push('"' + t + '"');
      }
      return parts.length ? parts.join(' ') : 'element';
    }

    function buildFlowHtml(steps) {
      if (!steps.length) return '<div class="click-path-empty">No clicks recorded</div>';
      var html = '';
      steps.forEach(function (step, i) {
        if (i > 0) html += '<span class="cf-arrow">\u2192</span>';
        var cls = step.isPage ? 'cf-chip cf-page' : 'cf-chip';
        html += '<div class="' + cls + '">';
        html += '<span class="cf-label">' + escapeHtml(step.label) + '</span>';
        html += '<span class="cf-meta">' + escapeHtml(step.meta) + '</span>';
        html += '</div>';
      });
      return html;
    }

    function renderClickPath() {
      var section = document.getElementById('click-path-section');
      var $session = document.getElementById('click-path-session');
      var $page = document.getElementById('click-path-page');

      if (!App.clicks || App.clicks.length === 0) {
        section.classList.add('hidden');
        return;
      }
      section.classList.remove('hidden');

      var sorted = App.clicks.slice().sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });

      var sessionSteps = [];
      var lastPage = null;
      sorted.forEach(function (c) {
        var pg = c.page || '';
        if (pg !== lastPage) {
          var pageInfo = (App.metadata && App.metadata.pages || []).find(function (p) { return p.url === pg; });
          var pageLabel = (pageInfo && pageInfo.title) ? pageInfo.title : shortenUrl(pg);
          sessionSteps.push({ isPage: true, label: pageLabel, meta: shortenUrl(pg) });
          lastPage = pg;
        }
        sessionSteps.push({
          isPage: false,
          label: describeElement(c.element),
          meta: formatClickTime(c.ts) + '  (' + c.x + ', ' + c.y + ')'
        });
      });
      $session.innerHTML = buildFlowHtml(sessionSteps);

      var pageClicks = sorted.filter(function (c) { return c.page === App.currentPage; });
      var pageSteps = [];
      pageClicks.forEach(function (c, i) {
        pageSteps.push({
          isPage: false,
          label: (i + 1) + '. ' + describeElement(c.element),
          meta: formatClickTime(c.ts) + '  (' + c.x + ', ' + c.y + ')'
        });
      });
      $page.innerHTML = buildFlowHtml(pageSteps);
    }

    /* ── Page Stats ─────────────────────────── */
    function renderPageStats() {
      var $stats = document.getElementById('page-stats');
      var pageClicks = filterByPage(App.clicks);
      var pageMoves = filterByPage(App.moves);
      var pageScrolls = filterByPage(App.scrolls);

      if (pageClicks.length + pageMoves.length + pageScrolls.length === 0) {
        $stats.classList.add('hidden');
        return;
      }
      $stats.classList.remove('hidden');

      var maxScroll = 0;
      var pageH = 1;
      pageScrolls.forEach(function (s) {
        if (s.scrollY + s.viewportH > maxScroll) maxScroll = s.scrollY + s.viewportH;
        if (s.pageH > pageH) pageH = s.pageH;
      });

      var timeOnPage = calcPageTimeSpent(App.currentPage, App.clicks, App.moves, App.scrolls);

      var html = '<div class="stats-summary">' +
        '<div class="stat-item"><div class="stat-label">Time on page</div><div class="stat-value accent">' + formatDuration(timeOnPage) + '</div></div>' +
        '<div class="stat-item"><div class="stat-label">Clicks on page</div><div class="stat-value">' + pageClicks.length + '</div></div>' +
        '<div class="stat-item"><div class="stat-label">Mouse samples</div><div class="stat-value">' + pageMoves.length + '</div></div>' +
        '<div class="stat-item"><div class="stat-label">Scroll depth</div><div class="stat-value">' + Math.round(maxScroll / pageH * 100) + '%</div></div>' +
        '</div>';

      var topElements = {};
      var topElementMeta = {};
      pageClicks.forEach(function (c) {
        if (!c.element) return;
        var selector = c.element.tag + (c.element.id ? '#' + c.element.id : '') +
          (c.element.classes ? '.' + c.element.classes.split(' ')[0] : '');
        var textLabel = c.element.text ? c.element.text.slice(0, 30) : '';
        topElements[selector] = (topElements[selector] || 0) + 1;
        if (!topElementMeta[selector]) topElementMeta[selector] = textLabel;
      });
      var sorted = Object.entries(topElements).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 10);

      if (sorted.length > 0) {
        var totalClicks = pageClicks.length || 1;
        html += '<h3>Top Clicked Elements</h3>' +
          '<table class="elements-table"><thead><tr>' +
          '<th class="rank">#</th><th>Element</th><th>Text</th><th>Clicks</th><th>% of Total</th>' +
          '</tr></thead><tbody>';

        sorted.forEach(function (pair, idx) {
          var pct = (pair[1] / totalClicks * 100).toFixed(1);
          var textVal = topElementMeta[pair[0]] || '';
          html += '<tr>' +
            '<td class="rank">' + (idx + 1) + '</td>' +
            '<td><span class="el-tag">' + escapeHtml(pair[0]) + '</span></td>' +
            '<td class="el-text">' + (textVal ? escapeHtml(textVal) : '<span style="color:var(--border)">—</span>') + '</td>' +
            '<td class="click-count">' + pair[1] + '</td>' +
            '<td class="click-pct">' + pct + '%</td>' +
            '</tr>';
        });

        html += '</tbody></table>';
      }

      $stats.innerHTML = html;
    }

    /* ── Data Table ─────────────────────────── */
    function renderDataTable() {
      var all = App.clicks.concat(App.moves).concat(App.scrolls);
      all.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });

      document.getElementById('event-count').textContent = all.length;
      var $body = document.getElementById('data-body');
      $body.innerHTML = '';

      var limit = Math.min(all.length, 2000);
      for (var i = 0; i < limit; i++) {
        var e = all[i];
        var tr = document.createElement('tr');
        var elStr = e.element
          ? e.element.tag + (e.element.id ? '#' + e.element.id : '') +
            (e.element.text ? ' "' + e.element.text.slice(0, 20) + '"' : '')
          : '';
        tr.innerHTML =
          '<td>' + (e.type || '') + '</td>' +
          '<td title="' + escapeHtml(e.page || '') + '">' + shortenUrl(e.page || '') + '</td>' +
          '<td>' + (e.x != null ? Math.round(e.x) : '') + '</td>' +
          '<td>' + (e.y != null ? Math.round(e.y) : '') + '</td>' +
          '<td>' + (e.vx != null ? Math.round(e.vx) : (e.scrollX != null ? e.scrollX : '')) + '</td>' +
          '<td>' + (e.vy != null ? Math.round(e.vy) : (e.scrollY != null ? e.scrollY : '')) + '</td>' +
          '<td>' + (e.ts ? new Date(e.ts).toLocaleTimeString() : '') + '</td>' +
          '<td title="' + escapeHtml(elStr) + '">' + escapeHtml(elStr) + '</td>';
        $body.appendChild(tr);
      }

      if (all.length > limit) {
        var tr2 = document.createElement('tr');
        tr2.innerHTML = '<td colspan="8" style="text-align:center;color:var(--text-dim);">Showing first ' + limit + ' of ' + all.length + ' events. Export JSON/CSV for full data.</td>';
        $body.appendChild(tr2);
      }
    }

    /* ── Controls ───────────────────────────── */
    function updatePageCounter() {
      var total = PageSelect.length;
      var current = PageSelect.selectedIndex + 1;
      document.getElementById('page-counter').textContent = current + ' of ' + total;
    }

    PageSelect.onChange(function () {
      App.currentPage = PageSelect.value;
      App.zoomLevel = 1;
      updatePageCounter();
      updateView();
    });

    document.getElementById('type-btns').addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      document.querySelectorAll('#type-btns button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      App.currentType = btn.dataset.type;
      updateView();
    });

    document.getElementById('view-btns').addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn || !btn.dataset.view) return;
      document.querySelectorAll('#view-btns button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      App.viewMode = btn.dataset.view;
      App.zoomLevel = 1;
      var vp = document.getElementById('viewport');
      vp.classList.remove('view-fit', 'view-original');
      vp.classList.add('view-' + App.viewMode);
      applyCanvasDisplaySize();
    });

    /* ── Zoom controls ─────────────────────────── */
    var ZOOM_MIN = 0.25, ZOOM_MAX = 5, ZOOM_STEP = 0.25, ZOOM_WHEEL_FACTOR = 0.08;

    document.getElementById('zoom-in').addEventListener('click', function () {
      if (App.viewMode !== 'fit') return;
      App.zoomLevel = Math.min(ZOOM_MAX, +(App.zoomLevel + ZOOM_STEP).toFixed(2));
      applyCanvasDisplaySize();
    });
    document.getElementById('zoom-out').addEventListener('click', function () {
      if (App.viewMode !== 'fit') return;
      App.zoomLevel = Math.max(ZOOM_MIN, +(App.zoomLevel - ZOOM_STEP).toFixed(2));
      applyCanvasDisplaySize();
    });
    document.getElementById('zoom-reset').addEventListener('click', function () {
      App.zoomLevel = 1;
      applyCanvasDisplaySize();
      var vp = document.getElementById('viewport');
      vp.scrollTop = 0;
      vp.scrollLeft = 0;
    });

    document.getElementById('viewport').addEventListener('wheel', function (e) {
      if (App.viewMode !== 'fit') return;
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      var vp = document.getElementById('viewport');
      var canvasRect = $canvas.getBoundingClientRect();
      var vpRect = vp.getBoundingClientRect();

      var cursorXInCanvas = (e.clientX - canvasRect.left) / canvasRect.width;
      var cursorYInCanvas = (e.clientY - canvasRect.top) / canvasRect.height;

      var oldZoom = App.zoomLevel;
      var direction = e.deltaY < 0 ? 1 : -1;
      App.zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX,
        +(App.zoomLevel + direction * ZOOM_WHEEL_FACTOR * App.zoomLevel).toFixed(2)
      ));

      applyCanvasDisplaySize();

      var newW = parseFloat($canvas.style.width);
      var newH = parseFloat($canvas.style.height);
      var targetX = cursorXInCanvas * newW;
      var targetY = cursorYInCanvas * newH;
      vp.scrollLeft = targetX - (e.clientX - vpRect.left);
      vp.scrollTop = targetY - (e.clientY - vpRect.top);
    }, { passive: false });

    window.addEventListener('resize', function () {
      if (App.viewMode === 'fit' && $canvas.width > 0) applyCanvasDisplaySize();
    });

    document.getElementById('radius-range').addEventListener('input', function (e) {
      App.radius = parseInt(e.target.value);
      document.getElementById('radius-val').textContent = App.radius;
      updateView();
    });

    document.getElementById('opacity-range').addEventListener('input', function (e) {
      App.opacity = parseInt(e.target.value) / 100;
      document.getElementById('opacity-val').textContent = e.target.value;
      updateView();
    });

    document.getElementById('btn-new').addEventListener('click', function () {
      App.metadata = null;
      App.clicks = [];
      App.moves = [];
      App.scrolls = [];
      App.screenshots = {};
      App.currentPage = null;
      App.currentHistoryId = null;
      App.sessionB = null;

      $viewer.classList.add('hidden');
      document.getElementById('compare-viewport').classList.add('hidden');
      document.getElementById('viewport').classList.remove('hidden');
      document.getElementById('session-bar').classList.remove('hidden');
      document.getElementById('page-stats').classList.remove('hidden');
      document.getElementById('click-path-section').classList.remove('hidden');
      document.getElementById('data-section').classList.remove('hidden');

      var $ha = document.getElementById('header-actions');
      $ha.classList.add('hidden');
      $ha.style.display = 'none';
      $fileInput.value = '';

      var slotA = document.getElementById('slot-a');
      var slotB = document.getElementById('slot-b');
      slotA.classList.remove('loaded');
      slotB.classList.remove('loaded');
      document.getElementById('slot-a-file').textContent = '';
      document.getElementById('slot-b-file').textContent = '';
      document.getElementById('file-input-a').value = '';
      document.getElementById('file-input-b').value = '';

      if (App.mode === 'single') {
        $importZone.classList.remove('hidden');
        document.getElementById('compare-import').classList.add('hidden');
      } else {
        $importZone.classList.add('hidden');
        document.getElementById('compare-import').classList.remove('hidden');
      }

      renderHistory();
    });

    /* ── Export Functions ────────────────────── */
    document.getElementById('btn-pdf').addEventListener('click', exportPDF);
    document.getElementById('btn-png').addEventListener('click', exportPNG);
    document.getElementById('btn-csv').addEventListener('click', exportCSV);
    document.getElementById('btn-png-a').addEventListener('click', function () { exportPanelPNG('canvas-a', 'session-a'); });
    document.getElementById('btn-png-b').addEventListener('click', function () { exportPanelPNG('canvas-b', 'session-b'); });
    document.getElementById('btn-png-combined').addEventListener('click', exportComparePNG);

    /* ── Time per page ────────────────────────── */
    function calcPageTimeSpent(pageUrl, clicks, moves, scrolls) {
      var events = clicks.concat(moves).concat(scrolls)
        .filter(function (e) { return e.page === pageUrl && e.ts; });
      if (events.length < 2) return 0;
      var min = Infinity, max = 0;
      for (var i = 0; i < events.length; i++) {
        if (events[i].ts < min) min = events[i].ts;
        if (events[i].ts > max) max = events[i].ts;
      }
      return max - min;
    }

    /* ── Render page to off-screen canvas (for PDF) ── */
    function renderPageCanvas(pageUrl, clicks, moves, scrolls, screenshots, metadata) {
      return new Promise(function (resolve) {
        var pageClicks = clicks.filter(function (e) { return e.page === pageUrl; });
        var pageMoves = moves.filter(function (e) { return e.page === pageUrl; });
        var pageScrolls = scrolls.filter(function (e) { return e.page === pageUrl; });

        var ssKey = findScreenshotKeyForSession(pageUrl, screenshots);
        var ssBlob = ssKey ? screenshots[ssKey] : null;

        function draw(bgImg, w, h) {
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          var cx = c.getContext('2d');
          if (bgImg) { cx.drawImage(bgImg, 0, 0); }
          else { cx.fillStyle = '#f0f0f0'; cx.fillRect(0, 0, w, h); }

          var overlay = null;
          var type = App.currentType;
          if (type === 'clicks') overlay = renderPointHeatmap(w, h, aggregatePoints(pageClicks), App.radius);
          else if (type === 'movement') overlay = renderPointHeatmap(w, h, aggregatePoints(pageMoves), App.radius);
          else if (type === 'scroll') overlay = renderScrollDepth(w, h, pageScrolls);
          else if (type === 'dwell') overlay = renderPointHeatmap(w, h, computeDwell(pageMoves), App.radius);

          if (overlay) { cx.globalAlpha = App.opacity; cx.drawImage(overlay, 0, 0); cx.globalAlpha = 1; }

          var maxScr = 0, pH = 1;
          pageScrolls.forEach(function (s) {
            if (s.scrollY + s.viewportH > maxScr) maxScr = s.scrollY + s.viewportH;
            if (s.pageH > pH) pH = s.pageH;
          });

          var topEl = {};
          var topElMeta = {};
          pageClicks.forEach(function (cl) {
            if (!cl.element) return;
            var sel = cl.element.tag + (cl.element.id ? '#' + cl.element.id : '') + (cl.element.classes ? '.' + cl.element.classes.split(' ')[0] : '');
            topEl[sel] = (topEl[sel] || 0) + 1;
            if (!topElMeta[sel]) topElMeta[sel] = (cl.element.text || '').slice(0, 30);
          });
          var sorted = Object.entries(topEl).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);

          resolve({
            canvas: c,
            clicks: pageClicks.length,
            moves: pageMoves.length,
            scrollPct: Math.round(maxScr / pH * 100),
            topElements: sorted,
            topElementMeta: topElMeta,
            timeSpent: calcPageTimeSpent(pageUrl, clicks, moves, scrolls),
          });
        }

        if (ssBlob) {
          createImageBitmap(ssBlob).then(function (img) { draw(img, img.width, img.height); });
        } else {
          var pi = (metadata && metadata.pages || []).find(function (p) { return p.url === pageUrl; });
          draw(null, (pi && pi.pageW) || 1200, (pi && pi.pageH) || 800);
        }
      });
    }

    function exportPDF() {
      if (App.mode === 'compare' && App.sessionB) return exportComparePDF();
      var jsPDF = window.jspdf.jsPDF;
      var m = App.metadata || {};
      var pages = getSessionPages(App.metadata, App.clicks, App.moves, App.scrolls);

      var promises = pages.map(function (url) {
        return renderPageCanvas(url, App.clicks, App.moves, App.scrolls, App.screenshots, App.metadata);
      });

      Promise.all(promises).then(function (results) {
        var doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        var PW = 842, PH = 595;

        doc.setFontSize(22);
        doc.text('Heatmap Research Report', 40, 50);
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.text('Generated by Heatmap Research Viewer v1.3.0', 40, 68);
        doc.setTextColor(0);

        var y = 100;
        doc.setFontSize(13);
        var fields = [
          ['Session Date', m.startTime ? new Date(m.startTime).toLocaleString() : '—'],
          ['Duration', m.durationMs ? formatDuration(m.durationMs) : '—'],
          ['Total Pages', String(pages.length)],
          ['Total Clicks', String(m.totalClicks || App.clicks.length)],
          ['Heatmap Type', App.currentType],
          ['Radius / Intensity', App.radius + 'px / ' + Math.round(App.opacity * 100) + '%'],
        ];
        fields.forEach(function (f) {
          doc.setFont(undefined, 'bold');
          doc.text(f[0] + ': ', 40, y);
          doc.setFont(undefined, 'normal');
          doc.text(f[1], 40 + doc.getTextWidth(f[0] + ': '), y);
          y += 20;
        });

        results.forEach(function (r, idx) {
          var pageUrl = pages[idx];
          var pageInfo = (m.pages || []).find(function (p) { return p.url === pageUrl; });
          var title = (pageInfo && pageInfo.title) || 'Page ' + (idx + 1);

          var ratio = r.canvas.width / r.canvas.height;
          var orient = ratio >= 1 ? 'landscape' : 'portrait';
          doc.addPage('a4', orient);
          var pw = orient === 'landscape' ? 842 : 595;
          var ph = orient === 'landscape' ? 595 : 842;

          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text(title, 20, 20);
          doc.setFont(undefined, 'normal');
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(shortenUrl(pageUrl), 20, 30);
          doc.setTextColor(0);

          var imgTop = 36;
          var statsH = 90;
          var imgData = r.canvas.toDataURL('image/png');
          var maxW = pw - 40, maxH = ph - imgTop - statsH;
          var imgW, imgH;
          if (ratio > maxW / maxH) { imgW = maxW; imgH = imgW / ratio; }
          else { imgH = maxH; imgW = imgH * ratio; }
          doc.addImage(imgData, 'PNG', 20, imgTop, imgW, imgH);

          var sy = imgTop + imgH + 10;
          doc.setFontSize(8);
          doc.text('Time on page: ' + formatDuration(r.timeSpent) + '    |    Clicks: ' + r.clicks + '    |    Mouse samples: ' + r.moves + '    |    Scroll depth: ' + r.scrollPct + '%', 20, sy);

          if (r.topElements.length > 0 && sy + 14 < ph - 8) {
            sy += 14;
            doc.setFont(undefined, 'bold');
            doc.text('Top clicked:', 20, sy);
            doc.setFont(undefined, 'normal');
            var elParts = r.topElements.map(function (pair, i) {
              var t = (i + 1) + '. ' + pair[0];
              if (r.topElementMeta[pair[0]]) t += ' "' + r.topElementMeta[pair[0]] + '"';
              return t + ' (' + pair[1] + ')';
            });
            var elLine = elParts.join('    ');
            if (doc.getTextWidth(elLine) > pw - 40) {
              elParts.forEach(function (t) {
                if (sy + 10 > ph - 6) return;
                sy += 10;
                doc.text(t, 28, sy);
              });
            } else {
              doc.text(elLine, 20 + doc.getTextWidth('Top clicked: '), sy);
            }
          }
        });

        /* ── Click Path Analysis page(s) ──────── */
        var sortedClicks = App.clicks.slice().sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
        if (sortedClicks.length > 0) {
          doc.addPage('a4', 'landscape');
          var cpW = 842, cpH = 595;
          doc.setFontSize(16);
          doc.setFont(undefined, 'bold');
          doc.text('Click Path Analysis', 40, 40);
          doc.setFont(undefined, 'normal');

          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text('Session Journey', 40, 68);
          doc.setFont(undefined, 'normal');
          doc.setFontSize(9);

          var cpY = 84;
          var lastPg = null;
          sortedClicks.forEach(function (c) {
            var pg = c.page || '';
            if (pg !== lastPg) {
              if (cpY + 24 > cpH - 20) { doc.addPage('a4', 'landscape'); cpY = 40; }
              var pgInfo = (m.pages || []).find(function (p) { return p.url === pg; });
              var pgLabel = (pgInfo && pgInfo.title) ? pgInfo.title : shortenUrl(pg);
              doc.setFont(undefined, 'bold');
              doc.setTextColor(79, 109, 245);
              doc.text('\u25B6 ' + pgLabel, 40, cpY);
              doc.setTextColor(0);
              doc.setFont(undefined, 'normal');
              cpY += 14;
              lastPg = pg;
            }
            if (cpY + 12 > cpH - 20) { doc.addPage('a4', 'landscape'); cpY = 40; }
            var elDesc = describeElement(c.element);
            var clickTime = formatClickTime(c.ts);
            doc.text('    ' + clickTime + '    ' + elDesc + '    (' + c.x + ', ' + c.y + ')', 40, cpY);
            cpY += 12;
          });

          pages.forEach(function (pageUrl, pIdx) {
            var pgClicks = sortedClicks.filter(function (c) { return c.page === pageUrl; });
            if (pgClicks.length === 0) return;
            var pgInfo = (m.pages || []).find(function (p) { return p.url === pageUrl; });
            var pgTitle = (pgInfo && pgInfo.title) || 'Page ' + (pIdx + 1);

            doc.addPage('a4', 'landscape');
            cpY = 40;
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Click Path — ' + pgTitle, 40, cpY);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            doc.setTextColor(120);
            doc.text(shortenUrl(pageUrl), 40, cpY + 12);
            doc.setTextColor(0);
            doc.setFontSize(9);
            cpY += 30;

            pgClicks.forEach(function (c, ci) {
              if (cpY + 12 > cpH - 20) { doc.addPage('a4', 'landscape'); cpY = 40; }
              var elDesc = describeElement(c.element);
              var clickTime = formatClickTime(c.ts);
              doc.text((ci + 1) + '.  ' + clickTime + '    ' + elDesc + '    (' + c.x + ', ' + c.y + ')', 40, cpY);
              cpY += 12;
            });
          });
        }

        doc.addPage();
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Raw Data Summary', 40, 40);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(12);
        var total = App.clicks.length + App.moves.length + App.scrolls.length;
        doc.text('Total events captured: ' + total.toLocaleString(), 40, 70);
        doc.text('Click events: ' + App.clicks.length.toLocaleString(), 40, 90);
        doc.text('Mouse move samples: ' + App.moves.length.toLocaleString(), 40, 110);
        doc.text('Scroll events: ' + App.scrolls.length.toLocaleString(), 40, 130);
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.text('For full event-level data, export the CSV report from the Raw Event Data section in the viewer.', 40, 160);

        doc.save('heatmap-report-' + App.currentType + '.pdf');
      });
    }

    function exportComparePDF() {
      var jsPDF = window.jspdf.jsPDF;
      var m = App.metadata || {};
      var pagesA = getSessionPages(App.metadata, App.clicks, App.moves, App.scrolls);
      var pagesB = App.sessionB ? getSessionPages(App.sessionB.metadata, App.sessionB.clicks, App.sessionB.moves, App.sessionB.scrolls) : [];
      var allPages = [];
      pagesA.forEach(function (u) { if (allPages.indexOf(u) === -1) allPages.push(u); });
      pagesB.forEach(function (u) { if (allPages.indexOf(u) === -1) allPages.push(u); });

      var promisesA = allPages.map(function (url) {
        return renderPageCanvas(url, App.clicks, App.moves, App.scrolls, App.screenshots, App.metadata);
      });
      var promisesB = allPages.map(function (url) {
        return App.sessionB
          ? renderPageCanvas(url, App.sessionB.clicks, App.sessionB.moves, App.sessionB.scrolls, App.sessionB.screenshots, App.sessionB.metadata)
          : Promise.resolve(null);
      });

      Promise.all([Promise.all(promisesA), Promise.all(promisesB)]).then(function (pair) {
        var resultsA = pair[0], resultsB = pair[1];
        var doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        var PW = 842, PH = 595;

        doc.setFontSize(20);
        doc.text('Heatmap Comparison Report', 40, 45);
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.text('Heatmap type: ' + App.currentType + '  |  Pages: ' + allPages.length, 40, 62);
        doc.setTextColor(0);

        allPages.forEach(function (url, idx) {
          doc.addPage();
          doc.setFontSize(13);
          doc.text('Page ' + (idx + 1) + ': ' + shortenUrl(url), 20, 22);

          var halfW = (PW - 50) / 2;
          var rA = resultsA[idx], rB = resultsB[idx];

          doc.setFontSize(11);
          doc.setTextColor(67, 85, 219);
          doc.text('Session A', 20, 40);
          doc.setTextColor(0);
          if (rA && rA.canvas) {
            var ratA = rA.canvas.width / rA.canvas.height;
            var aW = halfW, aH = aW / ratA;
            if (aH > PH - 100) { aH = PH - 100; aW = aH * ratA; }
            doc.addImage(rA.canvas.toDataURL('image/png'), 'PNG', 20, 46, aW, aH);
            doc.setFontSize(8);
            doc.text('Time: ' + formatDuration(rA.timeSpent) + '  |  Clicks: ' + rA.clicks + '  |  Scroll: ' + rA.scrollPct + '%', 20, 46 + aH + 10);
          }

          doc.setFontSize(11);
          doc.setTextColor(52, 211, 153);
          doc.text('Session B', halfW + 30, 40);
          doc.setTextColor(0);
          if (rB && rB.canvas) {
            var ratB = rB.canvas.width / rB.canvas.height;
            var bW = halfW, bH = bW / ratB;
            if (bH > PH - 100) { bH = PH - 100; bW = bH * ratB; }
            doc.addImage(rB.canvas.toDataURL('image/png'), 'PNG', halfW + 30, 46, bW, bH);
            doc.setFontSize(8);
            doc.text('Time: ' + formatDuration(rB.timeSpent) + '  |  Clicks: ' + rB.clicks + '  |  Scroll: ' + rB.scrollPct + '%', halfW + 30, 46 + bH + 10);
          } else {
            doc.setFontSize(10);
            doc.setTextColor(160);
            doc.text('No data for this page', halfW + 30 + halfW / 2 - 40, PH / 2);
            doc.setTextColor(0);
          }
        });

        doc.save('heatmap-comparison-' + App.currentType + '.pdf');
      });
    }

    function exportPNG() {
      var link = document.createElement('a');
      link.download = 'heatmap-' + App.currentType + '-' + Date.now() + '.png';
      link.href = $canvas.toDataURL('image/png');
      link.click();
    }

    function exportPanelPNG(canvasId, label) {
      var c = document.getElementById(canvasId);
      var link = document.createElement('a');
      link.download = 'heatmap-' + label + '-' + App.currentType + '-' + Date.now() + '.png';
      link.href = c.toDataURL('image/png');
      link.click();
    }

    function exportComparePNG() {
      var cA = document.getElementById('canvas-a');
      var cB = document.getElementById('canvas-b');
      var gap = 16;
      var combined = document.createElement('canvas');
      combined.width = cA.width + cB.width + gap;
      combined.height = Math.max(cA.height, cB.height);
      var ctx = combined.getContext('2d');
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#151528';
      ctx.fillRect(0, 0, combined.width, combined.height);
      ctx.drawImage(cA, 0, 0);
      ctx.drawImage(cB, cA.width + gap, 0);
      var link = document.createElement('a');
      link.download = 'heatmap-comparison-' + App.currentType + '-' + Date.now() + '.png';
      link.href = combined.toDataURL('image/png');
      link.click();
    }

    function exportCSV() {
      var allEvents = App.clicks.concat(App.moves).concat(App.scrolls);
      if (App.mode === 'compare' && App.sessionB) {
        var bEvents = App.sessionB.clicks.concat(App.sessionB.moves).concat(App.sessionB.scrolls);
        bEvents = bEvents.map(function (e) { var c = Object.assign({}, e); c._session = 'B'; return c; });
        allEvents = allEvents.map(function (e) { var c = Object.assign({}, e); c._session = 'A'; return c; });
        allEvents = allEvents.concat(bEvents);
      }
      allEvents.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
      var hasSession = App.mode === 'compare';
      var header = hasSession ? 'session,' : '';
      var lines = [header + 'type,page,x,y,viewportX,viewportY,scrollX,scrollY,timestamp,isoTime,element'];
      allEvents.forEach(function (e) {
        var el = e.element
          ? e.element.tag + (e.element.id ? '#' + e.element.id : '')
          : '';
        var prefix = hasSession ? (e._session || 'A') + ',' : '';
        lines.push(prefix + [
          e.type,
          '"' + (e.page || '') + '"',
          e.x != null ? Math.round(e.x) : '',
          e.y != null ? Math.round(e.y) : '',
          e.vx || '', e.vy || '',
          e.scrollX || '', e.scrollY || '',
          e.ts || '',
          e.ts ? new Date(e.ts).toISOString() : '',
          '"' + el + '"',
        ].join(','));
      });
      var filename = hasSession ? 'heatmap-comparison.csv' : 'heatmap-data.csv';
      downloadText(lines.join('\n'), filename, 'text/csv');
    }

    function downloadText(content, filename, mime) {
      var blob = new Blob([content], { type: mime });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }

    /* ── Utilities ──────────────────────────── */
    function formatDuration(ms) {
      var s = Math.floor(ms / 1000);
      var m = Math.floor(s / 60);
      s = s % 60;
      if (m > 0) return m + 'm ' + s + 's';
      return s + 's';
    }

    function shortenUrl(url) {
      if (!url) return '';
      try {
        var u = new URL(url);
        return u.pathname + u.hash;
      } catch (_) {
        return url.length > 60 ? url.slice(0, 57) + '...' : url;
      }
    }

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* ── Theme Toggle ────────────────────────── */
    function getStoredTheme() {
      try { return localStorage.getItem('heatmap_viewer_theme'); } catch (_) { return null; }
    }
    function setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      try { localStorage.setItem('heatmap_viewer_theme', theme); } catch (_) {}
      // Both icons always visible; toggle position indicates current mode
    }
    function initTheme() {
      var stored = getStoredTheme();
      if (stored) {
        setTheme(stored);
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        setTheme('light');
      } else {
        setTheme('dark');
      }
    }
    document.getElementById('theme-toggle').addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
    initTheme();

    /* ── Mode Toggle ─────────────────────────── */
    document.getElementById('mode-btns').addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn || !btn.dataset.mode) return;
      switchMode(btn.dataset.mode);
    });

    /* ── Init ────────────────────────────────── */
    setupCompareImport();
    openHistoryDB().then(function (db) {
      App.historyDb = db;
      return renderHistory();
    }).catch(function (err) {
      console.warn('[HeatmapViewer] History DB unavailable:', err.message);
    });
  })();
