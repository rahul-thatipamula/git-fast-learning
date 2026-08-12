/* ============================================================
   Git-Fast-Learning Engine
   Models: working tree, staging index, commit DAG, branches,
   remote-tracking refs, and separate server repos.
   ============================================================ */

export interface OutputLine {
  text: string;
  cls: string;
  html?: string;
  clear?: boolean;
}

export interface CommitNode {
  sha: string;
  msg: string;
  parents: string[];
  tree: Record<string, string>;
  seq: number;
  author: string;
}

export interface ServerRepo {
  url: string;
  branches: Record<string, string>;
  commits: Record<string, CommitNode>;
}

export interface StashEntry {
  worktree: Record<string, string>;
  index: Record<string, string>;
  branch: string;
}

export interface ReflogEntry {
  sha: string;
  action: string;
  branch: string;
}

export interface ConflictState {
  branch: string;
  files: string[];
  theirs: string;
}

export interface PullRequestState {
  branch: string;
  sha: string;
  target: string;
  state: 'OPEN' | 'MERGED' | 'CLOSED';
  number: number;
}

export interface RepoState {
  initialized: boolean;
  worktree: Record<string, string>;
  index: Record<string, string>;
  commits: Record<string, CommitNode>;
  branches: Record<string, string>;
  HEAD: { branch?: string; sha?: string } | null;
  remoteRefs: Record<string, string>;
  servers: Record<string, ServerRepo>;
  stash: StashEntry[];
  reflog: ReflogEntry[];
  conflict: ConflictState | null;
  pr?: PullRequestState;
  claimed?: boolean;
  history: string[];
  seq: number;
  lastOutput: OutputLine[];
}

export interface GraphRow {
  sha: string;
  msg: string;
  parents: string[];
  lane: number;
  refs: string[];
  author: string;
}

const SHA_CHARS = '0123456789abcdef';

function generateSha(): string {
  let s = '';
  for (let i = 0; i < 7; i++) s += SHA_CHARS[Math.floor(Math.random() * 16)];
  return s;
}

function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

function tokenize(input: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q: string | null = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (q) {
      if (ch === q) {
        q = null;
      } else {
        cur += ch;
      }
    } else if (ch === '"' || ch === "'") {
      q = ch;
    } else if (/\s/.test(ch)) {
      if (cur !== '') {
        out.push(cur);
        cur = '';
      }
    } else {
      cur += ch;
    }
  }
  if (cur !== '') out.push(cur);
  return out;
}

function newRepo(): RepoState {
  return {
    initialized: false,
    worktree: {},
    index: {},
    commits: {},
    branches: {},
    HEAD: null,
    remoteRefs: {},
    servers: {},
    stash: [],
    reflog: [],
    conflict: null,
    history: [],
    seq: 0,
    lastOutput: [],
  };
}

export class Git {
  public repo: RepoState;
  private seedFn: ((git: Git) => void) | null;

  constructor(seedFn?: (git: Git) => void) {
    this.repo = newRepo();
    this.seedFn = seedFn || null;
    if (this.seedFn) this.seedFn(this);
  }

  public reset(): void {
    this.repo = newRepo();
    if (this.seedFn) this.seedFn(this);
  }

  public head(): string | null {
    const r = this.repo;
    if (!r.HEAD) return null;
    return r.HEAD.branch ? r.branches[r.HEAD.branch] || null : r.HEAD.sha || null;
  }

  public currentBranch(): string | null {
    return this.repo.HEAD && this.repo.HEAD.branch ? this.repo.HEAD.branch : null;
  }

  public commit(shaStr: string): CommitNode | null {
    return this.repo.commits[shaStr] || null;
  }

  public tree(shaStr: string | null): Record<string, string> {
    if (!shaStr) return {};
    const c = this.commit(shaStr);
    return c ? clone(c.tree) : {};
  }

  public headTree(): Record<string, string> {
    return this.tree(this.head());
  }

  public ancestors(shaStr: string): Record<string, boolean> {
    const seen: Record<string, boolean> = {};
    const stack: string[] = [shaStr];
    const r = this.repo;
    while (stack.length) {
      const x = stack.pop();
      if (!x || seen[x]) continue;
      seen[x] = true;
      const c = r.commits[x];
      if (c) c.parents.forEach((p) => stack.push(p));
    }
    return seen;
  }

  public isAncestor(a: string | null, b: string | null): boolean {
    if (!a || !b) return false;
    return !!this.ancestors(b)[a];
  }

  public mergeBase(a: string | null, b: string | null): string | null {
    if (!a || !b) return null;
    const anc = this.ancestors(a);
    let best: string | null = null;
    const r = this.repo;
    const stack: string[] = [b];
    const seen: Record<string, boolean> = {};
    while (stack.length) {
      const x = stack.pop()!;
      if (!x || seen[x]) continue;
      seen[x] = true;
      if (anc[x]) {
        if (!best || r.commits[x].seq > r.commits[best].seq) best = x;
        continue;
      }
      const c = r.commits[x];
      if (c) c.parents.forEach((p) => stack.push(p));
    }
    return best;
  }

  public resolve(ref: string): string | null {
    const r = this.repo;
    if (!ref) return null;
    if (ref === 'HEAD') return this.head();
    const tilde = ref.match(/^(.+?)~(\d+)$/);
    if (tilde) {
      let base = this.resolve(tilde[1]);
      let n = parseInt(tilde[2], 10);
      while (n-- > 0 && base) {
        const c = r.commits[base];
        base = c && c.parents.length ? c.parents[0] : null;
      }
      return base;
    }
    if (r.branches[ref] !== undefined) return r.branches[ref];
    if (r.remoteRefs[ref] !== undefined) return r.remoteRefs[ref];
    if (r.commits[ref]) return ref;
    const hit = Object.keys(r.commits).filter((s) => s.indexOf(ref) === 0);
    return hit.length === 1 ? hit[0] : null;
  }

