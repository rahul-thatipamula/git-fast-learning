/* ============================================================
   Fast-Forward — the lab: commit graph, file panel, terminal,
   and the task checker that watches the repo after every command.
   ============================================================ */

(function (global) {
  'use strict';

  var LANE_COLORS = ['var(--lane-1)', 'var(--lane-2)', 'var(--lane-3)', 'var(--lane-4)'];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function Lab(level) {
    this.level = level;
    this.git = new GitEngine.Git(level.seed);
    this.cmdHistory = [];
    this.histIdx = -1;
    this.editing = null;
    this.activeTaskIndex = 0;
    this.showAllTasks = false;
    this.build();
    this.restoreProgress();
    this.renderAll();
    this.welcome();
  }

  var L = Lab.prototype;

  /* ---------------- DOM ---------------- */

  L.build = function () {
    var self = this;
    var host = document.getElementById('lab');
    var repoSide = document.getElementById('repo-side-host');

    var repoHTML =
      '<div class="graph-wrap"><div id="graph"></div></div>' +
      '<div class="files">' +
        '<h4>Working directory</h4>' +
        '<div class="file-list" id="file-list"></div>' +
        '<div id="editor-host"></div>' +
        '<div class="legend">click a file to edit it &middot; ' +
          '<span style="color:var(--bad)">&#9679;</span> untracked ' +
          '<span style="color:var(--warn)">&#9679;</span> modified ' +
          '<span style="color:var(--ok)">&#9679;</span> staged</div>' +
      '</div>';

    if (repoSide) {
      repoSide.innerHTML = repoHTML;
      host.innerHTML =
        '<div class="lab-head">' +
          '<span>REPO <b id="repo-branch">—</b></span>' +
          '<span class="spacer"></span>' +
          '<button class="btn-sm" id="btn-reset" type="button">reset level</button>' +
        '</div>' +
        '<section class="panel tasks-panel" style="margin: 0 0 .5rem">' +
          '<h3 style="margin-bottom:.6rem">Active Task Focus</h3>' +
          '<ul class="tasks" id="tasks"></ul>' +
        '</section>' +
        '<div class="concept-bar" id="concept-bar">' +
          '<span class="label">Git Concepts:</span>' +
          '<button type="button" class="concept-pill untracked" data-info="UNTRACKED: New file on disk that Git is not watching yet. Run git add to track it.">⭕ Untracked</button>' +
          '<button type="button" class="concept-pill staged" data-info="STAGED: File prepared in index ready for next commit snapshot. Run git commit.">✨ Staged</button>' +
          '<button type="button" class="concept-pill unstaged" data-info="UNSTAGED: Edits un-staged or discarded using git restore.">🔄 Modified</button>' +
          '<button type="button" class="concept-pill tracked" data-info="TRACKED: Frozen snapshot permanently saved in commit history repository.">✅ Tracked</button>' +
          '<button type="button" class="concept-pill stashed" data-info="STASHED: Dirty working edits temporarily shelved using git stash.">📦 Stashed</button>' +
          '<button type="button" class="concept-pill deleted" data-info="DELETED: Merged branch or file removed using git branch -d or rm.">🗑️ Deleted</button>' +
        '</div>' +
        '<div class="terminal">' +
          '<div class="term-bar"><span class="lights"><i></i><i></i><i></i></span> you@laptop — notes-repo</div>' +
          '<div class="term-out" id="term-out" tabindex="0"></div>' +
          '<form class="term-form" id="term-form" autocomplete="off">' +
            '<span class="prompt">~/notes-repo <b id="prompt-branch"></b> $</span>' +
            '<input id="term-in" type="text" spellcheck="false" aria-label="terminal input" placeholder="type a git command, or: help">' +
          '</form>' +
        '</div>' +
        '<div class="quickbar" id="quickbar"></div>';
    } else {
      host.innerHTML =
        '<div class="lab-head">' +
          '<span>REPO <b id="repo-branch">—</b></span>' +
          '<span class="spacer"></span>' +
          '<button class="btn-sm" id="btn-reset" type="button">reset level</button>' +
        '</div>' +
        repoHTML +
        '<section class="panel tasks-panel" style="margin: .2rem 0 .5rem">' +
          '<h3 style="margin-bottom:.6rem">Active Task Focus</h3>' +
          '<ul class="tasks" id="tasks"></ul>' +
        '</section>' +
        '<div class="concept-bar" id="concept-bar">' +
          '<span class="label">Git Concepts:</span>' +
          '<button type="button" class="concept-pill untracked" data-info="UNTRACKED: New file on disk that Git is not watching yet. Run git add to track it.">⭕ Untracked</button>' +
          '<button type="button" class="concept-pill staged" data-info="STAGED: File prepared in index ready for next commit snapshot. Run git commit.">✨ Staged</button>' +
          '<button type="button" class="concept-pill unstaged" data-info="UNSTAGED: Edits un-staged or discarded using git restore.">🔄 Modified</button>' +
          '<button type="button" class="concept-pill tracked" data-info="TRACKED: Frozen snapshot permanently saved in commit history repository.">✅ Tracked</button>' +
          '<button type="button" class="concept-pill stashed" data-info="STASHED: Dirty working edits temporarily shelved using git stash.">📦 Stashed</button>' +
          '<button type="button" class="concept-pill deleted" data-info="DELETED: Merged branch or file removed using git branch -d or rm.">🗑️ Deleted</button>' +
        '</div>' +
        '<div class="terminal">' +
          '<div class="term-bar"><span class="lights"><i></i><i></i><i></i></span> you@laptop — notes-repo</div>' +
          '<div class="term-out" id="term-out" tabindex="0"></div>' +
          '<form class="term-form" id="term-form" autocomplete="off">' +
            '<span class="prompt">~/notes-repo <b id="prompt-branch"></b> $</span>' +
            '<input id="term-in" type="text" spellcheck="false" aria-label="terminal input" placeholder="type a git command, or: help">' +
          '</form>' +
        '</div>' +
        '<div class="quickbar" id="quickbar"></div>';
    }

    // Click handler for Concept Pills
    document.querySelectorAll('.concept-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        var info = pill.getAttribute('data-info');
        if (info) Progress.toast(info);
      });
    });

    this.out = document.getElementById('term-out');
    this.input = document.getElementById('term-in');

    document.getElementById('term-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = self.input.value;
      self.input.value = '';
      if (v.trim()) { self.cmdHistory.unshift(v.trim()); self.histIdx = -1; }
      self.exec(v);
    });

    this.input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (self.histIdx < self.cmdHistory.length - 1) self.histIdx++;
        self.input.value = self.cmdHistory[self.histIdx] || '';
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        self.histIdx--;
        if (self.histIdx < 0) { self.histIdx = -1; self.input.value = ''; }
        else self.input.value = self.cmdHistory[self.histIdx] || '';
      }
    });

    document.getElementById('btn-reset').addEventListener('click', function () {
      if (!confirm('Reset this level? The repo and your ticked tasks for this level go back to the start.')) return;
      Progress.resetLevel(self.level.id);
      self.git.reset();
      self.out.innerHTML = '';
      self.renderTasks();
      self.renderAll();
      self.welcome();
    });

    document.querySelector('.terminal').addEventListener('click', function (e) {
      if (window.getSelection().toString()) return;
      if (e.target.tagName !== 'BUTTON') self.input.focus();
    });

    // quick command chips
    var qb = document.getElementById('quickbar');
    (this.level.quick || ['git status', 'git log --oneline', 'git branch', 'help']).forEach(function (c) {
      var b = el('button', '', esc(c));
      b.type = 'button';
      b.addEventListener('click', function () { self.input.value = c; self.input.focus(); });
      qb.appendChild(b);
    });

    // level-specific action buttons (e.g. "maintainer merges your PR")
    if (this.level.actions) {
      this.level.actions.forEach(function (act) {
        var b = el('button', '', esc(act.label));
        b.type = 'button';
        b.style.borderColor = 'var(--accent)';
        b.style.color = 'var(--accent)';
        b.addEventListener('click', function () {
          var msg = act.run(self.git, self);
          self.print([{ text: msg || (act.label + ' — done'), cls: 'l-warn' }]);
          self.renderAll();
          self.checkTasks();
        });
        qb.appendChild(b);
      });
    }

    this.tasksHost = document.getElementById('tasks');
    this.renderTasks();
  };

  L.welcome = function () {
    var lines = (this.level.intro || []).map(function (t) { return { text: t, cls: 'l-dim' }; });
    lines.push({ text: '', cls: '' });
    this.print(lines);
    var catMsgs = {
      1: "Meow! Welcome to Level 1. Type <code>git init</code> in the terminal below to start your repository!",
      2: "Paws up! Branches are just lightweight pointers. Type <code>git branch</code> to see where you are standing!",
      3: "3 copies exist: upstream, origin, and local. Sync them up and open a pull request!",
      4: "Don't panic! Reflog remembers every commit. Nothing is truly lost on my watch! 🐾"
    };
    Progress.catSay(catMsgs[this.level.id] || "Ready to commit? Type a command below!", 'happy', 'cat-guide-host');
  };

  /* ---------------- terminal ---------------- */

  L.exec = function (raw) {
    var cmd = String(raw).trim();
    if (!cmd) return;
    var branch = this.git.currentBranch();
    this.print([{
      text: '',
      html: '<span class="p">~/notes-repo</span> <span class="b">' + esc(branch || '') + '</span> <span class="p">$</span> ' + esc(cmd),
      cls: 'l-cmd'
    }]);
    var res = this.git.run(cmd);
    if (res.length && res[0].clear) { this.out.innerHTML = ''; return; }
    this.print(res);
    this.renderAll();
    this.checkTasks();
  };

  L.print = function (lines) {
    var frag = document.createDocumentFragment();
    lines.forEach(function (l) {
      var d = document.createElement('div');
      d.className = l.cls || '';
      if (l.html) d.innerHTML = l.html;
      else d.textContent = l.text;
      frag.appendChild(d);
    });
    this.out.appendChild(frag);
    this.out.scrollTop = this.out.scrollHeight;
  };

  /* ---------------- graph ---------------- */

  L.renderGraph = function () {
    var rows = this.git.graph();
    var host = document.getElementById('graph');
    if (!rows.length) {
      host.innerHTML = '<div class="graph-empty">no commits yet &mdash; the history graph appears here</div>';
      return;
    }
    var ROW = 34, PAD = 16, LANE_W = 24;
    var maxLane = 0;
    rows.forEach(function (r) { if (r.lane > maxLane) maxLane = r.lane; });
    var textX = PAD + (maxLane + 1) * LANE_W + 8;
    var pos = {};
    rows.forEach(function (r, i) {
      pos[r.sha] = { x: PAD + r.lane * LANE_W, y: PAD + i * ROW };
    });

    var width = 640, height = PAD * 2 + (rows.length - 1) * ROW;
    var svg = ['<svg viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '" role="img" aria-label="commit history graph">'];

    // edges first
    rows.forEach(function (r) {
      var a = pos[r.sha];
      r.parents.forEach(function (p) {
        var b = pos[p];
        if (!b) return;
        var color = LANE_COLORS[r.lane % LANE_COLORS.length];
        if (a.x === b.x) {
          svg.push('<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="' + color + '" stroke-width="1.6"/>');
        } else {
          var midY = (a.y + b.y) / 2;
          svg.push('<path d="M' + a.x + ' ' + a.y + ' C' + a.x + ' ' + midY + ', ' + b.x + ' ' + midY + ', ' + b.x + ' ' + b.y + '" fill="none" stroke="' + color + '" stroke-width="1.6"/>');
        }
      });
    });

    // nodes + labels
    rows.forEach(function (r) {
      var p = pos[r.sha];
      var color = LANE_COLORS[r.lane % LANE_COLORS.length];
      var merge = r.parents.length > 1;
      svg.push('<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (merge ? 6.5 : 5) + '" fill="' + (merge ? 'var(--surface)' : color) + '" stroke="' + color + '" stroke-width="2"/>');

      var x = textX;
      svg.push('<text x="' + x + '" y="' + (p.y + 4) + '" class="graph-sha" fill="var(--muted)">' + esc(r.sha) + '</text>');
      x += 58;

      r.refs.forEach(function (ref) {
        var isHead = ref.indexOf('HEAD') === 0;
        var isRemote = ref.indexOf('/') > -1 && !isHead;
        var c = isHead ? 'var(--accent)' : (isRemote ? 'var(--muted)' : 'var(--ok)');
        var w = ref.length * 6.1 + 10;
        svg.push('<rect x="' + x + '" y="' + (p.y - 8) + '" width="' + w + '" height="16" rx="8" fill="none" stroke="' + c + '" stroke-width="1"/>');
        svg.push('<text x="' + (x + 5) + '" y="' + (p.y + 3.5) + '" class="ref-pill" fill="' + c + '">' + esc(ref) + '</text>');
        x += w + 5;
      });

      var msg = r.msg.length > 46 ? r.msg.slice(0, 45) + '…' : r.msg;
      svg.push('<text x="' + x + '" y="' + (p.y + 4) + '" class="graph-row-msg" fill="var(--ink)">' + esc(msg) + '</text>');
    });

    svg.push('</svg>');
    host.innerHTML = svg.join('');
  };

  /* ---------------- files ---------------- */

  L.renderFiles = function () {
    var self = this, r = this.git.repo;
    var host = document.getElementById('file-list');
    host.innerHTML = '';
    
    // Add header action button for creating new files
    var filesContainer = host.parentElement;
    var header = filesContainer.querySelector('h4');
    if (header && !header.querySelector('.new-file-btn')) {
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifySpaceBetween = 'space-between';
      header.innerHTML = '<span>Working Directory</span> ' +
        '<button type="button" class="btn-sm primary new-file-btn" style="padding:.15rem .45rem;font-size:11px;margin-left:auto">+ New File</button>';
      header.querySelector('.new-file-btn').addEventListener('click', function () {
        var fname = prompt('Enter new file name (e.g. notes.md, README.md):', 'notes.md');
        if (fname && fname.trim()) {
          self.exec('touch ' + fname.trim());
        }
      });
    }

    var names = Object.keys(r.worktree).sort();
    if (!names.length) {
      host.innerHTML = '<span class="legend">Folder is empty — type <code>touch notes.md</code> or click <b>+ New File</b></span>';
      return;
    }

    names.forEach(function (f) {
      var state = self.git.fileState(f);
      var icon = f.endsWith('.md') ? '📄' : (f.endsWith('.json') ? '⚙️' : '📝');
      
      var card = el('div', 'file-chip-card ' + state);
      card.innerHTML =
        '<span class="file-info">' +
          '<span class="st" title="' + state + '"></span>' +
          '<span class="ico">' + icon + '</span>' +
          '<span class="fname">' + esc(f) + '</span>' +
        '</span>' +
        '<div class="file-actions">' +
          '<button type="button" class="act-btn edit" title="Edit content">✏️ Edit</button>' +
          (state !== 'staged' && state !== 'clean' ? '<button type="button" class="act-btn stage" title="Stage file">⚡ Stage</button>' : '') +
        '</div>';

      card.querySelector('.edit').addEventListener('click', function () { self.openEditor(f); });
      var stageBtn = card.querySelector('.stage');
      if (stageBtn) {
        stageBtn.addEventListener('click', function () {
          self.exec('git add ' + f);
        });
      }
      host.appendChild(card);
    });
  };

  L.openEditor = function (f) {
    var self = this, r = this.git.repo;
    var host = document.getElementById('editor-host');
    if (this.editing === f) { host.innerHTML = ''; this.editing = null; return; }
    this.editing = f;
    host.innerHTML = '';
    var wrap = el('div', 'editor');
    var ta = document.createElement('textarea');
    ta.value = r.worktree[f] || '';
    ta.setAttribute('aria-label', 'contents of ' + f);
    var actions = el('div', 'editor-actions',
      '<span class="name">' + esc(f) + '</span>');
    var save = el('button', 'btn-sm primary', 'save');
    var cancel = el('button', 'btn-sm', 'close');
    save.type = cancel.type = 'button';
    save.addEventListener('click', function () {
      r.worktree[f] = ta.value.replace(/\n?$/, '\n');
      host.innerHTML = '';
      self.editing = null;
      self.print([{ text: 'saved ' + f, cls: 'l-dim' }]);
      self.renderAll();
      self.checkTasks();
    });
    cancel.addEventListener('click', function () { host.innerHTML = ''; self.editing = null; });
    actions.appendChild(save);
    actions.appendChild(cancel);
    wrap.appendChild(ta);
    wrap.appendChild(actions);
    host.appendChild(wrap);
    ta.focus();
  };

  /* ---------------- tasks ---------------- */

  L.restoreProgress = function () {
    this.doneSet = {};
    var saved = Progress.level(this.level.id).tasks || [];
    var self = this;
    saved.forEach(function (id) { self.doneSet[id] = true; });
  };

  L.renderTasks = function () {
    this.restoreProgress();
    var self = this;
    var host = this.tasksHost;
    host.innerHTML = '';

    var tasks = this.level.tasks;
    var total = tasks.length;
    var activeIdx = this.activeTaskIndex;
    if (activeIdx < 0) activeIdx = 0;
    if (activeIdx >= total) activeIdx = total - 1;
    this.activeTaskIndex = activeIdx;

    // Task Panel Header & All Tasks Menu Toggle Button
    var sectionHeader = host.parentElement.querySelector('h3');
    if (sectionHeader) {
      sectionHeader.style.display = 'flex';
      sectionHeader.style.alignItems = 'center';
      sectionHeader.style.justifyContent = 'space-between';
      sectionHeader.innerHTML = '<span>Active Task Focus</span>' +
        '<button type="button" class="btn-sm task-menu-toggle-btn" style="padding:.2rem .55rem;font-size:11px;margin-left:auto">' +
          (self.showAllTasks ? 'Hide Tasks Menu ▲' : '📋 All Tasks Menu (' + (activeIdx + 1) + '/' + total + ') ▼') +
        '</button>';

      sectionHeader.querySelector('.task-menu-toggle-btn').addEventListener('click', function () {
        self.showAllTasks = !self.showAllTasks;
        self.renderTasks();
      });
    }

    if (this.showAllTasks) {
      // Render ALL tasks list
      tasks.forEach(function (t, idx) {
        var done = !!self.doneSet[t.id];
        var isActive = (idx === activeIdx);
        var li = el('li', 'task' + (done ? ' done' : '') + (isActive ? ' active' : ''));
        li.innerHTML =
          '<span class="box">&#10003;</span>' +
          '<span class="txt">' + t.text + '</span>';
        
        li.addEventListener('click', function (e) {
          if (e.target.tagName === 'BUTTON') return;
          self.activeTaskIndex = idx;
          self.renderTasks();
          self.focusActiveTask();
        });

        if (t.hint && !done) {
          var btn = el('button', 'task-hint-btn', 'show hint');
          btn.type = 'button';
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (li.querySelector('.hint')) { li.querySelector('.hint').remove(); btn.textContent = 'show hint'; return; }
            var h = el('div', 'hint', esc(t.hint));
            li.appendChild(h);
            btn.textContent = 'hide hint';
          });
          li.appendChild(btn);
        }
        host.appendChild(li);
      });
    } else {
      // Render ONLY the single active focused task card!
      var t = tasks[activeIdx];
      var done = !!self.doneSet[t.id];
      var li = el('li', 'task active' + (done ? ' done' : ''));
      li.innerHTML =
        '<span class="box">&#10003;</span>' +
        '<span class="txt">' + t.text + '</span>';
      
      if (t.hint && !done) {
        var btn = el('button', 'task-hint-btn', 'show hint');
        btn.type = 'button';
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (li.querySelector('.hint')) { li.querySelector('.hint').remove(); btn.textContent = 'show hint'; return; }
          var h = el('div', 'hint', esc(t.hint));
          li.appendChild(h);
          btn.textContent = 'hide hint';
        });
        li.appendChild(btn);
      }
      host.appendChild(li);
    }

    // Render Bottom Arrow Navigation Controls
    var nav = el('div', 'task-arrow-nav');
    var prevBtn = el('button', 'task-nav-btn prev-task-btn', '← Previous Task');
    prevBtn.type = 'button';
    if (activeIdx <= 0) prevBtn.disabled = true;

    var indicator = el('span', 'task-step-indicator', 'Task ' + (activeIdx + 1) + ' of ' + total);

    var nextBtn = el('button', 'task-nav-btn next-task-btn', 'Next Task →');
    nextBtn.type = 'button';
    if (activeIdx >= total - 1) nextBtn.disabled = true;

    prevBtn.addEventListener('click', function () {
      if (self.activeTaskIndex > 0) {
        self.activeTaskIndex--;
        self.renderTasks();
        self.focusActiveTask();
      }
    });

    nextBtn.addEventListener('click', function () {
      if (self.activeTaskIndex < total - 1) {
        self.activeTaskIndex++;
        self.renderTasks();
        self.focusActiveTask();
      }
    });

    nav.appendChild(prevBtn);
    nav.appendChild(indicator);
    nav.appendChild(nextBtn);
    host.appendChild(nav);

    this.paintProgress();
  };

  L.focusActiveTask = function () {
    var t = this.level.tasks[this.activeTaskIndex];
    if (!t) return;
    var hintText = t.hint ? ' &middot; Hint: <code>' + esc(t.hint) + '</code>' : '';
    Progress.catSay('Active Task ' + (this.activeTaskIndex + 1) + ': <b>' + esc(t.short) + '</b>' + hintText, 'happy', 'cat-guide-host');
  };

  L.paintProgress = function () {
    var total = this.level.tasks.length;
    var done = Object.keys(this.doneSet).length;
    var m = document.getElementById('level-meter');
    if (m) m.style.width = Math.round((done / total) * 100) + '%';
    var c = document.getElementById('level-count');
    if (c) c.textContent = done + ' / ' + total;
  };

  L.checkTasks = function () {
    var self = this;
    var ctx = { history: this.git.repo.history, repo: this.git.repo };
    var newly = [];
    this.level.tasks.forEach(function (t) {
      if (self.doneSet[t.id]) return;
      var ok = false;
      try { ok = !!t.check(self.git, ctx); } catch (e) { ok = false; }
      if (ok) { self.doneSet[t.id] = true; newly.push(t); }
    });
    if (!newly.length) return;

    newly.forEach(function (t) {
      Progress.completeTask(self.level.id, t.id, 10);
      Progress.toast('<b>Paws up!</b> &middot; ' + t.short, true);
      Progress.catSay('Purr-fect! You cleared: <b>' + esc(t.short) + '</b>. Keep going!', 'wink', 'cat-guide-host');
    });
    this.renderTasks();

    if (Object.keys(this.doneSet).length >= this.level.tasks.length) {
      Progress.completeLevel(self.level.id);
      var banner = document.getElementById('done-banner');
      if (banner) banner.classList.add('show');
      Progress.catSay('🎉 Meow-velous! You finished all tasks in ' + esc(this.level.title) + '! Ready for the next level?', 'excited', 'cat-guide-host');
      this.print([
        { text: '', cls: '' },
        { text: '✓ Level complete — ' + this.level.title, cls: 'l-ok' },
        { text: this.level.outro || '', cls: 'l-dim' }
      ]);
    }
  };

  /* ---------------- paint everything ---------------- */

  L.renderAll = function () {
    this.renderGraph();
    this.renderFiles();
    var b = this.git.currentBranch() || (this.git.repo.initialized ? 'HEAD' : '—');
    var rb = document.getElementById('repo-branch');
    if (rb) rb.textContent = b + (this.git.repo.conflict ? ' (MERGING)' : '');
    var pb = document.getElementById('prompt-branch');
    if (pb) pb.textContent = this.git.repo.initialized ? '(' + b + ')' : '';
    this.paintProgress();
  };

  /* ---------------- boot ---------------- */

  global.startLevel = function (id) {
    var level = global.LEVELS[id];
    Progress.mountBar(id);
    var lab = new Lab(level);
    global.lab = lab;
    var meterTotal = document.getElementById('level-total');
    if (meterTotal) meterTotal.textContent = level.tasks.length;
    var nextBtn = document.getElementById('next-level');
    if (nextBtn && level.next) nextBtn.href = level.next;
    if (Object.keys(lab.doneSet).length >= level.tasks.length) {
      var banner = document.getElementById('done-banner');
      if (banner) banner.classList.add('show');
    }
    lab.input.focus();
  };
})(window);
