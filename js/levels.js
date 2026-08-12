/* ============================================================
   Fast-Forward — level definitions.
   Each task's check() runs against the live repo after every
   command, so any route that genuinely reaches the goal counts.
   ============================================================ */

(function (global) {
  'use strict';

  function ran(ctx, re) {
    return ctx.history.some(function (c) { return re.test(c.trim()); });
  }
  function commits(git) { return Object.keys(git.repo.commits).length; }
  function branchNames(git) { return Object.keys(git.repo.branches); }
  function featureBranches(git) { return branchNames(git).filter(function (b) { return b !== 'main'; }); }
  function anyCommitMsg(git, re) {
    var c = git.repo.commits;
    return Object.keys(c).some(function (s) { return re.test(c[s].msg); });
  }

  /* ============================================================
     LEVEL 1 — Basics
     ============================================================ */

  var L1 = {
    id: 1,
    title: 'Your first repository',
    next: 'level-2-branching.html',
    quick: ['git init', 'touch README.md', 'git status', 'git add README.md', 'git commit -m "initial commit"', 'touch notes.md', 'git diff', 'git add notes.md', 'git commit -m "add notes"', 'git log --oneline'],
    intro: [
      'Scenario 1: You just joined a new project!',
      'Follow Git Cat\'s scenario steps below — type commands or click visual buttons.',
      'Stuck? Type help or click any task hint.'
    ],
    outro: 'Meow-velous! You mastered repository creation, staging, commits, diffing, and reading history.',
    seed: function () { /* empty: learner runs git init */ },
    tasks: [
      /* Scenario 1: Project Setup */
      {
        id: 'init', short: '1. repo initialized',
        text: '<b>Scenario 1: Project Setup.</b> Turn this empty folder into a Git repository with <code>git init</code>.',
        hint: 'git init',
        check: function (g) { return g.repo.initialized; }
      },
      {
        id: 'readme', short: '2. README created',
        text: 'Create a project documentation file: <code>touch README.md</code> (or click <b>+ New File</b> above).',
        hint: 'touch README.md',
        check: function (g) { return g.repo.worktree['README.md'] !== undefined; }
      },
      {
        id: 'status', short: '3. status checked',
        text: 'Check repository status with <code>git status</code>. Notice Git labels <code>README.md</code> as <em>untracked</em>.',
        hint: 'git status',
        check: function (g, ctx) { return ran(ctx, /^git status/); }
      },
      /* Scenario 2: First Snapshot */
      {
        id: 'add_readme', short: '4. README staged',
        text: '<b>Scenario 2: First Snapshot.</b> Stage the file with <code>git add README.md</code> (or click <b>⚡ Stage</b>).',
        hint: 'git add README.md',
        check: function (g) { return g.repo.index['README.md'] !== undefined; }
      },
      {
        id: 'commit_readme', short: '5. first commit frozen',
        text: 'Freeze your first snapshot: <code>git commit -m "initial commit"</code>.',
        hint: 'git commit -m "initial commit"',
        check: function (g) { return commits(g) >= 1; }
      },
      /* Scenario 3: Selective Staging & Feature Edits */
      {
        id: 'notes', short: '6. feature notes created',
        text: '<b>Scenario 3: Selective Staging.</b> Create a new file <code>notes.md</code>.',
        hint: 'touch notes.md',
        check: function (g) { return g.repo.worktree['notes.md'] !== undefined; }
      },
      {
        id: 'diff', short: '7. changes inspected',
        text: 'Inspect changes using <code>git diff</code>.',
        hint: 'git diff',
        check: function (g, ctx) { return ran(ctx, /^git diff/); }
      },
      {
        id: 'selective_add', short: '8. notes staged',
        text: 'Stage ONLY <code>notes.md</code> with <code>git add notes.md</code> (or click <b>⚡ Stage</b>).',
        hint: 'git add notes.md',
        check: function (g) { return g.repo.index['notes.md'] !== undefined; }
      },
      {
        id: 'commit_notes', short: '9. feature snapshot committed',
        text: 'Save the new feature snapshot: <code>git commit -m "add feature notes"</code>.',
        hint: 'git commit -m "add feature notes"',
        check: function (g) { return commits(g) >= 2; }
      },
      /* Scenario 4: Reading History */
      {
        id: 'log', short: '10. history inspected',
        text: '<b>Scenario 4: Project Timeline.</b> Inspect your commit log with <code>git log --oneline</code>.',
        hint: 'git log --oneline',
        check: function (g, ctx) { return ran(ctx, /^git log/) && commits(g) >= 2; }
      }
    ]
  };

  /* ============================================================
     LEVEL 2 — Branching & merging
     ============================================================ */

  var L2 = {
    id: 2,
    title: 'Branches, merges and one honest conflict',
    next: 'level-3-github.html',
    quick: ['git branch', 'git checkout -b add-examples', 'git status', 'git merge add-examples', 'git log --oneline --all'],
    intro: [
      'A repo with two commits on main, and a branch called quick-fix',
      'that somebody else already finished.',
      'Your job: do your own work on a branch, merge it, then deal with',
      'the conflict that quick-fix has been waiting to cause.'
    ],
    outro: 'Fast-forward, merge commit, conflict — that is every merge you will ever meet.',
    seed: function (g) {
      g.seedCommit('initial notes', { 'notes.md': '# Notes\n' });
      g.seedCommit('add intro paragraph', { 'notes.md': '# Notes\n\nAn introduction.\n' });
      var mainSha = g.head();
      // a colleague's branch, already committed, touching the same file
      g.repo.HEAD = { branch: 'quick-fix' };
      g.repo.branches['quick-fix'] = mainSha;
      g.seedCommit('fix typo in intro', { 'notes.md': '# Notes\n\nAn introduction, proofread.\n' });
      g.repo.HEAD = { branch: 'main' };
      g.checkoutTree(mainSha);
    },
    tasks: [
      {
        id: 'list', short: 'branches listed',
        text: 'Run <code>git branch</code> to see what exists. The <code>*</code> marks where you are standing.',
        hint: 'git branch',
        check: function (g, ctx) { return ran(ctx, /^git branch\s*$/); }
      },
      {
        id: 'create', short: 'branch created',
        text: 'Start your own work: <code>git checkout -b add-examples</code>. One branch per piece of work.',
        hint: 'git checkout -b add-examples',
        check: function (g) { return branchNames(g).length >= 3 && g.currentBranch() !== 'main'; }
      },
      {
        id: 'work', short: 'committed on the branch',
        text: 'Add a line to <code>notes.md</code> (click it to edit) and commit it on this branch.',
        hint: 'click notes.md, add a line, save — then: git add notes.md   and   git commit -m "add an example"',
        check: function (g) {
          var b = g.currentBranch();
          if (!b || b === 'main') {
            return featureBranches(g).some(function (x) {
              return x !== 'quick-fix' && g.repo.branches[x] !== g.repo.branches.main && commits(g) >= 4;
            });
          }
          return commits(g) >= 4 && g.repo.branches[b] !== g.repo.branches.main;
        }
      },
      {
        id: 'back', short: 'back on main',
        text: 'Go back with <code>git checkout main</code>. Look at the file list — your new line is gone, because it lives on the other branch.',
        hint: 'git checkout main',
        check: function (g, ctx) { return ran(ctx, /^git (checkout|switch) main$/) && g.currentBranch() === 'main'; }
      },
      {
        id: 'ff', short: 'fast-forward merge done',
        text: 'Merge your branch into main: <code>git merge add-examples</code>. Main had no new commits, so git just moves the pointer forward — a <em>fast-forward</em>.',
        hint: 'git merge add-examples',
        check: function (g, ctx) {
          if (!ran(ctx, /^git merge/)) return false;
          return featureBranches(g).some(function (b) {
            return b !== 'quick-fix' && g.isAncestor(g.repo.branches[b], g.repo.branches.main);
          }) || anyCommitMsg(g, /^Merge branch/);
        }
      },
      {
        id: 'delete', short: 'merged branch deleted',
        text: 'That branch is finished. Delete it: <code>git branch -d add-examples</code>. Lowercase <code>-d</code> refuses if the work is not merged — that refusal is a seatbelt.',
        hint: 'git branch -d add-examples',
        check: function (g, ctx) { return ran(ctx, /^git branch -d/) && branchNames(g).length <= 2; }
      },
      {
        id: 'conflict', short: 'conflict triggered',
        text: 'Now merge the other branch: <code>git merge quick-fix</code>. You both edited the same line, so git stops and asks you to decide.',
        hint: 'git merge quick-fix',
        check: function (g, ctx) { return ran(ctx, /^git merge quick-fix/); }
      },
      {
        id: 'resolve', short: 'conflict resolved',
        text: 'Open <code>notes.md</code>, delete the <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code> / <code>=======</code> / <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code> markers, keep the text you want, save, then <code>git add notes.md</code>.',
        hint: 'click notes.md, remove the marker lines and keep one version, save — then: git add notes.md',
        check: function (g) {
          return g.repo.conflict !== null && g.repo.conflict.files.length === 0;
        }
      },
      {
        id: 'seal', short: 'merge commit created',
        text: 'Finish the merge with <code>git commit</code>. The result has two parents — that is what a merge commit is.',
        hint: 'git commit -m "merge quick-fix"',
        check: function (g) {
          var c = g.repo.commits;
          return Object.keys(c).some(function (s) { return c[s].parents.length > 1; });
        }
      }
    ]
  };

  /* ============================================================
     LEVEL 3 — GitHub, forks, pull requests
     ============================================================ */

  var L3 = {
    id: 3,
    title: 'Forks, remotes and a real pull request',
    next: 'level-4-advanced.html',
    quick: ['git remote -v', 'gh issue list', 'git fetch upstream', 'git merge --ff-only upstream/main', 'git push origin main', 'gh pr create'],
    intro: [
      'You have forked somebody else\'s project and cloned your fork.',
      'Three copies now exist: upstream (theirs), origin (your fork), local (here).',
      'The maintainer has pushed work since you forked. Start by looking around.'
    ],
    outro: 'That is the whole open-source contribution loop: sync, branch, push, PR, sync, delete.',
    actions: [
      {
        label: '▶ maintainer merges your PR',
        run: function (g) {
          if (!g.repo.pr) return 'No pull request is open yet — run "gh pr create" first.';
          if (g.repo.pr.state === 'MERGED') return 'Already merged. Now sync your main and clean up.';
          g.mergePR();
          return 'The maintainer merged PR #42 into upstream/main. Nothing on your machine has changed yet — prove it with "git log --oneline".';
        }
      }
    ],
    seed: function (g) {
      g.seedCommit('initial notes', { 'notes.md': '# Notes\n' });
      g.seedCommit('add chapter 1', { 'ch1.md': '# Chapter 1\n' });
      g.addServer('origin', 'https://github.com/you/notes-repo.git', true);
      g.addServer('upstream', 'https://github.com/maintainer/notes-repo.git', true);
      g.serverAdvance('upstream', 'main',
        ['docs: add chapter 2', 'chore: tidy the README'],
        [{ 'ch2.md': '# Chapter 2\n' }, { 'README.md': '# Notes repo\n' }]);
    },
    tasks: [
      {
        id: 'remotes', short: 'remotes inspected',
        text: 'Run <code>git remote -v</code>. Two remotes: <code>origin</code> is your fork, <code>upstream</code> is the real project.',
        hint: 'git remote -v',
        check: function (g, ctx) { return ran(ctx, /^git remote/); }
      },
      {
        id: 'claim', short: 'issue claimed',
        text: 'See what needs doing with <code>gh issue list</code>, then claim one so nobody duplicates your work: <code>gh issue comment 42 --body "I\'ll take this"</code>.',
        hint: 'gh issue comment 42 --body "I\'ll take this"',
        check: function (g) { return !!g.repo.claimed; }
      },
      {
        id: 'fetch', short: 'upstream fetched',
        text: 'Download what the maintainer did: <code>git fetch upstream</code>. Notice your own branch does not move — fetch only updates <code>upstream/main</code>.',
        hint: 'git fetch upstream',
        check: function (g) {
          return g.repo.remoteRefs['upstream/main'] === g.repo.servers.upstream.branches.main;
        }
      },
      {
        id: 'sync', short: 'main synced',
        text: 'Now bring it into your branch: <code>git merge --ff-only upstream/main</code>. That is what "syncing your fork" means.',
        hint: 'git checkout main   then   git merge --ff-only upstream/main',
        check: function (g) {
          return g.repo.branches.main === g.repo.servers.upstream.branches.main;
        }
      },
      {
        id: 'pushmain', short: 'fork updated',
        text: 'Your fork on GitHub is still behind. Push: <code>git push origin main</code>.',
        hint: 'git push origin main',
        check: function (g) {
          return g.repo.servers.origin.branches.main === g.repo.branches.main;
        }
      },
      {
        id: 'branch', short: 'work branch created',
        text: 'Branch for the issue: <code>git checkout -b issue-42-improve-notes</code>. Never work directly on main — that is what keeps syncing painless.',
        hint: 'git checkout -b issue-42-improve-notes',
        check: function (g) { return featureBranches(g).length >= 1; }
      },
      {
        id: 'commit', short: 'work committed',
        text: 'Do the work: create or edit a file, stage it, and commit on this branch.',
        hint: 'touch ch3.md   then   git add ch3.md   then   git commit -m "docs: add chapter 3"',
        check: function (g) {
          return featureBranches(g).some(function (b) { return g.repo.branches[b] !== g.repo.branches.main; });
        }
      },
      {
        id: 'pushbranch', short: 'branch pushed to fork',
        text: 'Push the branch to <em>your fork</em>: <code>git push -u origin issue-42-improve-notes</code>. You cannot push to upstream — you do not own it.',
        hint: 'git push -u origin issue-42-improve-notes',
        check: function (g) {
          var srv = g.repo.servers.origin.branches;
          return Object.keys(srv).some(function (b) { return b !== 'main'; });
        }
      },
      {
        id: 'pr', short: 'pull request opened',
        text: 'Open the pull request with <code>gh pr create</code>. A PR asks the maintainer to pull your branch into <em>their</em> main.',
        hint: 'gh pr create',
        check: function (g) { return !!g.repo.pr; }
      },
      {
        id: 'merged', short: 'PR merged upstream',
        text: 'Press <b>▶ maintainer merges your PR</b> above. Then run <code>git log --oneline</code> — nothing on your machine changed. A merge upstream never touches your computer.',
        hint: 'press the button, then: git log --oneline',
        check: function (g, ctx) {
          return g.repo.pr && g.repo.pr.state === 'MERGED' && ran(ctx, /^git log/);
        }
      },
      {
        id: 'resync', short: 'fork re-synced',
        text: 'Sync again so your main contains the merged work: <code>git checkout main</code>, <code>git fetch upstream</code>, <code>git merge --ff-only upstream/main</code>, <code>git push origin main</code>.',
        hint: 'git checkout main && git fetch upstream && git merge --ff-only upstream/main && git push origin main',
        check: function (g) {
          return g.repo.pr && g.repo.pr.state === 'MERGED' &&
            g.repo.branches.main === g.repo.servers.upstream.branches.main &&
            g.repo.servers.origin.branches.main === g.repo.branches.main;
        }
      },
      {
        id: 'cleanup', short: 'branch deleted everywhere',
        text: 'Only now delete the branch, in both places: <code>git branch -d issue-42-improve-notes</code> and <code>git push origin --delete issue-42-improve-notes</code>.',
        hint: 'git branch -d issue-42-improve-notes   then   git push origin --delete issue-42-improve-notes',
        check: function (g) {
          var localGone = featureBranches(g).length === 0;
          var remoteGone = Object.keys(g.repo.servers.origin.branches).every(function (b) { return b === 'main'; });
          return localGone && remoteGone;
        }
      }
    ]
  };

  /* ============================================================
     LEVEL 4 — Advanced: rewriting, rescuing, undoing
     ============================================================ */

  var L4 = {
    id: 4,
    title: 'Rewriting, rescuing and undoing',
    next: 'reference.html',
    quick: ['git stash', 'git stash pop', 'git rebase main', 'git reflog', 'git cherry-pick', 'git revert HEAD'],
    intro: [
      'main and polish-ch1 have both moved on — the branches have diverged.',
      'Both are already pushed to origin.',
      'This level is about the commands people are scared of, in the order',
      'that makes them stop being scary.'
    ],
    outro: 'Nothing in git is truly lost while the reflog remembers it. That is the whole reason to relax.',
    seed: function (g) {
      g.seedCommit('initial notes', { 'notes.md': '# Notes\n' });
      g.seedCommit('add chapter 1', { 'ch1.md': '# Chapter 1\n\nA first draft.\n' });
      var base = g.head();
      g.repo.HEAD = { branch: 'polish-ch1' };
      g.repo.branches['polish-ch1'] = base;
      g.seedCommit('polish: tighten the wording', { 'ch1.md': '# Chapter 1\n\nA tighter draft.\n' });
      g.seedCommit('polish: add a worked example', { 'ch1.md': '# Chapter 1\n\nA tighter draft.\n\nExample: ...\n' });
      g.repo.HEAD = { branch: 'main' };
      g.checkoutTree(base);
      g.seedCommit('docs: add chapter 2', { 'ch2.md': '# Chapter 2\n' });
      g.addServer('origin', 'https://github.com/you/notes-repo.git', true);
    },
    tasks: [
      {
        id: 'stash', short: 'work in progress parked',
        text: 'Edit any file but do <em>not</em> commit. Now try <code>git checkout polish-ch1</code> — git refuses. Park the change with <code>git stash</code> and switch.',
        hint: 'edit a file, then: git stash   then: git checkout polish-ch1',
        check: function (g, ctx) { return ran(ctx, /^git stash\s*$/) || ran(ctx, /^git stash push/); }
      },
      {
        id: 'pop', short: 'work in progress restored',
        text: 'Bring it back with <code>git stash pop</code>. Stash is a shelf, not a bin.',
        hint: 'git stash pop',
        check: function (g, ctx) { return ran(ctx, /^git stash (pop|apply)/); }
      },
      {
        id: 'rebase', short: 'branch rebased',
        text: 'Put your branch on top of the latest main: <code>git checkout polish-ch1</code> then <code>git rebase main</code>. The graph goes from a fork to a straight line.',
        hint: 'git checkout polish-ch1   then   git rebase main',
        check: function (g, ctx) {
          return ran(ctx, /^git rebase/) &&
            g.repo.branches['polish-ch1'] &&
            g.isAncestor(g.repo.branches.main, g.repo.branches['polish-ch1']);
        }
      },
      {
        id: 'lease', short: 'rebased branch pushed safely',
        text: 'Rebasing gave those commits new SHAs, so a normal push is rejected. Use <code>git push --force-with-lease</code> — it refuses if somebody else pushed meanwhile.',
        hint: 'git push --force-with-lease origin polish-ch1',
        check: function (g, ctx) {
          return ran(ctx, /--force-with-lease/) &&
            g.repo.servers.origin.branches['polish-ch1'] === g.repo.branches['polish-ch1'];
        }
      },
      {
        id: 'amend', short: 'commit message rewritten',
        text: 'Fix the wording of your last commit with <code>git commit --amend -m "polish: add a clearer example"</code>. Amend replaces a commit rather than adding one.',
        hint: 'git commit --amend -m "polish: add a clearer example"',
        check: function (g, ctx) { return ran(ctx, /^git commit --amend/); }
      },
      {
        id: 'reset', short: 'commit thrown away',
        text: 'Now break something on purpose: <code>git reset --hard HEAD~1</code>. A commit vanishes from the graph.',
        hint: 'git reset --hard HEAD~1',
        check: function (g, ctx) { return ran(ctx, /^git reset --hard/); }
      },
      {
        id: 'rescue', short: 'lost commit recovered',
        text: 'Get it back. <code>git reflog</code> lists where HEAD has been; find the SHA and run <code>git checkout -b rescue &lt;sha&gt;</code>.',
        hint: 'git reflog   then   git checkout -b rescue <sha from the list>',
        check: function (g, ctx) {
          return ran(ctx, /^git reflog/) && branchNames(g).some(function (b) { return /^rescue/.test(b); });
        }
      },
      {
        id: 'cherry', short: 'commit cherry-picked',
        text: 'Take one commit from elsewhere without merging the whole branch: <code>git checkout main</code>, then <code>git cherry-pick &lt;sha&gt;</code> using a SHA from <code>git log --oneline --all</code>.',
        hint: 'git log --oneline --all   then   git checkout main   then   git cherry-pick <sha>',
        check: function (g, ctx) { return ran(ctx, /^git cherry-pick/) && !ran(ctx, /^git cherry-pick\s*$/); }
      },
      {
        id: 'revert', short: 'change safely undone',
        text: 'Finally, undo a commit the safe way: <code>git revert HEAD</code>. It makes a <em>new</em> commit that cancels the old one — nothing is rewritten, so it is safe on shared branches.',
        hint: 'git revert HEAD',
        check: function (g) { return anyCommitMsg(g, /^Revert "/); }
      }
    ]
  };

  global.LEVELS = { 1: L1, 2: L2, 3: L3, 4: L4 };
})(window);