  public status() {
    const r = this.repo;
    const ht = this.headTree();
    const staged: { f: string; k: string }[] = [];
    const unstaged: { f: string; k: string }[] = [];
    const untracked: string[] = [];

    Object.keys(r.index).forEach((f) => {
      if (ht[f] === undefined) staged.push({ f, k: 'new file' });
      else if (ht[f] !== r.index[f]) staged.push({ f, k: 'modified' });
    });
    Object.keys(ht).forEach((f) => {
      if (r.index[f] === undefined) staged.push({ f, k: 'deleted' });
    });
    Object.keys(r.worktree).forEach((f) => {
      if (r.index[f] === undefined) untracked.push(f);
      else if (r.index[f] !== r.worktree[f]) unstaged.push({ f, k: 'modified' });
    });
    Object.keys(r.index).forEach((f) => {
      if (r.worktree[f] === undefined) unstaged.push({ f, k: 'deleted' });
    });
    return {
      staged,
      unstaged,
      untracked,
      clean: !staged.length && !unstaged.length && !untracked.length,
    };
  }

  public fileState(f: string): 'untracked' | 'modified' | 'staged' | 'clean' {
    const r = this.repo;
    const ht = this.headTree();
    if (r.index[f] === undefined) return 'untracked';
    if (r.worktree[f] !== undefined && r.worktree[f] !== r.index[f]) return 'modified';
    if (ht[f] === undefined || ht[f] !== r.index[f]) return 'staged';
    return 'clean';
  }

  public makeCommit(msg: string, parents: (string | null)[], tree: Record<string, string>): string {
    const r = this.repo;
    let s = generateSha();
    while (r.commits[s]) s = generateSha();
    const validParents = parents.filter((p): p is string => Boolean(p));
    r.commits[s] = {
      sha: s,
      msg,
      parents: validParents,
      tree: clone(tree),
      seq: ++r.seq,
      author: 'you',
    };
    return s;
  }

  public moveHead(s: string, action: string): void {
    const r = this.repo;
    if (r.HEAD && r.HEAD.branch) r.branches[r.HEAD.branch] = s;
    else if (r.HEAD) r.HEAD.sha = s;
    r.reflog.unshift({ sha: s, action, branch: (r.HEAD && r.HEAD.branch) || 'HEAD' });
  }

  public checkoutTree(s: string): void {
    const r = this.repo;
    const t = this.tree(s);
    r.worktree = clone(t);
    r.index = clone(t);
  }

  public run(input: string): OutputLine[] {
    const raw = String(input || '').trim();
    if (!raw) return [];
    this.repo.history.push(raw);
    const argv = tokenize(raw);
    const cmd = argv.shift();
    let out: OutputLine[] = [];
    try {
      if (cmd === 'git') out = this.cmdGit(argv);
      else if (cmd === 'gh') out = this.cmdGh(argv);
      else out = this.shell(cmd || '', argv);
    } catch (e: any) {
      out = [{ text: 'fatal: ' + (e && e.message ? e.message : String(e)), cls: 'l-err' }];
    }
    this.repo.lastOutput = out;
    return out;
  }

  public shell(cmd: string, a: string[]): OutputLine[] {
    const r = this.repo;
    const out: OutputLine[] = [];
    switch (cmd) {
      case 'touch':
        if (!a.length) return [{ text: 'touch: missing file operand', cls: 'l-err' }];
        a.forEach((f) => {
          if (r.worktree[f] === undefined) r.worktree[f] = '# ' + f + '\n';
        });
        return [{ text: 'created ' + a.join(', '), cls: 'l-dim' }];
      case 'echo': {
        const joinIdx = a.indexOf('>');
        const appendIdx = a.indexOf('>>');
        const idx = joinIdx > -1 ? joinIdx : appendIdx;
        if (idx === -1) return [{ text: a.join(' '), cls: '' }];
        const text = a.slice(0, idx).join(' ');
        const file = a[idx + 1];
        if (!file) return [{ text: 'sh: syntax error near unexpected token', cls: 'l-err' }];
        if (joinIdx > -1) r.worktree[file] = text + '\n';
        else r.worktree[file] = (r.worktree[file] || '') + text + '\n';
        return [{ text: 'wrote ' + file, cls: 'l-dim' }];
      }
      case 'ls':
        if (!Object.keys(r.worktree).length) return [{ text: '', cls: 'l-dim' }];
        return [{ text: Object.keys(r.worktree).sort().join('   '), cls: '' }];
      case 'cat':
        if (r.worktree[a[0]] === undefined) return [{ text: 'cat: ' + a[0] + ': No such file or directory', cls: 'l-err' }];
        return [{ text: r.worktree[a[0]].replace(/\n$/, ''), cls: '' }];
      case 'rm':
        a.filter((x) => x[0] !== '-').forEach((f) => delete r.worktree[f]);
        return [{ text: 'removed ' + a.join(', '), cls: 'l-dim' }];
      case 'pwd':
        return [{ text: '/home/you/notes-repo', cls: '' }];
      case 'clear':
        return [{ text: '', cls: '', clear: true }];
      case 'help':
        return [
          { text: 'This is a simulated shell. Useful commands:', cls: 'l-dim' },
          { text: '  touch <file>            create a file', cls: 'l-dim' },
          { text: '  echo "text" > <file>    write to a file (>> appends)', cls: 'l-dim' },
          { text: '  ls / cat <file> / rm    inspect and remove files', cls: 'l-dim' },
          { text: '  git <anything>          the real lesson', cls: 'l-dim' },
          { text: '  clear                   clear this output', cls: 'l-dim' },
        ];
      default:
        return [{ text: 'sh: command not found: ' + cmd, cls: 'l-err' }];
    }
  }

