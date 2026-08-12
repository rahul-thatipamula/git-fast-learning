/* ============================================================
   Fast-Forward — progress, theme, and the shared top bar.
   Progress lives in localStorage so the map on the home page
   reflects what you actually finished.
   ============================================================ */

(function (global) {
  'use strict';

  var KEY = 'fastforward.progress.v1';
  var THEME_KEY = 'fastforward.theme';

  var PAGES = [
    { id: 1, file: 'level-1-basics.html', name: 'Basics' },
    { id: 2, file: 'level-2-branching.html', name: 'Branching' },
    { id: 3, file: 'level-3-github.html', name: 'GitHub' },
    { id: 4, file: 'level-4-advanced.html', name: 'Advanced' }
  ];

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : { levels: {}, xp: 0 };
    } catch (e) { return { levels: {}, xp: 0 }; }
  }
  function save(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
  }

  var Progress = {
    pages: PAGES,
    all: load,

    level: function (id) {
      var d = load();
      return d.levels[id] || { tasks: [], complete: false };
    },
    taskDone: function (levelId, taskId) {
      return this.level(levelId).tasks.indexOf(taskId) > -1;
    },
    completeTask: function (levelId, taskId, xp) {
      var d = load();
      var L = d.levels[levelId] || { tasks: [], complete: false };
      if (L.tasks.indexOf(taskId) === -1) {
        L.tasks.push(taskId);
        d.xp = (d.xp || 0) + (xp || 10);
      }
      d.levels[levelId] = L;
      save(d);
      this.paintBar();
      return d.xp;
    },
    completeLevel: function (levelId) {
      var d = load();
      var L = d.levels[levelId] || { tasks: [], complete: false };
      if (!L.complete) { L.complete = true; d.xp = (d.xp || 0) + 50; }
      d.levels[levelId] = L;
      save(d);
      this.paintBar();
    },
    resetLevel: function (levelId) {
      var d = load();
      delete d.levels[levelId];
      save(d);
    },
    resetAll: function () { save({ levels: {}, xp: 0 }); },

    xp: function () { return load().xp || 0; },

    percent: function (levelId, total) {
      var t = this.level(levelId).tasks.length;
      return total ? Math.round((t / total) * 100) : 0;
    },

    /* ---------- theme ---------- */
    theme: function () {
      try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return 'light'; }
    },
    applyTheme: function (mode) {
      var root = document.documentElement;
      if (mode === 'system') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', mode);
      try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
      var btn = document.getElementById('theme-btn');
      if (btn) btn.textContent = mode === 'system' ? 'theme: light (auto)' : 'theme: ' + mode;
    },
    cycleTheme: function () {
      var order = ['light', 'dark', 'system'];
      var next = order[(order.indexOf(this.theme()) + 1) % 3];
      this.applyTheme(next);
    },

    /* ---------- Git Cat Mascot ("Commit Kitty") ---------- */
    catHTML: function (mood) {
      mood = mood || 'happy';
      var eyeL = mood === 'wink' ? '^' : '•';
      return '<div class="git-cat-avatar mood-' + mood + '" role="img" aria-label="Git Cat Mascot">' +
               '<div class="cat-ears"><span class="ear ear-l"></span><span class="ear ear-r"></span></div>' +
               '<div class="cat-face">' +
                 '<div class="cat-eyes"><span class="eye">' + eyeL + '</span><span class="eye">•</span></div>' +
                 '<div class="cat-whiskers"><span class="w-l"></span><span class="w-r"></span></div>' +
                 '<div class="cat-nose">^</div>' +
               '</div>' +
               '<div class="cat-tail"></div>' +
             '</div>';
    },
    catSay: function (text, mood, containerId) {
      var host = document.getElementById(containerId || 'cat-guide-host');
      if (!host) return;
      host.innerHTML =
        '<div class="cat-guide-box pop-in">' +
          this.catHTML(mood) +
          '<div class="cat-speech-bubble">' +
            '<span class="cat-name">Git Cat 🐱</span>' +
            '<p>' + text + '</p>' +
          '</div>' +
        '</div>';
    },

    /* ---------- shared chrome ---------- */
    mountBar: function (current) {
      var host = document.getElementById('topbar');
      if (!host) return;
      var links = PAGES.map(function (p) {
        var cur = current === p.id ? ' aria-current="page"' : '';
        return '<a href="' + p.file + '"' + cur + '>' + p.id + '. ' + p.name + '</a>';
      }).join('');
      var refCur = current === 'reference' ? ' aria-current="page"' : '';
      var aiCur = current === 'ask-ai' ? ' aria-current="page"' : '';
      var storyCur = current === 'story' ? ' aria-current="page"' : '';
      var homeCur = current === 'home' ? ' aria-current="page"' : '';

      host.innerHTML =
        '<div class="topbar-in">' +
          '<a class="brand" href="index.html"><span class="dot"></span>Git-Fast-Learning</a>' +
          '<nav class="topnav">' +
            '<a href="index.html"' + homeCur + '>Map</a>' + links +
            '<a href="reference.html"' + refCur + '>Reference</a>' +
            '<a href="ask-ai.html"' + aiCur + '>Ask AI 🧠</a>' +
            '<a href="story.html"' + storyCur + '>One Shot ⚡</a>' +
          '</nav>' +
          '<span class="xp">XP <b id="xp-count">0</b></span>' +
          '<button class="icon-btn" id="theme-btn" type="button">theme: light</button>' +
        '</div>';

      var self = this;
      document.getElementById('theme-btn').addEventListener('click', function () { self.cycleTheme(); });
      this.applyTheme(this.theme());
      this.paintBar();
    },
    paintBar: function () {
      var el = document.getElementById('xp-count');
      if (el) el.textContent = this.xp();
    },

    toast: function (msg, isCat) {
      var host = document.querySelector('.toast-host');
      if (!host) {
        host = document.createElement('div');
        host.className = 'toast-host';
        document.body.appendChild(host);
      }
      var t = document.createElement('div');
      t.className = 'toast pop-in';
      t.innerHTML = (isCat ? '<span style="font-size:1.1rem;margin-right:.4rem">🐱</span>' : '') + msg;
      host.appendChild(t);
      setTimeout(function () { t.remove(); }, 3400);
    }
  };

  // Apply the stored theme before first paint where possible.
  Progress.applyTheme(Progress.theme());

  global.Progress = Progress;
})(window);
