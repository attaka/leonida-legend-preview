// Leonida Legend — GTA VI trophy guide & tracker.
// Plain browser JavaScript, no dependencies, works offline.
// Progress lives in localStorage under one key; export/import moves it between devices.

(function () {
  'use strict';

  var STORAGE_KEY = 'leonida-legend-progress-v1';
  var GRADES = ['Platinum', 'Gold', 'Silver', 'Bronze'];

  var data = null;
  var state = loadState();
  var filters = { q: '', kind: 'All', grade: 'All', status: 'all' };

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        return {
          earned: parsed.earned || {},
          hideSpoilers: parsed.hideSpoilers !== false
        };
      }
    } catch (e) { /* storage unavailable: run in-memory */ }
    return { earned: {}, hideSpoilers: true };
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function el(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function sourceUrl(name) {
    var found = null;
    data.meta.sources.forEach(function (s) {
      if (s.name.indexOf(name) === 0) found = s.url;
    });
    return found;
  }

  function isMasked(t) {
    return state.hideSpoilers && t.spoiler && !state.earned[t.id];
  }

  /* ---------------- rendering ---------------- */

  function renderFacts() {
    var labels = {
      difficulty: 'Platinum difficulty',
      timeToPlatinum: 'Time to platinum',
      playthroughs: 'Playthroughs',
      hardestTrophy: 'Hardest trophy',
      missables: 'Missables',
      missionReplay: 'Mission replay',
      cheats: 'Cheats',
      difficultySettings: 'Difficulty settings'
    };
    el('facts').innerHTML = Object.keys(labels).map(function (k) {
      return '<div><dt>' + esc(labels[k]) + '</dt><dd>' + esc(data.meta.facts[k]) + '</dd></div>';
    }).join('');
  }

  function renderMissable() {
    var missables = data.trophies.filter(function (t) { return t.missable; });
    if (!missables.length) return;
    var t = missables[0];
    el('missable-text').innerHTML =
      '<strong>' + esc(t.name) + '</strong> — one meditation in Chapter 1, on the balcony at Jason\u2019s house ' +
      'with Lucia, may be required for this trophy and cannot be repeated later. Do it when she suggests it, ' +
      'and keep a manual save before leaving Chapter 1. Full details in its checklist entry below.';
    el('missable-alert').hidden = false;
  }

  function renderRoadmap() {
    el('roadmap-steps').innerHTML = '<div class="roadmap-steps">' + data.meta.roadmap.map(function (s) {
      return '<article class="step">' +
        '<span class="step-no">STEP ' + s.step + '</span>' +
        '<h3>' + esc(s.title) + '</h3>' +
        '<p class="hours">' + esc(s.hours) + '</p>' +
        '<ul>' + s.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' +
        '</article>';
    }).join('') + '</div>';
  }

  function renderChips() {
    var kinds = ['All'];
    data.trophies.forEach(function (t) { if (kinds.indexOf(t.kind) === -1) kinds.push(t.kind); });
    el('kind-chips').innerHTML = kinds.map(function (k) {
      var n = k === 'All' ? data.trophies.length :
        data.trophies.filter(function (t) { return t.kind === k; }).length;
      return '<button type="button" class="chip' + (filters.kind === k ? ' active' : '') +
        '" data-kind="' + esc(k) + '">' + esc(k) + ' <span class="n">' + n + '</span></button>';
    }).join('');

    var grades = ['All'].concat(GRADES);
    el('grade-chips').innerHTML = grades.map(function (g) {
      var n = g === 'All' ? data.trophies.length :
        data.trophies.filter(function (t) { return t.grade === g; }).length;
      return '<button type="button" class="chip' + (filters.grade === g ? ' active' : '') +
        '" data-grade="' + esc(g) + '">' + esc(g) + ' <span class="n">' + n + '</span></button>';
    }).join('');
  }

  function renderStats() {
    var total = data.trophies.length;
    var earned = data.trophies.filter(function (t) { return state.earned[t.id]; }).length;
    el('earned-count').textContent = earned;
    el('progress-pct').textContent = Math.round((earned / total) * 100) + '%';
    el('progress-fill').style.width = ((earned / total) * 100) + '%';
    el('grade-stats').innerHTML = GRADES.map(function (g) {
      var all = data.trophies.filter(function (t) { return t.grade === g; }).length;
      var got = data.trophies.filter(function (t) { return t.grade === g && state.earned[t.id]; }).length;
      return '<span class="grade-stat">' + esc(g) + ' ' + got + '/' + all + '</span>';
    }).join('');
  }

  function matches(t) {
    if (filters.kind !== 'All' && t.kind !== filters.kind) return false;
    if (filters.grade !== 'All' && t.grade !== filters.grade) return false;
    if (filters.status === 'earned' && !state.earned[t.id]) return false;
    if (filters.status === 'remaining' && state.earned[t.id]) return false;
    if (filters.status === 'missable' && !t.missable) return false;
    if (filters.q) {
      var q = filters.q.toLowerCase();
      var hay = isMasked(t)
        ? 'story trophy hidden spoiler'
        : (t.name + ' ' + t.description + ' ' + t.guide + ' ' + t.kind + ' ' + t.grade).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function cardHtml(t) {
    var earned = !!state.earned[t.id];
    var masked = isMasked(t);
    var tags =
      '<span class="tag grade grade-' + t.grade + '">' + esc(t.grade) + '</span>' +
      '<span class="tag">' + esc(t.kind) + '</span>' +
      (t.missable ? '<span class="tag missable">Missable</span>' : '') +
      (t.secret ? '<span class="tag secret">Secret</span>' : '');

    var body;
    if (masked) {
      body =
        '<p class="masked-note">Story trophy — hidden by the spoiler setting. It unlocks on its own as you play ' +
        'the campaign. Mark it earned here, or turn off “Hide story spoilers”, to reveal it.</p>';
    } else {
      var src = t.sources.map(function (name) {
        var url = sourceUrl(name);
        return url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(name) + '</a>' : esc(name);
      }).join(' · ');
      body =
        '<p class="official">“' + esc(t.description) + '”</p>' +
        '<p class="guide">' + esc(t.guide) + '</p>' +
        '<p class="sources">Sources: ' + src + '</p>';
    }

    return '<article class="trophy grade-' + t.grade + (earned ? ' earned' : '') + (masked ? ' masked' : '') + '">' +
      '<div class="trophy-head"><span class="diamond" aria-hidden="true"></span>' +
      '<h3>' + (masked ? 'Hidden story trophy' : esc(t.name)) + '</h3></div>' +
      '<div class="tags">' + tags + '</div>' +
      body +
      '<div class="earn-row">' +
      '<input type="checkbox" id="cb-' + t.id + '" data-earn="' + t.id + '"' + (earned ? ' checked' : '') + '>' +
      '<label for="cb-' + t.id + '">Earned</label>' +
      (earned ? '<span class="done-stamp">✓ Done</span>' : '') +
      '</div></article>';
  }

  function renderList() {
    var shown = data.trophies.filter(matches);
    el('list').innerHTML = shown.map(cardHtml).join('');
    el('empty').hidden = shown.length > 0;
    el('showing').textContent = 'Showing ' + shown.length + ' of ' + data.trophies.length + ' trophies.';
  }

  function renderAll() {
    renderStats();
    renderChips();
    renderList();
  }

  /* ---------------- export / import ---------------- */

  function exportProgress() {
    var payload = {
      app: 'leonida-legend',
      version: 1,
      exportedAt: new Date().toISOString(),
      earned: Object.keys(state.earned).filter(function (id) { return state.earned[id]; })
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gta6-trophy-progress.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 400);
  }

  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(String(reader.result));
        var ids = Array.isArray(parsed) ? parsed : parsed.earned;
        if (!Array.isArray(ids)) throw new Error('no earned list');
        var valid = {};
        data.trophies.forEach(function (t) { valid[t.id] = true; });
        var next = {};
        ids.forEach(function (id) { if (valid[id]) next[id] = true; });
        state.earned = next;
        saveState();
        renderAll();
      } catch (e) {
        alert('That file does not look like an exported progress file.');
      }
    };
    reader.readAsText(file);
  }

  /* ---------------- wiring ---------------- */

  function wire() {
    el('search').addEventListener('input', function (e) {
      filters.q = e.target.value.trim();
      renderList();
    });
    el('status-filter').addEventListener('change', function (e) {
      filters.status = e.target.value;
      renderList();
    });
    el('spoiler-toggle').checked = state.hideSpoilers;
    el('spoiler-toggle').addEventListener('change', function (e) {
      state.hideSpoilers = e.target.checked;
      saveState();
      renderList();
    });
    el('kind-chips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-kind]');
      if (!b) return;
      filters.kind = b.getAttribute('data-kind');
      renderChips();
      renderList();
    });
    el('grade-chips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-grade]');
      if (!b) return;
      filters.grade = b.getAttribute('data-grade');
      renderChips();
      renderList();
    });
    el('list').addEventListener('change', function (e) {
      var id = e.target.getAttribute && e.target.getAttribute('data-earn');
      if (!id) return;
      if (e.target.checked) state.earned[id] = true;
      else delete state.earned[id];
      saveState();
      renderAll();
    });
    el('export-btn').addEventListener('click', exportProgress);
    el('import-btn').addEventListener('click', function () { el('import-file').click(); });
    el('import-file').addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) importProgress(e.target.files[0]);
      e.target.value = '';
    });
    el('reset-btn').addEventListener('click', function () {
      if (window.confirm('Clear all earned marks? This cannot be undone (unless you exported first).')) {
        state.earned = {};
        saveState();
        renderAll();
      }
    });
  }

  function renderSources() {
    el('list-note').textContent = data.meta.listNote;
    el('source-list').innerHTML = data.meta.sources.map(function (s) {
      return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a> — ' + esc(s.usedFor) + '</li>';
    }).join('');
  }

  // Deep links / screenshot states: ?grade=Silver, ?kind=Crime, ?status=remaining, ?q=bank
  function applyParams() {
    var p;
    try { p = new URLSearchParams(location.search); } catch (e) { return; }
    var g = p.get('grade');
    if (g && (g === 'All' || GRADES.indexOf(g) !== -1)) filters.grade = g;
    var k = p.get('kind');
    if (k) {
      var kinds = data.trophies.map(function (t) { return t.kind; });
      if (k === 'All' || kinds.indexOf(k) !== -1) filters.kind = k;
    }
    var s = p.get('status');
    if (s && ['all', 'earned', 'remaining', 'missable'].indexOf(s) !== -1) {
      filters.status = s;
      el('status-filter').value = s;
    }
    var q = p.get('q');
    if (q) {
      filters.q = q;
      el('search').value = q;
    }
  }

  function init(loaded) {
    data = loaded;
    renderFacts();
    renderMissable();
    renderRoadmap();
    renderSources();
    wire();
    applyParams();
    renderAll();
  }

  if (window.TROPHIES_DATA) {
    init(window.TROPHIES_DATA);
  } else {
    fetch('data/trophies.json')
      .then(function (r) { return r.json(); })
      .then(init)
      .catch(function () {
        el('list').innerHTML = '<p class="empty">Could not load the trophy data. If you opened this file directly, ' +
          'serve the app folder with any static file server and reload.</p>';
      });
  }
})();