  private cmdGit(a: string[]): OutputLine[] {
    const r = this.repo;
    const out: OutputLine[] = [];
    const sub = a.shift();
    if (!sub) return [{ text: 'usage: git <command> [<args>]', cls: 'l-dim' }];
    if (!r.initialized && ['init', 'clone', 'version'].indexOf(sub) === -1) {
      return [{ text: 'fatal: not a git repository (or any of the parent directories): .git', cls: 'l-err' }];
    }

    switch (sub) {
      case 'version':
        return [{ text: 'git version 2.44.0 (simulated)', cls: '' }];
      case 'init':
        if (r.initialized) return [{ text: 'Reinitialized existing Git repository in /home/you/notes-repo/.git/', cls: 'l-dim' }];
        r.initialized = true;
        r.branches = {};
        r.HEAD = { branch: 'main' };
        return [
          { text: 'Initialized empty Git repository in /home/you/notes-repo/.git/', cls: 'l-ok' },
          { text: "hint: your first commit will create the branch 'main'", cls: 'l-dim' },
        ];
      case 'status':
        return this.gitStatus(out);
      case 'add':
        return this.gitAdd(a, out);
      case 'restore':
        return this.gitRestore(a, out);
      case 'commit':
        return this.gitCommit(a, out);
      case 'log':
        return this.gitLog(a, out);
      case 'branch':
        return this.gitBranch(a, out);
      case 'switch':
      case 'checkout':
        return this.gitCheckout(a, out);
      case 'merge':
        return this.gitMerge(a, out);
      case 'rebase':
        return this.gitRebase(a, out);
      case 'cherry-pick':
        return this.gitCherryPick(a, out);
      case 'revert':
        return this.gitRevert(a, out);
      case 'reset':
        return this.gitReset(a, out);
      case 'reflog':
        return this.gitReflog(a, out);
      case 'stash':
        return this.gitStash(a, out);
      case 'diff':
        return this.gitDiff(a, out);
      case 'remote':
        return this.gitRemote(a, out);
      case 'fetch':
        return this.gitFetch(a, out);
      case 'pull':
        return this.gitPull(a, out);
      case 'push':
        return this.gitPush(a, out);
      case 'clone':
        return [{ text: 'hint: this level starts with the repo already cloned — try "git remote -v".', cls: 'l-dim' }];
      case 'help':
        return [
          { text: 'Commands this simulator understands:', cls: 'l-dim' },
          { text: '  init  status  add  restore  commit  log  diff', cls: 'l-dim' },
          { text: '  branch  checkout  switch  merge  rebase  cherry-pick  revert', cls: 'l-dim' },
          { text: '  remote  fetch  pull  push  reset  reflog  stash', cls: 'l-dim' },
          { text: '  plus the shell: touch, echo >, ls, cat, rm, clear', cls: 'l-dim' },
        ];
      default:
        return [{ text: "git: '" + sub + "' is not a git command. See 'git help'.", cls: 'l-err' }];
    }
  }

  private gitStatus(out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    const st = this.status();
    if (r.conflict) {
      out.push({ text: 'On branch ' + this.currentBranch(), cls: '' });
      out.push({ text: 'You have unmerged paths.', cls: 'l-warn' });
      out.push({ text: '  (fix conflicts and run "git commit")', cls: 'l-dim' });
      out.push({ text: '', cls: '' });
      out.push({ text: 'Unmerged paths:', cls: 'l-err' });
      r.conflict.files.forEach((f) => out.push({ text: '\tboth modified:   ' + f, cls: 'l-err' }));
      return out;
    }
    out.push({ text: 'On branch ' + (this.currentBranch() || 'HEAD (detached)'), cls: '' });
    if (!this.head()) out.push({ text: 'No commits yet', cls: 'l-dim' });
    let wrote = false;
    if (st.staged.length) {
      out.push({ text: '', cls: '' });
      out.push({ text: 'Changes to be committed:', cls: 'l-ok' });
      out.push({ text: '  (use "git restore --staged <file>..." to unstage)', cls: 'l-dim' });
      st.staged.forEach((s) => out.push({ text: '\t' + (s.k + ':').padEnd(12) + s.f, cls: 'l-ok' }));
      wrote = true;
    }
    if (st.unstaged.length) {
      out.push({ text: '', cls: '' });
      out.push({ text: 'Changes not staged for commit:', cls: 'l-warn' });
      out.push({ text: '  (use "git add <file>..." to update what will be committed)', cls: 'l-dim' });
      st.unstaged.forEach((s) => out.push({ text: '\t' + (s.k + ':').padEnd(12) + s.f, cls: 'l-warn' }));
      wrote = true;
    }
    if (st.untracked.length) {
      out.push({ text: '', cls: '' });
      out.push({ text: 'Untracked files:', cls: 'l-err' });
      out.push({ text: '  (use "git add <file>..." to include in what will be committed)', cls: 'l-dim' });
      st.untracked.forEach((f) => out.push({ text: '\t' + f, cls: 'l-err' }));
      wrote = true;
    }
    if (!wrote) out.push({ text: 'nothing to commit, working tree clean', cls: 'l-dim' });
    return out;
  }

  private gitAdd(a: string[], out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    if (!a.length) return [{ text: 'Nothing specified, nothing added.', cls: 'l-err' }];
    let added = 0;
    a.forEach((f) => {
      if (f === '.' || f === '-A' || f === '--all') {
        Object.keys(r.worktree).forEach((k) => {
          r.index[k] = r.worktree[k];
          added++;
        });
        Object.keys(r.index).forEach((k) => {
          if (r.worktree[k] === undefined) {
            delete r.index[k];
            added++;
          }
        });
        return;
      }
      if (r.worktree[f] === undefined) {
        if (r.index[f] !== undefined) {
          delete r.index[f];
          added++;
          return;
        }
        out.push({ text: "fatal: pathspec '" + f + "' did not match any files", cls: 'l-err' });
        return;
      }
      r.index[f] = r.worktree[f];
      added++;
    });
    if (r.conflict) {
      const remaining = r.conflict.files.filter((f) => (r.worktree[f] || '').indexOf('<<<<<<<') > -1);
      r.conflict.files = remaining;
      if (!remaining.length) out.push({ text: 'All conflicts fixed — run "git commit" to finish the merge.', cls: 'l-ok' });
    }
    return out;
  }

  private gitRestore(a: string[], out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    const ht = this.headTree();
    if (a[0] === '--staged') {
      a.slice(1).forEach((f) => {
        if (ht[f] === undefined) delete r.index[f];
        else r.index[f] = ht[f];
      });
      return [{ text: 'unstaged ' + a.slice(1).join(', '), cls: 'l-dim' }];
    }
    a.forEach((f) => {
      if (r.index[f] !== undefined) r.worktree[f] = r.index[f];
    });
    return [{ text: 'restored ' + a.join(', '), cls: 'l-dim' }];
  }

