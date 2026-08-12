/* ============================================================
   Fast-Forward — a small but honest Git simulator.
   Models: working tree, staging index, commit DAG, branches,
   remote-tracking refs, and separate "server" repos so that
   fetch / push / PR behave the way they really do.
   ============================================================ */

(function (global) {
  'use strict';

  var SHA_CHARS = '0123456789abcdef';

  function sha() {
    var s = '';
    for (var i = 0; i < 7; i++) s += SHA_CHARS[Math.floor(Math.random() * 16)];
    return s;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function keys(o) { return Object.keys(o); }

  /* ---------- output helpers ---------- */
  function O() { return []; }
  function line(out, text, cls) { out.push({ text: text, cls: cls || '' }); return out; }

  /* ---------- tokenizer (handles quotes) ---------- */
  function tokenize(input) {
    var out = [], cur = '', q = null, i;
    for (i = 0; i < input.length; i++) {
      var ch = input[i];
      if (q) {
        if (ch === q) { q = null; } else { cur += ch; }
      } else if (ch === '"' || ch === "'") {
        q = ch;
      } else if (/\s/.test(ch)) {
        if (cur !== '') { out.push(cur); cur = ''; }
      } else {
        cur += ch;
      }
    }
    if (cur !== '') out.push(cur);
    return out;
  }

  /* ============================================================
     Repo
     ============================================================ */

  function newRepo() {
    return {
      initialized: false,
      worktree: {},        // path -> content
      index: {},           // path -> content (staging area)
      commits: {},         // sha  -> {sha,msg,parents,tree,seq,author}
      branches: {},        // name -> sha
      HEAD: null,          // {branch:'main'} | {sha:'abc1234'}
      remoteRefs: {},      // 'origin/main' -> sha   (only updated by fetch/push)
      servers: {},         // 'origin' -> {url, branches:{}, commits:{}}
      stash: [],
      reflog: [],
      conflict: null,      // {branch, files:[], theirs:sha}
      history: [],         // raw command strings the learner has run
      seq: 0,
      lastOutput: []
    };
  }

  function Git(seedFn) {
    this.repo = newRepo();
    this.seedFn = seedFn || null;
    if (this.seedFn) this.seedFn(this);
  }

  Git.prototype.reset = function () {
    this.repo = newRepo();
    if (this.seedFn) this.seedFn(this);
  };

  /* ---------- basic accessors ---------- */

  var P = Git.prototype;

  P.head = function () {
    var r = this.repo;
    if (!r.HEAD) return null;
    return r.HEAD.branch ? (r.branches[r.HEAD.branch] || null) : r.HEAD.sha;
  };
  P.currentBranch = function () {
    return this.repo.HEAD && this.repo.HEAD.branch ? this.repo.HEAD.branch : null;
  };
  P.commit = function (s) { return this.repo.commits[s] || null; };
  P.tree = function (s) { var c = this.commit(s); return c ? clone(c.tree) : {}; };
  P.headTree = function () { return this.tree(this.head()); };

  P.ancestors = function (s) {
    var seen = {}, stack = [s], r = this.repo;
    while (stack.length) {
      var x = stack.pop();
      if (!x || seen[x]) continue;
      seen[x] = true;
      var c = r.commits[x];
      if (c) c.parents.forEach(function (p) { stack.push(p); });
    }
    return seen;
  };
  P.isAncestor = function (a, b) { // is a an ancestor of (or equal to) b
    if (!a || !b) return false;
    return !!this.ancestors(b)[a];
  };
  P.mergeBase = function (a, b) {
    var anc = this.ancestors(a), best = null, r = this.repo;
    var stack = [b], seen = {};
    while (stack.length) {
      var x = stack.pop();
      if (!x || seen[x]) continue;
      seen[x] = true;
      if (anc[x]) {
        if (!best || r.commits[x].seq > r.commits[best].seq) best = x;
        continue;
      }
      var c = r.commits[x];
      if (c) c.parents.forEach(function (p) { stack.push(p); });
    }
    return best;
  };

  P.resolve = function (ref) {
    var r = this.repo;
    if (!ref) return null;
    if (ref === 'HEAD') return this.head();
    var tilde = ref.match(/^(.+?)~(\d+)$/);
    if (tilde) {
      var base = this.resolve(tilde[1]), n = parseInt(tilde[2], 10);
      while (n-- > 0 && base) {
        var c = r.commits[base];
        base = c && c.parents.length ? c.parents[0] : null;
      }
      return base;
    }
    if (r.branches[ref] !== undefined) return r.branches[ref];
    if (r.remoteRefs[ref] !== undefined) return r.remoteRefs[ref];
    if (r.commits[ref]) return ref;
    var hit = keys(r.commits).filter(function (s) { return s.indexOf(ref) === 0; });
    return hit.length === 1 ? hit[0] : null;
  };

  /* ---------- status ---------- */

  P.status = function () {
    var r = this.repo, ht = this.headTree();
    var staged = [], unstaged = [], untracked = [];
    var self = this;

    keys(r.index).forEach(function (f) {
      if (ht[f] === undefined) staged.push({ f: f, k: 'new file' });
      else if (ht[f] !== r.index[f]) staged.push({ f: f, k: 'modified' });
    });
    keys(ht).forEach(function (f) {
      if (r.index[f] === undefined) staged.push({ f: f, k: 'deleted' });
    });
    keys(r.worktree).forEach(function (f) {
      if (r.index[f] === undefined) untracked.push(f);
      else if (r.index[f] !== r.worktree[f]) unstaged.push({ f: f, k: 'modified' });
    });
    keys(r.index).forEach(function (f) {
      if (r.worktree[f] === undefined) unstaged.push({ f: f, k: 'deleted' });
    });
    return { staged: staged, unstaged: unstaged, untracked: untracked, clean: !staged.length && !unstaged.length && !untracked.length };
  };

  P.fileState = function (f) {
    var r = this.repo, ht = this.headTree();
    if (r.index[f] === undefined) return 'untracked';
    if (r.worktree[f] !== undefined && r.worktree[f] !== r.index[f]) return 'modified';
    if (ht[f] === undefined || ht[f] !== r.index[f]) return 'staged';
    return 'clean';
  };

  /* ---------- writing commits ---------- */

  P.makeCommit = function (msg, parents, tree) {
    var r = this.repo, s = sha();
    while (r.commits[s]) s = sha();
    r.commits[s] = { sha: s, msg: msg, parents: parents.filter(Boolean), tree: clone(tree), seq: ++r.seq, author: 'you' };
    return s;
  };
  P.moveHead = function (s, action) {
    var r = this.repo;
    if (r.HEAD.branch) r.branches[r.HEAD.branch] = s;
    else r.HEAD.sha = s;
    r.reflog.unshift({ sha: s, action: action, branch: r.HEAD.branch || 'HEAD' });
  };
  P.checkoutTree = function (s) {
    var r = this.repo, t = this.tree(s);
    r.worktree = clone(t);
    r.index = clone(t);
  };

  /* ============================================================
     Command dispatch
     ============================================================ */

  P.run = function (input) {
    var raw = String(input || '').trim();
    if (!raw) return [];
    this.repo.history.push(raw);
    var argv = tokenize(raw);
    var cmd = argv.shift();
    var out;
    try {
      if (cmd === 'git') out = this.git(argv);
      else if (cmd === 'gh') out = this.gh(argv);
      else out = this.shell(cmd, argv);
    } catch (e) {
      out = line(O(), 'fatal: ' + (e && e.message ? e.message : String(e)), 'l-err');
    }
    this.repo.lastOutput = out || [];
    return this.repo.lastOutput;
  };

  /* ---------- shell-ish helpers so learners can make files ---------- */

  P.shell = function (cmd, a) {
    var r = this.repo, out = O();
    switch (cmd) {
      case 'touch':
        if (!a.length) return line(out, 'touch: missing file operand', 'l-err');
        a.forEach(function (f) { if (r.worktree[f] === undefined) r.worktree[f] = '# ' + f + '\n'; });
        return line(out, 'created ' + a.join(', '), 'l-dim');
      case 'echo': {
        var joinIdx = a.indexOf('>'), appendIdx = a.indexOf('>>');
        var idx = joinIdx > -1 ? joinIdx : appendIdx;
        if (idx === -1) return line(out, a.join(' '));
        var text = a.slice(0, idx).join(' ');
        var file = a[idx + 1];
        if (!file) return line(out, 'sh: syntax error near unexpected token', 'l-err');
        if (joinIdx > -1) r.worktree[file] = text + '\n';
        else r.worktree[file] = (r.worktree[file] || '') + text + '\n';
        return line(out, 'wrote ' + file, 'l-dim');
      }
      case 'ls':
        if (!keys(r.worktree).length) return line(out, '', 'l-dim');
        return line(out, keys(r.worktree).sort().join('   '));
      case 'cat':
        if (r.worktree[a[0]] === undefined) return line(out, 'cat: ' + a[0] + ': No such file or directory', 'l-err');
        return line(out, r.worktree[a[0]].replace(/\n$/, ''));
      case 'rm':
        a.filter(function (x) { return x[0] !== '-'; }).forEach(function (f) { delete r.worktree[f]; });
        return line(out, 'removed ' + a.join(', '), 'l-dim');
      case 'pwd':
        return line(out, '/home/you/notes-repo');
      case 'clear':
        return [{ text: '', cls: '', clear: true }];
      case 'help':
        line(out, 'This is a simulated shell. Useful commands:', 'l-dim');
        line(out, '  touch <file>            create a file', 'l-dim');
        line(out, '  echo "text" > <file>    write to a file (>> appends)', 'l-dim');
        line(out, '  ls / cat <file> / rm    inspect and remove files', 'l-dim');
        line(out, '  git <anything>          the real lesson', 'l-dim');
        line(out, '  clear                   clear this output', 'l-dim');
        return out;
      default:
        return line(out, 'sh: command not found: ' + cmd, 'l-err');
    }
  };

  /* ---------- git ---------- */

  P.git = function (a) {
    var r = this.repo, out = O(), sub = a.shift();
    if (!sub) { line(out, 'usage: git <command> [<args>]', 'l-dim'); return out; }
    if (!r.initialized && ['init', 'clone', 'version'].indexOf(sub) === -1) {
      return line(out, 'fatal: not a git repository (or any of the parent directories): .git', 'l-err');
    }
    var fn = this['cmd_' + sub.replace(/-/g, '_')];
    if (!fn) return line(out, "git: '" + sub + "' is not a git command. See 'git help'.", 'l-err');
    return fn.call(this, a, out);
  };

  P.cmd_version = function (a, out) { return line(out, 'git version 2.44.0 (simulated)'); };

  P.cmd_init = function (a, out) {
    var r = this.repo;
    if (r.initialized) return line(out, 'Reinitialized existing Git repository in /home/you/notes-repo/.git/', 'l-dim');
    r.initialized = true;
    r.branches = {};
    r.HEAD = { branch: 'main' };
    line(out, 'Initialized empty Git repository in /home/you/notes-repo/.git/', 'l-ok');
    line(out, "hint: your first commit will create the branch 'main'", 'l-dim');
    return out;
  };

  P.cmd_status = function (a, out) {
    var r = this.repo, st = this.status();
    if (r.conflict) {
      line(out, 'On branch ' + this.currentBranch());
      line(out, 'You have unmerged paths.', 'l-warn');
      line(out, '  (fix conflicts and run "git commit")', 'l-dim');
      line(out, '');
      line(out, 'Unmerged paths:', 'l-err');
      r.conflict.files.forEach(function (f) { line(out, '\tboth modified:   ' + f, 'l-err'); });
      return out;
    }
    line(out, 'On branch ' + (this.currentBranch() || 'HEAD (detached)'));
    if (!this.head()) line(out, 'No commits yet', 'l-dim');
    var wrote = false;
    if (st.staged.length) {
      line(out, ''); line(out, 'Changes to be committed:', 'l-ok');
      line(out, '  (use "git restore --staged <file>..." to unstage)', 'l-dim');
      st.staged.forEach(function (s) { line(out, '\t' + (s.k + ':').padEnd(12) + s.f, 'l-ok'); });
      wrote = true;
    }
    if (st.unstaged.length) {
      line(out, ''); line(out, 'Changes not staged for commit:', 'l-warn');
      line(out, '  (use "git add <file>..." to update what will be committed)', 'l-dim');
      st.unstaged.forEach(function (s) { line(out, '\t' + (s.k + ':').padEnd(12) + s.f, 'l-warn'); });
      wrote = true;
    }
    if (st.untracked.length) {
      line(out, ''); line(out, 'Untracked files:', 'l-err');
      line(out, '  (use "git add <file>..." to include in what will be committed)', 'l-dim');
      st.untracked.forEach(function (f) { line(out, '\t' + f, 'l-err'); });
      wrote = true;
    }
    if (!wrote) line(out, 'nothing to commit, working tree clean', 'l-dim');
    return out;
  };

  P.cmd_add = function (a, out) {
    var r = this.repo;
    if (!a.length) return line(out, 'Nothing specified, nothing added.', 'l-err');
    var self = this, added = 0;
    a.forEach(function (f) {
      if (f === '.' || f === '-A' || f === '--all') {
        keys(r.worktree).forEach(function (k) { r.index[k] = r.worktree[k]; added++; });
        keys(r.index).forEach(function (k) { if (r.worktree[k] === undefined) { delete r.index[k]; added++; } });
        return;
      }
      if (r.worktree[f] === undefined) {
        if (r.index[f] !== undefined) { delete r.index[f]; added++; return; }
        line(out, "fatal: pathspec '" + f + "' did not match any files", 'l-err');
        return;
      }
      r.index[f] = r.worktree[f];
      added++;
    });
    if (r.conflict) {
      var remaining = r.conflict.files.filter(function (f) { return (r.worktree[f] || '').indexOf('<<<<<<<') > -1; });
      r.conflict.files = remaining;
      if (!remaining.length) line(out, 'All conflicts fixed — run "git commit" to finish the merge.', 'l-ok');
    }
    if (added && !out.length) line(out, '', 'l-dim');
    return out;
  };

  P.cmd_restore = function (a, out) {
    var r = this.repo, ht = this.headTree();
    if (a[0] === '--staged') {
      a.slice(1).forEach(function (f) {
        if (ht[f] === undefined) delete r.index[f]; else r.index[f] = ht[f];
      });
      return line(out, 'unstaged ' + a.slice(1).join(', '), 'l-dim');
    }
    a.forEach(function (f) { if (r.index[f] !== undefined) r.worktree[f] = r.index[f]; });
    return line(out, 'restored ' + a.join(', '), 'l-dim');
  };

  P.cmd_commit = function (a, out) {
    var r = this.repo, msg = null, amend = false, i;
    for (i = 0; i < a.length; i++) {
      if (a[i] === '-m') { msg = a[i + 1]; i++; }
      else if (a[i] === '--amend') amend = true;
      else if (a[i] === '-am' || a[i] === '-a') {
        keys(r.worktree).forEach(function (k) { if (r.index[k] !== undefined) r.index[k] = r.worktree[k]; });
        if (a[i] === '-am') { msg = a[i + 1]; i++; }
      }
    }
    if (r.conflict) {
      if (r.conflict.files.length) return line(out, 'error: Committing is not possible because you have unmerged files.', 'l-err');
      var mtree = clone(r.index);
      var ms = this.makeCommit(msg || ("Merge branch '" + r.conflict.branch + "'"), [this.head(), r.conflict.theirs], mtree);
      this.moveHead(ms, 'merge ' + r.conflict.branch);
      r.worktree = clone(mtree);
      r.conflict = null;
      line(out, '[' + this.currentBranch() + ' ' + ms + '] merge resolved', 'l-ok');
      return out;
    }
    if (!msg) return line(out, 'error: no commit message. Use: git commit -m "your message"', 'l-err');

    var st = this.status();
    if (!amend && !st.staged.length) {
      line(out, 'On branch ' + this.currentBranch());
      line(out, 'nothing to commit — stage something first with "git add <file>"', 'l-err');
      return out;
    }
    var parents, tree = clone(r.index);
    if (amend) {
      var h = this.commit(this.head());
      if (!h) return line(out, 'fatal: You have nothing to amend.', 'l-err');
      parents = h.parents;
    } else {
      parents = this.head() ? [this.head()] : [];
    }
    var s = this.makeCommit(msg, parents, tree);
    this.moveHead(s, (amend ? 'commit (amend): ' : 'commit: ') + msg);
    var files = st.staged.length || keys(tree).length;
    line(out, '[' + (this.currentBranch() || 'detached') + ' ' + s + '] ' + msg, 'l-ok');
    line(out, ' ' + files + ' file(s) changed', 'l-dim');
    return out;
  };

  P.cmd_log = function (a, out) {
    var r = this.repo, oneline = a.indexOf('--oneline') > -1, all = a.indexOf('--all') > -1;
    var self = this;
    var startSet = {};
    if (all) keys(r.branches).forEach(function (b) { startSet[r.branches[b]] = 1; });
    else if (this.head()) startSet[this.head()] = 1;

    // range syntax:  A..B
    var range = a.filter(function (x) { return x.indexOf('..') > -1 && x[0] !== '-'; })[0];
    var list;
    if (range) {
      var parts = range.split('..');
      var from = this.resolve(parts[0]), to = this.resolve(parts[1]) || this.head();
      if (!to) return line(out, 'fatal: bad revision', 'l-err');
      var excl = from ? this.ancestors(from) : {};
      list = keys(this.ancestors(to)).filter(function (s) { return !excl[s]; });
    } else {
      var seen = {};
      keys(startSet).forEach(function (s) { Object.assign(seen, self.ancestors(s)); });
      list = keys(seen);
    }
    list = list.filter(function (s) { return r.commits[s]; })
               .sort(function (x, y) { return r.commits[y].seq - r.commits[x].seq; });

    if (!list.length) { line(out, '', 'l-dim'); return out; }

    list.forEach(function (s) {
      var c = r.commits[s];
      var refs = self.refsAt(s);
      var tag = refs.length ? ' (' + refs.join(', ') + ')' : '';
      if (oneline) {
        line(out, s + tag + ' ' + c.msg, 'l-sha');
      } else {
        line(out, 'commit ' + s + tag, 'l-sha');
        line(out, 'Author: you <you@example.com>', 'l-dim');
        line(out, '');
        line(out, '    ' + c.msg);
        line(out, '');
      }
    });
    return out;
  };

  P.refsAt = function (s) {
    var r = this.repo, refs = [], self = this;
    keys(r.branches).forEach(function (b) { if (r.branches[b] === s) refs.push(b); });
    keys(r.remoteRefs).forEach(function (b) { if (r.remoteRefs[b] === s) refs.push(b); });
    if (this.head() === s) refs.unshift('HEAD' + (this.currentBranch() ? ' -> ' + this.currentBranch() : ''));
    return refs;
  };

  P.cmd_branch = function (a, out) {
    var r = this.repo, self = this;
    var del = a.indexOf('-d') > -1 || a.indexOf('-D') > -1;
    var force = a.indexOf('-D') > -1;
    var names = a.filter(function (x) { return x[0] !== '-'; });
    var mergedFlag = a.indexOf('--merged');

    if (del) {
      if (!names.length) return line(out, 'fatal: branch name required', 'l-err');
      names.forEach(function (n) {
        if (r.branches[n] === undefined) { line(out, "error: branch '" + n + "' not found.", 'l-err'); return; }
        if (n === self.currentBranch()) {
          line(out, "error: Cannot delete branch '" + n + "' checked out at '/home/you/notes-repo'", 'l-err');
          return;
        }
        if (!force && !self.isAncestor(r.branches[n], self.head())) {
          line(out, "error: The branch '" + n + "' is not fully merged.", 'l-err');
          line(out, 'hint: it has commits that are not on ' + self.currentBranch() + '. Use -D to delete anyway (you may lose work),', 'l-dim');
          line(out, 'hint: or check "git log --oneline upstream/main..' + n + '" first.', 'l-dim');
          return;
        }
        var was = r.branches[n];
        delete r.branches[n];
        line(out, 'Deleted branch ' + n + ' (was ' + was + ').', 'l-ok');
      });
      return out;
    }

    if (mergedFlag > -1) {
      var target = this.resolve(a[mergedFlag + 1]) || this.head();
      keys(r.branches).sort().forEach(function (b) {
        if (self.isAncestor(r.branches[b], target)) {
          line(out, (b === self.currentBranch() ? '* ' : '  ') + b, 'l-ok');
        }
      });
      return out;
    }

    if (!names.length) {
      if (!keys(r.branches).length) return line(out, '(no branches yet — make your first commit)', 'l-dim');
      keys(r.branches).sort().forEach(function (b) {
        line(out, (b === self.currentBranch() ? '* ' : '  ') + b, b === self.currentBranch() ? 'l-ok' : '');
      });
      return out;
    }

    var name = names[0];
    if (r.branches[name] !== undefined) return line(out, "fatal: a branch named '" + name + "' already exists", 'l-err');
    if (!this.head()) return line(out, 'fatal: Not a valid object name: no commits yet', 'l-err');
    r.branches[name] = names[1] ? this.resolve(names[1]) : this.head();
    return line(out, 'created branch ' + name, 'l-dim');
  };

  P.cmd_switch = function (a, out) { return this.cmd_checkout(a, out); };

  P.cmd_checkout = function (a, out) {
    var r = this.repo, self = this;
    var create = a.indexOf('-b') > -1 || a.indexOf('-c') > -1;
    var names = a.filter(function (x) { return x[0] !== '-'; });
    var name = names[0];
    if (!name) return line(out, 'fatal: missing branch name', 'l-err');

    if (create) {
      if (r.branches[name] !== undefined) return line(out, "fatal: a branch named '" + name + "' already exists", 'l-err');
      if (!this.head()) return line(out, 'fatal: make a commit before branching', 'l-err');
      r.branches[name] = names[1] ? this.resolve(names[1]) : this.head();
      r.HEAD = { branch: name };
      r.reflog.unshift({ sha: this.head(), action: 'checkout -b ' + name, branch: name });
      return line(out, "Switched to a new branch '" + name + "'", 'l-ok');
    }

    var st = this.status();
    var dirty = st.staged.length || st.unstaged.length;
    var target = r.branches[name] !== undefined ? r.branches[name] : this.resolve(name);
    if (target === null || target === undefined) return line(out, "error: pathspec '" + name + "' did not match any file(s) known to git", 'l-err');

    if (dirty) {
      line(out, 'error: Your local changes to the following files would be overwritten by checkout:', 'l-err');
      st.staged.concat(st.unstaged).forEach(function (s) { line(out, '\t' + s.f, 'l-err'); });
      line(out, 'Please commit your changes or stash them before you switch branches.', 'l-dim');
      line(out, 'hint: "git stash" parks them safely; "git stash pop" brings them back.', 'l-dim');
      return out;
    }

    var untracked = clone(r.worktree);
    if (r.branches[name] !== undefined) {
      r.HEAD = { branch: name };
      this.checkoutTree(target);
      line(out, "Switched to branch '" + name + "'", 'l-ok');
    } else {
      r.HEAD = { sha: target };
      this.checkoutTree(target);
      line(out, 'Note: switching to ' + target + '.', 'l-warn');
      line(out, "You are in 'detached HEAD' state.", 'l-dim');
    }
    // keep files that were untracked and are not part of either tree
    keys(untracked).forEach(function (f) {
      if (r.worktree[f] === undefined && r.index[f] === undefined) r.worktree[f] = untracked[f];
    });
    r.reflog.unshift({ sha: target, action: 'checkout: moving to ' + name, branch: name });
    return out;
  };

  P.cmd_merge = function (a, out) {
    var r = this.repo, self = this;
    var ffOnly = a.indexOf('--ff-only') > -1;
    var noFF = a.indexOf('--no-ff') > -1;
    var names = a.filter(function (x) { return x[0] !== '-'; });
    var target = this.resolve(names[0]);
    if (!target) return line(out, 'merge: ' + names[0] + ' - not something we can merge', 'l-err');
    var h = this.head();

    if (this.isAncestor(target, h)) return line(out, 'Already up to date.', 'l-dim');

    if (this.isAncestor(h, target) && !noFF) {
      this.moveHead(target, 'merge ' + names[0] + ': fast-forward');
      this.checkoutTree(target);
      line(out, 'Updating ' + (h ? h.slice(0, 7) : 'root') + '..' + target, 'l-dim');
      line(out, 'Fast-forward', 'l-ok');
      line(out, 'hint: no merge commit was needed — your branch simply moved forward.', 'l-dim');
      return out;
    }

    if (ffOnly) {
      line(out, 'fatal: Not possible to fast-forward, aborting.', 'l-err');
      line(out, 'hint: your branch has commits that ' + names[0] + ' does not.', 'l-dim');
      line(out, 'hint: that is exactly what --ff-only is there to catch.', 'l-dim');
      return out;
    }

    var base = this.mergeBase(h, target);
    var bt = this.tree(base), ht = this.headTree(), tt = this.tree(target);
    var merged = clone(ht), conflicts = [];
    keys(tt).forEach(function (f) {
      var mine = ht[f], theirs = tt[f], orig = bt[f];
      if (mine === undefined) { merged[f] = theirs; return; }
      if (mine === theirs) return;
      if (orig === mine) { merged[f] = theirs; return; }   // only they changed it
      if (orig === theirs) return;                          // only I changed it
      conflicts.push(f);
      merged[f] = '<<<<<<< HEAD\n' + mine + '=======\n' + theirs + '>>>>>>> ' + names[0] + '\n';
    });

    if (conflicts.length) {
      r.worktree = clone(merged);
      r.index = clone(merged);
      conflicts.forEach(function (f) { r.index[f] = ht[f]; });
      r.conflict = { branch: names[0], files: conflicts, theirs: target };
      conflicts.forEach(function (f) { line(out, 'CONFLICT (content): Merge conflict in ' + f, 'l-err'); });
      line(out, 'Automatic merge failed; fix conflicts and then commit the result.', 'l-err');
      line(out, 'hint: open the file, delete the <<<<<<< ======= >>>>>>> markers, keep what you want,', 'l-dim');
      line(out, 'hint: then "git add <file>" and "git commit".', 'l-dim');
      return out;
    }

    var ms = this.makeCommit("Merge branch '" + names[0] + "'", [h, target], merged);
    this.moveHead(ms, 'merge ' + names[0]);
    r.worktree = clone(merged);
    r.index = clone(merged);
    line(out, "Merge made by the 'ort' strategy.", 'l-ok');
    line(out, '[' + this.currentBranch() + ' ' + ms + '] merge commit created', 'l-dim');
    return out;
  };

  P.cmd_rebase = function (a, out) {
    var r = this.repo, self = this;
    var names = a.filter(function (x) { return x[0] !== '-'; });
    var target = this.resolve(names[0]);
    if (!target) return line(out, 'fatal: invalid upstream ' + names[0], 'l-err');
    var h = this.head();
    if (this.isAncestor(h, target)) {
      this.moveHead(target, 'rebase (ff)');
      this.checkoutTree(target);
      return line(out, 'Fast-forwarded ' + this.currentBranch() + ' to ' + names[0] + '.', 'l-ok');
    }
    if (this.isAncestor(target, h)) return line(out, 'Current branch ' + this.currentBranch() + ' is up to date.', 'l-dim');

    var base = this.mergeBase(h, target);
    var mine = keys(this.ancestors(h)).filter(function (s) { return !self.ancestors(base)[s]; })
      .filter(function (s) { return r.commits[s]; })
      .sort(function (x, y) { return r.commits[x].seq - r.commits[y].seq; });

    var cursor = target;
    mine.forEach(function (s) {
      var c = r.commits[s];
      var parentTree = c.parents.length ? self.tree(c.parents[0]) : {};
      var t = self.tree(cursor);
      keys(c.tree).forEach(function (f) { if (parentTree[f] !== c.tree[f]) t[f] = c.tree[f]; });
      keys(parentTree).forEach(function (f) { if (c.tree[f] === undefined) delete t[f]; });
      cursor = self.makeCommit(c.msg, [cursor], t);
    });
    this.moveHead(cursor, 'rebase onto ' + names[0]);
    this.checkoutTree(cursor);
    line(out, 'Successfully rebased and updated refs/heads/' + this.currentBranch() + '.', 'l-ok');
    line(out, 'hint: your ' + mine.length + ' commit(s) were replayed on top of ' + names[0] + ' — they have new SHAs now,', 'l-dim');
    line(out, 'hint: so a branch you already pushed needs "git push --force-with-lease".', 'l-dim');
    return out;
  };

  P.cmd_cherry_pick = function (a, out) {
    var self = this, r = this.repo;
    var s = this.resolve(a[0]);
    if (!s) return line(out, 'fatal: bad revision ' + a[0], 'l-err');
    var c = r.commits[s];
    var parentTree = c.parents.length ? this.tree(c.parents[0]) : {};
    var t = this.headTree();
    keys(c.tree).forEach(function (f) { if (parentTree[f] !== c.tree[f]) t[f] = c.tree[f]; });
    var ns = this.makeCommit(c.msg, [this.head()], t);
    this.moveHead(ns, 'cherry-pick ' + s);
    r.worktree = clone(t); r.index = clone(t);
    return line(out, '[' + this.currentBranch() + ' ' + ns + '] ' + c.msg, 'l-ok');
  };

  P.cmd_revert = function (a, out) {
    var r = this.repo, s = this.resolve(a.filter(function (x) { return x[0] !== '-'; })[0]);
    if (!s) return line(out, 'fatal: bad revision', 'l-err');
    var c = r.commits[s];
    var parentTree = c.parents.length ? this.tree(c.parents[0]) : {};
    var t = this.headTree();
    keys(c.tree).forEach(function (f) {
      if (parentTree[f] === undefined) delete t[f];
      else if (parentTree[f] !== c.tree[f]) t[f] = parentTree[f];
    });
    var ns = this.makeCommit('Revert "' + c.msg + '"', [this.head()], t);
    this.moveHead(ns, 'revert ' + s);
    r.worktree = clone(t); r.index = clone(t);
    line(out, '[' + this.currentBranch() + ' ' + ns + '] Revert "' + c.msg + '"', 'l-ok');
    line(out, 'hint: revert undoes the change with a NEW commit — history is never rewritten.', 'l-dim');
    return out;
  };

  P.cmd_reset = function (a, out) {
    var r = this.repo, self = this;
    var hard = a.indexOf('--hard') > -1, soft = a.indexOf('--soft') > -1;
    var names = a.filter(function (x) { return x[0] !== '-'; });
    if (!hard && !soft && names.length && r.index[names[0]] !== undefined) {
      var ht = this.headTree();
      names.forEach(function (f) { if (ht[f] === undefined) delete r.index[f]; else r.index[f] = ht[f]; });
      return line(out, 'Unstaged changes after reset: ' + names.join(', '), 'l-dim');
    }
    var target = names.length ? this.resolve(names[0]) : this.head();
    if (!target) return line(out, 'fatal: ambiguous argument', 'l-err');
    var before = this.head();
    this.moveHead(target, 'reset --hard ' + (names[0] || 'HEAD'));
    if (hard) this.checkoutTree(target);
    else r.index = this.tree(target);
    line(out, 'HEAD is now at ' + target + ' ' + (r.commits[target] ? r.commits[target].msg : ''), hard ? 'l-warn' : 'l-dim');
    if (hard && before !== target) line(out, 'hint: the old commits are still in "git reflog" until garbage collection.', 'l-dim');
    return out;
  };

  P.cmd_reflog = function (a, out) {
    var r = this.repo;
    if (!r.reflog.length) return line(out, '(reflog is empty)', 'l-dim');
    r.reflog.slice(0, 15).forEach(function (e, i) {
      line(out, e.sha + ' HEAD@{' + i + '}: ' + e.action, 'l-sha');
    });
    line(out, 'hint: nothing here is lost — "git checkout -b rescue <sha>" brings any of it back.', 'l-dim');
    return out;
  };

  P.cmd_stash = function (a, out) {
    var r = this.repo, sub = a[0] || 'push';
    if (sub === 'pop' || sub === 'apply') {
      if (!r.stash.length) return line(out, 'No stash entries found.', 'l-err');
      var e = sub === 'pop' ? r.stash.shift() : r.stash[0];
      r.worktree = clone(e.worktree);
      r.index = clone(e.index);
      line(out, 'On branch ' + this.currentBranch(), 'l-dim');
      line(out, 'Restored your work in progress.', 'l-ok');
      return out;
    }
    if (sub === 'list') {
      if (!r.stash.length) return line(out, '(no stash entries)', 'l-dim');
      r.stash.forEach(function (e, i) { line(out, 'stash@{' + i + '}: WIP on ' + e.branch, 'l-sha'); });
      return out;
    }
    var st = this.status();
    if (!st.staged.length && !st.unstaged.length) return line(out, 'No local changes to save', 'l-dim');
    r.stash.unshift({ worktree: clone(r.worktree), index: clone(r.index), branch: this.currentBranch() });
    this.checkoutTree(this.head());
    line(out, 'Saved working directory and index state WIP on ' + this.currentBranch(), 'l-ok');
    line(out, 'hint: your working tree is clean now — "git stash pop" puts it all back.', 'l-dim');
    return out;
  };

  P.cmd_diff = function (a, out) {
    var r = this.repo, st = this.status(), self = this;
    var staged = a.indexOf('--staged') > -1 || a.indexOf('--cached') > -1;
    var list = staged ? st.staged : st.unstaged;
    if (!list.length) return line(out, '(no ' + (staged ? 'staged' : 'unstaged') + ' changes)', 'l-dim');
    list.forEach(function (s) {
      var oldC = staged ? (self.headTree()[s.f] || '') : (r.index[s.f] || '');
      var newC = staged ? (r.index[s.f] || '') : (r.worktree[s.f] || '');
      line(out, 'diff --git a/' + s.f + ' b/' + s.f, 'l-sha');
      oldC.split('\n').filter(Boolean).forEach(function (l) { if (newC.indexOf(l) === -1) line(out, '-' + l, 'l-err'); });
      newC.split('\n').filter(Boolean).forEach(function (l) { if (oldC.indexOf(l) === -1) line(out, '+' + l, 'l-ok'); });
    });
    return out;
  };

  /* ---------- remotes ---------- */

  P.cmd_remote = function (a, out) {
    var r = this.repo;
    if (!a.length || a[0] === '-v') {
      var names = keys(r.servers);
      if (!names.length) return line(out, '(no remotes configured)', 'l-dim');
      names.forEach(function (n) {
        line(out, n.padEnd(10) + r.servers[n].url + ' (fetch)');
        line(out, n.padEnd(10) + r.servers[n].url + ' (push)');
      });
      return out;
    }
    if (a[0] === 'add') {
      var name = a[1], url = a[2];
      if (!name || !url) return line(out, 'usage: git remote add <name> <url>', 'l-err');
      if (r.servers[name]) return line(out, 'error: remote ' + name + ' already exists.', 'l-err');
      r.servers[name] = { url: url, branches: {}, commits: {} };
      return line(out, 'added remote ' + name, 'l-ok');
    }
    if (a[0] === 'remove' || a[0] === 'rm') {
      delete r.servers[a[1]];
      return line(out, 'removed remote ' + a[1], 'l-dim');
    }
    return line(out, 'usage: git remote [-v | add <name> <url>]', 'l-err');
  };

  P.cmd_fetch = function (a, out) {
    var r = this.repo, self = this;
    var name = a.filter(function (x) { return x[0] !== '-'; })[0] || 'origin';
    var srv = r.servers[name];
    if (!srv) return line(out, "fatal: '" + name + "' does not appear to be a git repository", 'l-err');
    var changed = 0;
    keys(srv.commits).forEach(function (s) { if (!r.commits[s]) { r.commits[s] = clone(srv.commits[s]); r.seq = Math.max(r.seq, r.commits[s].seq); } });
    keys(srv.branches).forEach(function (b) {
      var ref = name + '/' + b;
      if (r.remoteRefs[ref] !== srv.branches[b]) {
        var old = r.remoteRefs[ref];
        r.remoteRefs[ref] = srv.branches[b];
        line(out, '   ' + (old ? old + '..' : '* [new branch]      ') + srv.branches[b] + '  ' + b + ' -> ' + ref, 'l-ok');
        changed++;
      }
    });
    keys(r.remoteRefs).forEach(function (ref) {
      if (ref.indexOf(name + '/') === 0 && srv.branches[ref.slice(name.length + 1)] === undefined) {
        delete r.remoteRefs[ref];
      }
    });
    if (!changed) line(out, 'Already up to date — nothing new on ' + name + '.', 'l-dim');
    else {
      line(out, 'From ' + srv.url, 'l-dim');
      line(out, 'hint: fetch only updated your ' + name + '/* refs. Your branches have NOT moved yet.', 'l-dim');
    }
    return out;
  };

  P.cmd_pull = function (a, out) {
    var name = a.filter(function (x) { return x[0] !== '-'; })[0] || 'origin';
    var branch = a.filter(function (x) { return x[0] !== '-'; })[1] || this.currentBranch();
    var o1 = this.cmd_fetch([name], O());
    var o2 = this.cmd_merge([name + '/' + branch], O());
    return o1.concat(o2);
  };

  P.cmd_push = function (a, out) {
    var r = this.repo, self = this;
    var setUp = a.indexOf('-u') > -1 || a.indexOf('--set-upstream') > -1;
    var force = a.indexOf('--force') > -1 || a.indexOf('--force-with-lease') > -1;
    var lease = a.indexOf('--force-with-lease') > -1;
    var del = a.indexOf('--delete') > -1;
    var names = a.filter(function (x) { return x[0] !== '-'; });
    var name = names[0] || 'origin';
    var branch = names[1] || this.currentBranch();
    var srv = r.servers[name];
    if (!srv) return line(out, "fatal: '" + name + "' does not appear to be a git repository", 'l-err');

    if (del) {
      var b = names[1];
      if (srv.branches[b] === undefined) return line(out, "error: unable to delete '" + b + "': remote ref does not exist", 'l-err');
      delete srv.branches[b];
      delete r.remoteRefs[name + '/' + b];
      return line(out, ' - [deleted]         ' + b, 'l-ok');
    }

    if (r.branches[branch] === undefined) return line(out, "error: src refspec " + branch + " does not match any", 'l-err');
    var local = r.branches[branch], remote = srv.branches[branch];

    if (remote && !this.isAncestor(remote, local) && !force) {
      line(out, ' ! [rejected]        ' + branch + ' -> ' + branch + ' (non-fast-forward)', 'l-err');
      line(out, 'hint: the remote has commits you do not have locally.', 'l-dim');
      line(out, 'hint: fetch and rebase, or — if you rewrote history on purpose — use --force-with-lease.', 'l-dim');
      return out;
    }
    if (lease && remote && r.remoteRefs[name + '/' + branch] !== remote) {
      line(out, ' ! [rejected]        ' + branch + ' (stale info)', 'l-err');
      line(out, 'hint: someone else pushed since your last fetch. --force-with-lease just saved their work.', 'l-dim');
      return out;
    }

    keys(this.ancestors(local)).forEach(function (s) { if (r.commits[s]) srv.commits[s] = clone(r.commits[s]); });
    srv.branches[branch] = local;
    r.remoteRefs[name + '/' + branch] = local;
    line(out, 'To ' + srv.url, 'l-dim');
    line(out, '   ' + (remote ? remote + '..' : '* [new branch]      ') + local + '  ' + branch + ' -> ' + branch, 'l-ok');
    if (setUp) line(out, "branch '" + branch + "' set up to track '" + name + '/' + branch + "'.", 'l-dim');
    if (force) line(out, 'hint: forced update.', 'l-warn');
    return out;
  };

  P.cmd_clone = function (a, out) { return line(out, 'hint: this level starts with the repo already cloned — try "git remote -v".', 'l-dim'); };

  P.cmd_help = function (a, out) {
    line(out, 'Commands this simulator understands:', 'l-dim');
    line(out, '  init  status  add  restore  commit  log  diff', 'l-dim');
    line(out, '  branch  checkout  switch  merge  rebase  cherry-pick  revert', 'l-dim');
    line(out, '  remote  fetch  pull  push  reset  reflog  stash', 'l-dim');
    line(out, '  plus the shell: touch, echo >, ls, cat, rm, clear', 'l-dim');
    return out;
  };

  /* ---------- gh (GitHub CLI, simulated) ---------- */

  P.gh = function (a, out2) {
    var r = this.repo, out = O(), self = this;
    var sub = a.shift(), sub2 = a.shift();
    if (sub === 'pr' && sub2 === 'create') {
      var branch = this.currentBranch();
      var target = r.servers.upstream ? 'upstream' : 'origin';
      if (branch === 'main') {
        line(out, 'error: you are on main. Push a feature branch first — a PR compares a branch against main.', 'l-err');
        return out;
      }
      if (!r.servers.origin || r.servers.origin.branches[branch] === undefined) {
        line(out, 'error: branch ' + branch + ' has not been pushed to your fork yet.', 'l-err');
        line(out, 'hint: git push -u origin ' + branch, 'l-dim');
        return out;
      }
      r.pr = { branch: branch, sha: r.branches[branch], target: target, state: 'OPEN', number: 42 };
      line(out, 'Creating pull request for ' + branch + ' into main in ' + (r.servers[target] ? r.servers[target].url.replace('https://github.com/', '') : 'upstream'), 'l-dim');
      line(out, 'https://github.com/maintainer/notes-repo/pull/42', 'l-ok');
      line(out, 'hint: the maintainer reviews it next. Use the "Maintainer merges PR" button to continue.', 'l-dim');
      return out;
    }
    if (sub === 'pr' && sub2 === 'status') {
      if (!r.pr) return line(out, 'no open pull requests from this branch', 'l-dim');
      return line(out, '#' + r.pr.number + '  ' + r.pr.branch + '  [' + r.pr.state + ']', 'l-sha');
    }
    if (sub === 'issue' && sub2 === 'list') {
      line(out, '42  OPEN  Improve the notes chapter        enhancement, good first issue', 'l-sha');
      line(out, '43  OPEN  Fix typos in the README          documentation', 'l-sha');
      return out;
    }
    if (sub === 'issue' && sub2 === 'comment') {
      r.claimed = true;
      return line(out, 'https://github.com/maintainer/notes-repo/issues/42#issuecomment-1  (comment posted)', 'l-ok');
    }
    return line(out, 'gh: try "gh issue list", "gh issue comment 42 --body \'...\'" or "gh pr create"', 'l-err');
  };

  /* ---------- scenario helpers used by level seeds ---------- */

  P.seedCommit = function (msg, files, branch) {
    var r = this.repo;
    r.initialized = true;
    if (!r.HEAD) r.HEAD = { branch: branch || 'main' };
    var tree = clone(this.headTree());
    keys(files).forEach(function (f) { tree[f] = files[f]; });
    var s = this.makeCommit(msg, this.head() ? [this.head()] : [], tree);
    r.branches[r.HEAD.branch] = s;
    r.reflog.unshift({ sha: s, action: 'commit: ' + msg, branch: r.HEAD.branch });
    this.checkoutTree(s);
    return s;
  };

  P.addServer = function (name, url, mirrorCurrent) {
    var r = this.repo, self = this;
    r.servers[name] = { url: url, branches: {}, commits: {} };
    if (mirrorCurrent) {
      keys(r.branches).forEach(function (b) {
        r.servers[name].branches[b] = r.branches[b];
        keys(self.ancestors(r.branches[b])).forEach(function (s) { r.servers[name].commits[s] = clone(r.commits[s]); });
        r.remoteRefs[name + '/' + b] = r.branches[b];
      });
    }
    return r.servers[name];
  };

  // Give a server commits the learner does not have yet (simulates other people working).
  P.serverAdvance = function (name, branch, msgs, files) {
    var r = this.repo, srv = r.servers[name];
    if (!srv) return;
    var parent = srv.branches[branch];
    msgs.forEach(function (m, i) {
      var tree = parent && srv.commits[parent] ? clone(srv.commits[parent].tree) : {};
      var f = (files && files[i]) || {};
      keys(f).forEach(function (k) { tree[k] = f[k]; });
      var s = sha();
      while (r.commits[s] || srv.commits[s]) s = sha();
      srv.commits[s] = { sha: s, msg: m, parents: parent ? [parent] : [], tree: tree, seq: ++r.seq, author: 'maintainer' };
      parent = s;
    });
    srv.branches[branch] = parent;
  };

  // The maintainer merges the learner's PR into upstream.
  P.mergePR = function () {
    var r = this.repo;
    if (!r.pr || r.pr.state !== 'OPEN') return false;
    var up = r.servers.upstream || r.servers.origin;
    var branchSha = r.pr.sha;
    var self = this;
    keys(this.ancestors(branchSha)).forEach(function (s) { if (r.commits[s]) up.commits[s] = clone(r.commits[s]); });
    var base = up.branches.main;
    var tree = clone(r.commits[branchSha].tree);
    var s = sha();
    up.commits[s] = {
      sha: s, msg: 'Merge pull request #42 from you/' + r.pr.branch,
      parents: [base, branchSha].filter(Boolean), tree: tree, seq: ++r.seq, author: 'maintainer'
    };
    up.branches.main = s;
    r.pr.state = 'MERGED';
    return true;
  };

  /* ---------- graph model for the visualiser ---------- */

  P.graph = function () {
    var r = this.repo, self = this;
    var reachable = {};
    keys(r.branches).forEach(function (b) { Object.assign(reachable, self.ancestors(r.branches[b])); });
    keys(r.remoteRefs).forEach(function (b) { Object.assign(reachable, self.ancestors(r.remoteRefs[b])); });
    if (this.head()) Object.assign(reachable, this.ancestors(this.head()));

    var list = keys(reachable).filter(function (s) { return r.commits[s]; })
      .sort(function (x, y) { return r.commits[y].seq - r.commits[x].seq; });

    // lane assignment: each branch claims its first-parent chain
    var lane = {}, order = keys(r.branches).sort(function (a, b) {
      if (a === 'main') return -1; if (b === 'main') return 1; return a < b ? -1 : 1;
    });
    var n = 0;
    order.forEach(function (b) {
      var cur = r.branches[b], myLane = n;
      var used = false;
      while (cur && r.commits[cur]) {
        if (lane[cur] !== undefined) break;
        lane[cur] = myLane; used = true;
        cur = r.commits[cur].parents[0];
      }
      if (used) n++;
    });
    keys(r.remoteRefs).forEach(function (ref) {
      var cur = r.remoteRefs[ref];
      while (cur && r.commits[cur] && lane[cur] === undefined) {
        lane[cur] = n;
        cur = r.commits[cur].parents[0];
      }
    });
    list.forEach(function (s) { if (lane[s] === undefined) lane[s] = 0; });

    return list.map(function (s) {
      var c = r.commits[s];
      return { sha: s, msg: c.msg, parents: c.parents.slice(), lane: lane[s] || 0, refs: self.refsAt(s), author: c.author };
    });
  };

  global.GitEngine = { Git: Git, tokenize: tokenize };
})(window);