  private gitCommit(a: string[], out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    let msg: string | null = null;
    let amend = false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] === '-m') {
        msg = a[i + 1];
        i++;
      } else if (a[i] === '--amend') {
        amend = true;
      } else if (a[i] === '-am' || a[i] === '-a') {
        Object.keys(r.worktree).forEach((k) => {
          if (r.index[k] !== undefined) r.index[k] = r.worktree[k];
        });
        if (a[i] === '-am') {
          msg = a[i + 1];
          i++;
        }
      }
    }
    if (r.conflict) {
      if (r.conflict.files.length) return [{ text: 'error: Committing is not possible because you have unmerged files.', cls: 'l-err' }];
      const mtree = clone(r.index);
      const ms = this.makeCommit(msg || "Merge branch '" + r.conflict.branch + "'", [this.head(), r.conflict.theirs], mtree);
      this.moveHead(ms, 'merge ' + r.conflict.branch);
      r.worktree = clone(mtree);
      r.conflict = null;
      return [{ text: '[' + this.currentBranch() + ' ' + ms + '] merge resolved', cls: 'l-ok' }];
    }
    if (!msg) return [{ text: 'error: no commit message. Use: git commit -m "your message"', cls: 'l-err' }];

    const st = this.status();
    if (!amend && !st.staged.length) {
      out.push({ text: 'On branch ' + this.currentBranch(), cls: '' });
      out.push({ text: 'nothing to commit — stage something first with "git add <file>"', cls: 'l-err' });
      return out;
    }
    let parents: (string | null)[];
    const tree = clone(r.index);
    if (amend) {
      const h = this.commit(this.head() || '');
      if (!h) return [{ text: 'fatal: You have nothing to amend.', cls: 'l-err' }];
      parents = h.parents;
    } else {
      parents = this.head() ? [this.head()] : [];
    }
    const s = this.makeCommit(msg, parents, tree);
    this.moveHead(s, (amend ? 'commit (amend): ' : 'commit: ') + msg);
    const files = st.staged.length || Object.keys(tree).length;
    out.push({ text: '[' + (this.currentBranch() || 'detached') + ' ' + s + '] ' + msg, cls: 'l-ok' });
    out.push({ text: ' ' + files + ' file(s) changed', cls: 'l-dim' });
    return out;
  }

  private gitLog(a: string[], out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    const oneline = a.indexOf('--oneline') > -1;
    const all = a.indexOf('--all') > -1;
    const startSet: Record<string, number> = {};
    if (all) Object.keys(r.branches).forEach((b) => { startSet[r.branches[b]] = 1; });
    else if (this.head()) startSet[this.head()!] = 1;

    const range = a.filter((x) => x.indexOf('..') > -1 && x[0] !== '-')[0];
    let list: string[];
    if (range) {
      const parts = range.split('..');
      const from = this.resolve(parts[0]);
      const to = this.resolve(parts[1]) || this.head();
      if (!to) return [{ text: 'fatal: bad revision', cls: 'l-err' }];
      const excl = from ? this.ancestors(from) : {};
      list = Object.keys(this.ancestors(to)).filter((s) => !excl[s]);
    } else {
      const seen: Record<string, boolean> = {};
      Object.keys(startSet).forEach((s) => Object.assign(seen, this.ancestors(s)));
      list = Object.keys(seen);
    }
    list = list
      .filter((s) => r.commits[s])
      .sort((x, y) => r.commits[y].seq - r.commits[x].seq);

    if (!list.length) return out;

    list.forEach((s) => {
      const c = r.commits[s];
      const refs = this.refsAt(s);
      const tag = refs.length ? ' (' + refs.join(', ') + ')' : '';
      if (oneline) {
        out.push({ text: s + tag + ' ' + c.msg, cls: 'l-sha' });
      } else {
        out.push({ text: 'commit ' + s + tag, cls: 'l-sha' });
        out.push({ text: 'Author: you <you@example.com>', cls: 'l-dim' });
        out.push({ text: '', cls: '' });
        out.push({ text: '    ' + c.msg, cls: '' });
        out.push({ text: '', cls: '' });
      }
    });
    return out;
  }

  public refsAt(s: string): string[] {
    const r = this.repo;
    const refs: string[] = [];
    Object.keys(r.branches).forEach((b) => {
      if (r.branches[b] === s) refs.push(b);
    });
    Object.keys(r.remoteRefs).forEach((b) => {
      if (r.remoteRefs[b] === s) refs.push(b);
    });
    if (this.head() === s) refs.unshift('HEAD' + (this.currentBranch() ? ' -> ' + this.currentBranch() : ''));
    return refs;
  }

  private gitBranch(a: string[], out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    const del = a.indexOf('-d') > -1 || a.indexOf('-D') > -1;
    const force = a.indexOf('-D') > -1;
    const names = a.filter((x) => x[0] !== '-');
    const mergedFlag = a.indexOf('--merged');

    if (del) {
      if (!names.length) return [{ text: 'fatal: branch name required', cls: 'l-err' }];
      names.forEach((n) => {
        if (r.branches[n] === undefined) {
          out.push({ text: "error: branch '" + n + "' not found.", cls: 'l-err' });
          return;
        }
        if (n === this.currentBranch()) {
          out.push({ text: "error: Cannot delete branch '" + n + "' checked out at '/home/you/notes-repo'", cls: 'l-err' });
          return;
        }
        if (!force && !this.isAncestor(r.branches[n], this.head())) {
          out.push({ text: "error: The branch '" + n + "' is not fully merged.", cls: 'l-err' });
          out.push({ text: 'hint: it has commits that are not on ' + this.currentBranch() + '. Use -D to delete anyway.', cls: 'l-dim' });
          return;
        }
        const was = r.branches[n];
        delete r.branches[n];
        out.push({ text: 'Deleted branch ' + n + ' (was ' + was + ').', cls: 'l-ok' });
      });
      return out;
    }

    if (mergedFlag > -1) {
      const target = this.resolve(a[mergedFlag + 1]) || this.head();
      Object.keys(r.branches).sort().forEach((b) => {
        if (this.isAncestor(r.branches[b], target)) {
          out.push({ text: (b === this.currentBranch() ? '* ' : '  ') + b, cls: 'l-ok' });
        }
      });
      return out;
    }

    if (!names.length) {
      if (!Object.keys(r.branches).length) return [{ text: '(no branches yet — make your first commit)', cls: 'l-dim' }];
      Object.keys(r.branches).sort().forEach((b) => {
        out.push({ text: (b === this.currentBranch() ? '* ' : '  ') + b, cls: b === this.currentBranch() ? 'l-ok' : '' });
      });
      return out;
    }

    const name = names[0];
    if (r.branches[name] !== undefined) return [{ text: "fatal: a branch named '" + name + "' already exists", cls: 'l-err' }];
    if (!this.head()) return [{ text: 'fatal: Not a valid object name: no commits yet', cls: 'l-err' }];
    r.branches[name] = names[1] ? this.resolve(names[1])! : this.head()!;
    return [{ text: 'created branch ' + name, cls: 'l-dim' }];
  }

  private gitCheckout(a: string[], out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    const create = a.indexOf('-b') > -1 || a.indexOf('-c') > -1;
    const names = a.filter((x) => x[0] !== '-');
    const name = names[0];
    if (!name) return [{ text: 'fatal: missing branch name', cls: 'l-err' }];

    if (create) {
      if (r.branches[name] !== undefined) return [{ text: "fatal: a branch named '" + name + "' already exists", cls: 'l-err' }];
      if (!this.head()) return [{ text: 'fatal: make a commit before branching', cls: 'l-err' }];
      r.branches[name] = names[1] ? this.resolve(names[1])! : this.head()!;
      r.HEAD = { branch: name };
      r.reflog.unshift({ sha: this.head()!, action: 'checkout -b ' + name, branch: name });
      return [{ text: "Switched to a new branch '" + name + "'", cls: 'l-ok' }];
    }

    const st = this.status();
    const dirty = st.staged.length || st.unstaged.length;
    const target = r.branches[name] !== undefined ? r.branches[name] : this.resolve(name);
    if (target === null || target === undefined) return [{ text: "error: pathspec '" + name + "' did not match any file(s) known to git", cls: 'l-err' }];

    if (dirty) {
      out.push({ text: 'error: Your local changes to the following files would be overwritten by checkout:', cls: 'l-err' });
      st.staged.concat(st.unstaged).forEach((s) => out.push({ text: '\t' + s.f, cls: 'l-err' }));
      out.push({ text: 'Please commit your changes or stash them before you switch branches.', cls: 'l-dim' });
      return out;
    }

    const untracked = clone(r.worktree);
    if (r.branches[name] !== undefined) {
      r.HEAD = { branch: name };
      this.checkoutTree(target);
      out.push({ text: "Switched to branch '" + name + "'", cls: 'l-ok' });
    } else {
      r.HEAD = { sha: target };
      this.checkoutTree(target);
      out.push({ text: 'Note: switching to ' + target + '.', cls: 'l-warn' });
      out.push({ text: "You are in 'detached HEAD' state.", cls: 'l-dim' });
    }
    Object.keys(untracked).forEach((f) => {
      if (r.worktree[f] === undefined && r.index[f] === undefined) r.worktree[f] = untracked[f];
    });
    r.reflog.unshift({ sha: target, action: 'checkout: moving to ' + name, branch: name });
    return out;
  }

  private gitMerge(a: string[], out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    const ffOnly = a.indexOf('--ff-only') > -1;
    const noFF = a.indexOf('--no-ff') > -1;
    const names = a.filter((x) => x[0] !== '-');
    const target = this.resolve(names[0]);
    if (!target) return [{ text: 'merge: ' + names[0] + ' - not something we can merge', cls: 'l-err' }];
    const h = this.head();

    if (this.isAncestor(target, h)) return [{ text: 'Already up to date.', cls: 'l-dim' }];

    if (this.isAncestor(h, target) && !noFF) {
      this.moveHead(target, 'merge ' + names[0] + ': fast-forward');
      this.checkoutTree(target);
      out.push({ text: 'Updating ' + (h ? h.slice(0, 7) : 'root') + '..' + target, cls: 'l-dim' });
      out.push({ text: 'Fast-forward', cls: 'l-ok' });
      return out;
    }

    if (ffOnly) {
      return [
        { text: 'fatal: Not possible to fast-forward, aborting.', cls: 'l-err' },
        { text: 'hint: your branch has commits that ' + names[0] + ' does not.', cls: 'l-dim' },
      ];
    }

    const base = this.mergeBase(h, target);
    const bt = this.tree(base);
    const ht = this.headTree();
    const tt = this.tree(target);
    const merged = clone(ht);
    const conflicts: string[] = [];

    Object.keys(tt).forEach((f) => {
      const mine = ht[f];
      const theirs = tt[f];
      const orig = bt[f];
      if (mine === undefined) { merged[f] = theirs; return; }
      if (mine === theirs) return;
      if (orig === mine) { merged[f] = theirs; return; }
      if (orig === theirs) return;
      conflicts.push(f);
      merged[f] = '<<<<<<< HEAD\n' + mine + '=======\n' + theirs + '>>>>>>> ' + names[0] + '\n';
    });

    if (conflicts.length) {
      r.worktree = clone(merged);
      r.index = clone(merged);
      conflicts.forEach((f) => { r.index[f] = ht[f]; });
      r.conflict = { branch: names[0], files: conflicts, theirs: target };
      conflicts.forEach((f) => out.push({ text: 'CONFLICT (content): Merge conflict in ' + f, cls: 'l-err' }));
      out.push({ text: 'Automatic merge failed; fix conflicts and then commit the result.', cls: 'l-err' });
      return out;
    }

    const ms = this.makeCommit("Merge branch '" + names[0] + "'", [h, target], merged);
    this.moveHead(ms, 'merge ' + names[0]);
    r.worktree = clone(merged);
    r.index = clone(merged);
    out.push({ text: "Merge made by the 'ort' strategy.", cls: 'l-ok' });
    out.push({ text: '[' + this.currentBranch() + ' ' + ms + '] merge commit created', cls: 'l-dim' });
    return out;
  }

  private gitRebase(a: string[], out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    const names = a.filter((x) => x[0] !== '-');
    const target = this.resolve(names[0]);
    if (!target) return [{ text: 'fatal: invalid upstream ' + names[0], cls: 'l-err' }];
    const h = this.head();
    if (this.isAncestor(h, target)) {
      this.moveHead(target, 'rebase (ff)');
      this.checkoutTree(target);
      return [{ text: 'Fast-forwarded ' + this.currentBranch() + ' to ' + names[0] + '.', cls: 'l-ok' }];
    }
    if (this.isAncestor(target, h)) return [{ text: 'Current branch ' + this.currentBranch() + ' is up to date.', cls: 'l-dim' }];

    const base = this.mergeBase(h, target);
    const mine = Object.keys(this.ancestors(h!))
      .filter((s) => !this.ancestors(base!)[s])
      .filter((s) => r.commits[s])
      .sort((x, y) => r.commits[x].seq - r.commits[y].seq);

    let cursor = target;
    mine.forEach((s) => {
      const c = r.commits[s];
      const parentTree = c.parents.length ? this.tree(c.parents[0]) : {};
      const t = this.tree(cursor);
      Object.keys(c.tree).forEach((f) => { if (parentTree[f] !== c.tree[f]) t[f] = c.tree[f]; });
      Object.keys(parentTree).forEach((f) => { if (c.tree[f] === undefined) delete t[f]; });
      cursor = this.makeCommit(c.msg, [cursor], t);
    });
    this.moveHead(cursor, 'rebase onto ' + names[0]);
    this.checkoutTree(cursor);
    out.push({ text: 'Successfully rebased and updated refs/heads/' + this.currentBranch() + '.', cls: 'l-ok' });
    return out;
  }

  private gitCherryPick(a: string[], out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    const s = this.resolve(a[0]);
    if (!s) return [{ text: 'fatal: bad revision ' + a[0], cls: 'l-err' }];
    const c = r.commits[s];
    const parentTree = c.parents.length ? this.tree(c.parents[0]) : {};
    const t = this.headTree();
    Object.keys(c.tree).forEach((f) => { if (parentTree[f] !== c.tree[f]) t[f] = c.tree[f]; });
    const ns = this.makeCommit(c.msg, [this.head()], t);
    this.moveHead(ns, 'cherry-pick ' + s);
    r.worktree = clone(t);
    r.index = clone(t);
    return [{ text: '[' + this.currentBranch() + ' ' + ns + '] ' + c.msg, cls: 'l-ok' }];
  }

  private gitRevert(a: string[], out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    const s = this.resolve(a.filter((x) => x[0] !== '-')[0]);
    if (!s) return [{ text: 'fatal: bad revision', cls: 'l-err' }];
    const c = r.commits[s];
    const parentTree = c.parents.length ? this.tree(c.parents[0]) : {};
    const t = this.headTree();
    Object.keys(c.tree).forEach((f) => {
      if (parentTree[f] === undefined) delete t[f];
      else if (parentTree[f] !== c.tree[f]) t[f] = parentTree[f];
    });
    const ns = this.makeCommit('Revert "' + c.msg + '"', [this.head()], t);
    this.moveHead(ns, 'revert ' + s);
    r.worktree = clone(t);
    r.index = clone(t);
    out.push({ text: '[' + this.currentBranch() + ' ' + ns + '] Revert "' + c.msg + '"', cls: 'l-ok' });
    return out;
  }

  private gitReset(a: string[], out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    const hard = a.indexOf('--hard') > -1;
    const soft = a.indexOf('--soft') > -1;
    const names = a.filter((x) => x[0] !== '-');
    if (!hard && !soft && names.length && r.index[names[0]] !== undefined) {
      const ht = this.headTree();
      names.forEach((f) => { if (ht[f] === undefined) delete r.index[f]; else r.index[f] = ht[f]; });
      return [{ text: 'Unstaged changes after reset: ' + names.join(', '), cls: 'l-dim' }];
    }
    const target = names.length ? this.resolve(names[0]) : this.head();
    if (!target) return [{ text: 'fatal: ambiguous argument', cls: 'l-err' }];
    const before = this.head();
    this.moveHead(target, 'reset --hard ' + (names[0] || 'HEAD'));
    if (hard) this.checkoutTree(target);
    else r.index = this.tree(target);
    out.push({ text: 'HEAD is now at ' + target + ' ' + (r.commits[target] ? r.commits[target].msg : ''), cls: hard ? 'l-warn' : 'l-dim' });
    return out;
  }

  private gitReflog(a: string[], out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    if (!r.reflog.length) return [{ text: '(reflog is empty)', cls: 'l-dim' }];
    r.reflog.slice(0, 15).forEach((e, i) => {
      out.push({ text: e.sha + ' HEAD@{' + i + '}: ' + e.action, cls: 'l-sha' });
    });
    return out;
  }

  private gitStash(a: string[], out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    const sub = a[0] || 'push';
    if (sub === 'pop' || sub === 'apply') {
      if (!r.stash.length) return [{ text: 'No stash entries found.', cls: 'l-err' }];
      const e = sub === 'pop' ? r.stash.shift()! : r.stash[0];
      r.worktree = clone(e.worktree);
      r.index = clone(e.index);
      out.push({ text: 'On branch ' + this.currentBranch(), cls: 'l-dim' });
      out.push({ text: 'Restored your work in progress.', cls: 'l-ok' });
      return out;
    }
    if (sub === 'list') {
      if (!r.stash.length) return [{ text: '(no stash entries)', cls: 'l-dim' }];
      r.stash.forEach((e, i) => out.push({ text: 'stash@{' + i + '}: WIP on ' + e.branch, cls: 'l-sha' }));
      return out;
    }
    const st = this.status();
    if (!st.staged.length && !st.unstaged.length) return [{ text: 'No local changes to save', cls: 'l-dim' }];
    r.stash.unshift({ worktree: clone(r.worktree), index: clone(r.index), branch: this.currentBranch() || 'main' });
    this.checkoutTree(this.head()!);
    out.push({ text: 'Saved working directory and index state WIP on ' + this.currentBranch(), cls: 'l-ok' });
    return out;
  }

  private gitDiff(a: string[], out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    const st = this.status();
    const staged = a.indexOf('--staged') > -1 || a.indexOf('--cached') > -1;
    const list = staged ? st.staged : st.unstaged;
    if (!list.length) return [{ text: '(no ' + (staged ? 'staged' : 'unstaged') + ' changes)', cls: 'l-dim' }];
    list.forEach((s) => {
      const oldC = staged ? (this.headTree()[s.f] || '') : (r.index[s.f] || '');
      const newC = staged ? (r.index[s.f] || '') : (r.worktree[s.f] || '');
      out.push({ text: 'diff --git a/' + s.f + ' b/' + s.f, cls: 'l-sha' });
      oldC.split('\n').filter(Boolean).forEach((l) => { if (newC.indexOf(l) === -1) out.push({ text: '-' + l, cls: 'l-err' }); });
      newC.split('\n').filter(Boolean).forEach((l) => { if (oldC.indexOf(l) === -1) out.push({ text: '+' + l, cls: 'l-ok' }); });
    });
    return out;
  }

  private gitRemote(a: string[], out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    if (!a.length || a[0] === '-v') {
      const names = Object.keys(r.servers);
      if (!names.length) return [{ text: '(no remotes configured)', cls: 'l-dim' }];
      names.forEach((n) => {
        out.push({ text: n.padEnd(10) + r.servers[n].url + ' (fetch)', cls: '' });
        out.push({ text: n.padEnd(10) + r.servers[n].url + ' (push)', cls: '' });
      });
      return out;
    }
    if (a[0] === 'add') {
      const name = a[1];
      const url = a[2];
      if (!name || !url) return [{ text: 'usage: git remote add <name> <url>', cls: 'l-err' }];
      if (r.servers[name]) return [{ text: 'error: remote ' + name + ' already exists.', cls: 'l-err' }];
      r.servers[name] = { url, branches: {}, commits: {} };
      return [{ text: 'added remote ' + name, cls: 'l-ok' }];
    }
    if (a[0] === 'remove' || a[0] === 'rm') {
      delete r.servers[a[1]];
      return [{ text: 'removed remote ' + a[1], cls: 'l-dim' }];
    }
    return [{ text: 'usage: git remote [-v | add <name> <url>]', cls: 'l-err' }];
  }

  private gitFetch(a: string[], out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    const name = a.filter((x) => x[0] !== '-')[0] || 'origin';
    const srv = r.servers[name];
    if (!srv) return [{ text: "fatal: '" + name + "' does not appear to be a git repository", cls: 'l-err' }];
    let changed = 0;
    Object.keys(srv.commits).forEach((s) => {
      if (!r.commits[s]) {
        r.commits[s] = clone(srv.commits[s]);
        r.seq = Math.max(r.seq, r.commits[s].seq);
      }
    });
    Object.keys(srv.branches).forEach((b) => {
      const ref = name + '/' + b;
      if (r.remoteRefs[ref] !== srv.branches[b]) {
        const old = r.remoteRefs[ref];
        r.remoteRefs[ref] = srv.branches[b];
        out.push({ text: '   ' + (old ? old + '..' : '* [new branch]      ') + srv.branches[b] + '  ' + b + ' -> ' + ref, cls: 'l-ok' });
        changed++;
      }
    });
    Object.keys(r.remoteRefs).forEach((ref) => {
      if (ref.indexOf(name + '/') === 0 && srv.branches[ref.slice(name.length + 1)] === undefined) {
        delete r.remoteRefs[ref];
      }
    });
    if (!changed) out.push({ text: 'Already up to date — nothing new on ' + name + '.', cls: 'l-dim' });
    else {
      out.push({ text: 'From ' + srv.url, cls: 'l-dim' });
    }
    return out;
  }

  private gitPull(a: string[], out: OutputLine[]): OutputLine[] {
    const name = a.filter((x) => x[0] !== '-')[0] || 'origin';
    const branch = a.filter((x) => x[0] !== '-')[1] || this.currentBranch() || 'main';
    const o1 = this.gitFetch([name], []);
    const o2 = this.gitMerge([name + '/' + branch], []);
    return o1.concat(o2);
  }

  private gitPush(a: string[], out: OutputLine[]): OutputLine[] {
    const r = this.repo;
    const setUp = a.indexOf('-u') > -1 || a.indexOf('--set-upstream') > -1;
    const force = a.indexOf('--force') > -1 || a.indexOf('--force-with-lease') > -1;
    const lease = a.indexOf('--force-with-lease') > -1;
    const del = a.indexOf('--delete') > -1;
    const names = a.filter((x) => x[0] !== '-');
    const name = names[0] || 'origin';
    const branch = names[1] || this.currentBranch() || 'main';
    const srv = r.servers[name];
    if (!srv) return [{ text: "fatal: '" + name + "' does not appear to be a git repository", cls: 'l-err' }];

    if (del) {
      const b = names[1];
      if (srv.branches[b] === undefined) return [{ text: "error: unable to delete '" + b + "': remote ref does not exist", cls: 'l-err' }];
      delete srv.branches[b];
      delete r.remoteRefs[name + '/' + b];
      return [{ text: ' - [deleted]         ' + b, cls: 'l-ok' }];
    }

    if (r.branches[branch] === undefined) return [{ text: 'error: src refspec ' + branch + ' does not match any', cls: 'l-err' }];
    const local = r.branches[branch];
    const remote = srv.branches[branch];

    if (remote && !this.isAncestor(remote, local) && !force) {
      out.push({ text: ' ! [rejected]        ' + branch + ' -> ' + branch + ' (non-fast-forward)', cls: 'l-err' });
      return out;
    }
    if (lease && remote && r.remoteRefs[name + '/' + branch] !== remote) {
      out.push({ text: ' ! [rejected]        ' + branch + ' (stale info)', cls: 'l-err' });
      return out;
    }

    Object.keys(this.ancestors(local)).forEach((s) => {
      if (r.commits[s]) srv.commits[s] = clone(r.commits[s]);
    });
    srv.branches[branch] = local;
    r.remoteRefs[name + '/' + branch] = local;
    out.push({ text: 'To ' + srv.url, cls: 'l-dim' });
    out.push({ text: '   ' + (remote ? remote + '..' : '* [new branch]      ') + local + '  ' + branch + ' -> ' + branch, cls: 'l-ok' });
    if (setUp) out.push({ text: "branch '" + branch + "' set up to track '" + name + '/' + branch + "'.", cls: 'l-dim' });
    return out;
  }

  private cmdGh(a: string[]): OutputLine[] {
    const r = this.repo;
    const out: OutputLine[] = [];
    const sub = a.shift();
    const sub2 = a.shift();
    if (sub === 'pr' && sub2 === 'create') {
      const branch = this.currentBranch();
      const target = r.servers.upstream ? 'upstream' : 'origin';
      if (branch === 'main') {
        return [{ text: 'error: you are on main. Push a feature branch first.', cls: 'l-err' }];
      }
      if (!r.servers.origin || r.servers.origin.branches[branch!] === undefined) {
        return [{ text: 'error: branch ' + branch + ' has not been pushed to your fork yet.', cls: 'l-err' }];
      }
      r.pr = { branch: branch!, sha: r.branches[branch!], target, state: 'OPEN', number: 42 };
      out.push({ text: 'Creating pull request for ' + branch + ' into main', cls: 'l-dim' });
      out.push({ text: 'https://github.com/maintainer/notes-repo/pull/42', cls: 'l-ok' });
      return out;
    }
    if (sub === 'pr' && sub2 === 'status') {
      if (!r.pr) return [{ text: 'no open pull requests from this branch', cls: 'l-dim' }];
      return [{ text: '#' + r.pr.number + '  ' + r.pr.branch + '  [' + r.pr.state + ']', cls: 'l-sha' }];
    }
    if (sub === 'issue' && sub2 === 'list') {
      out.push({ text: '42  OPEN  Improve the notes chapter        enhancement, good first issue', cls: 'l-sha' });
      out.push({ text: '43  OPEN  Fix typos in the README          documentation', cls: 'l-sha' });
      return out;
    }
    if (sub === 'issue' && sub2 === 'comment') {
      r.claimed = true;
      return [{ text: 'https://github.com/maintainer/notes-repo/issues/42#issuecomment-1  (comment posted)', cls: 'l-ok' }];
    }
    return [{ text: 'gh: try "gh issue list", "gh issue comment 42 --body \'...\'" or "gh pr create"', cls: 'l-err' }];
  }

  public seedCommit(msg: string, files: Record<string, string>, branch?: string): string {
    const r = this.repo;
    r.initialized = true;
    if (!r.HEAD) r.HEAD = { branch: branch || 'main' };
    const tree = clone(this.headTree());
    Object.keys(files).forEach((f) => { tree[f] = files[f]; });
    const s = this.makeCommit(msg, this.head() ? [this.head()] : [], tree);
    r.branches[r.HEAD.branch || 'main'] = s;
    r.reflog.unshift({ sha: s, action: 'commit: ' + msg, branch: r.HEAD.branch || 'main' });
    this.checkoutTree(s);
    return s;
  }

  public addServer(name: string, url: string, mirrorCurrent?: boolean): ServerRepo {
    const r = this.repo;
    r.servers[name] = { url, branches: {}, commits: {} };
    if (mirrorCurrent) {
      Object.keys(r.branches).forEach((b) => {
        r.servers[name].branches[b] = r.branches[b];
        Object.keys(this.ancestors(r.branches[b])).forEach((s) => {
          r.servers[name].commits[s] = clone(r.commits[s]);
        });
        r.remoteRefs[name + '/' + b] = r.branches[b];
      });
    }
    return r.servers[name];
  }

  public serverAdvance(name: string, branch: string, msgs: string[], files?: Record<string, string>[]): void {
    const r = this.repo;
    const srv = r.servers[name];
    if (!srv) return;
    let parent = srv.branches[branch];
    msgs.forEach((m, i) => {
      const tree = parent && srv.commits[parent] ? clone(srv.commits[parent].tree) : {};
      const f = (files && files[i]) || {};
      Object.keys(f).forEach((k) => { tree[k] = f[k]; });
      let s = generateSha();
      while (r.commits[s] || srv.commits[s]) s = generateSha();
      srv.commits[s] = { sha: s, msg: m, parents: parent ? [parent] : [], tree, seq: ++r.seq, author: 'maintainer' };
      parent = s;
    });
    srv.branches[branch] = parent;
  }

  public mergePR(): boolean {
    const r = this.repo;
    if (!r.pr || r.pr.state !== 'OPEN') return false;
    const up = r.servers.upstream || r.servers.origin;
    const branchSha = r.pr.sha;
    Object.keys(this.ancestors(branchSha)).forEach((s) => {
      if (r.commits[s]) up.commits[s] = clone(r.commits[s]);
    });
    const base = up.branches.main;
    const tree = clone(r.commits[branchSha].tree);
    const s = generateSha();
    up.commits[s] = {
      sha: s,
      msg: 'Merge pull request #42 from you/' + r.pr.branch,
      parents: [base, branchSha].filter(Boolean),
      tree,
      seq: ++r.seq,
      author: 'maintainer',
    };
    up.branches.main = s;
    r.pr.state = 'MERGED';
    return true;
  }

  public graph(): GraphRow[] {
    const r = this.repo;
    const reachable: Record<string, boolean> = {};
    Object.keys(r.branches).forEach((b) => Object.assign(reachable, this.ancestors(r.branches[b])));
    Object.keys(r.remoteRefs).forEach((b) => Object.assign(reachable, this.ancestors(r.remoteRefs[b])));
    if (this.head()) Object.assign(reachable, this.ancestors(this.head()!));

    const list = Object.keys(reachable)
      .filter((s) => r.commits[s])
      .sort((x, y) => r.commits[y].seq - r.commits[x].seq);

    const lane: Record<string, number> = {};
    const order = Object.keys(r.branches).sort((a, b) => {
      if (a === 'main') return -1;
      if (b === 'main') return 1;
      return a < b ? -1 : 1;
    });
    let n = 0;
    order.forEach((b) => {
      let cur: string | null = r.branches[b];
      const myLane = n;
      let used = false;
      while (cur && r.commits[cur]) {
        if (lane[cur] !== undefined) break;
        lane[cur] = myLane;
        used = true;
        cur = r.commits[cur].parents[0] || null;
      }
      if (used) n++;
    });
    Object.keys(r.remoteRefs).forEach((ref) => {
      let cur: string | null = r.remoteRefs[ref];
      while (cur && r.commits[cur] && lane[cur] === undefined) {
        lane[cur] = n;
        cur = r.commits[cur].parents[0] || null;
      }
    });
    list.forEach((s) => {
      if (lane[s] === undefined) lane[s] = 0;
    });

    return list.map((s) => {
      const c = r.commits[s];
      return {
        sha: s,
        msg: c.msg,
        parents: c.parents.slice(),
        lane: lane[s] || 0,
        refs: this.refsAt(s),
        author: c.author,
      };
    });
  }
}
