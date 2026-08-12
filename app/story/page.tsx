"use client";

import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";
import { useProgress } from "@/lib/use-progress";

export default function StoryPage() {
  const { progress, toggleTheme, toastMessage } = useProgress();

  const chapters = [
    {
      step: 1,
      tag: "Chapter 1 · Day 1",
      title: "Creating the Project & Initializing Git",
      icon: "⚡",
      narrative:
        "You open your terminal to start a brand new project. You create a folder <code>my-app</code> and run <code>git init</code>. Git creates a hidden <code>.git</code> directory inside your folder. This hidden folder is Git's brain — it stores every snapshot, commit pointer, and branch configuration locally on your computer.",
      code: [
        { cmt: "# Create project folder and step inside", cmd: "mkdir my-app && cd my-app" },
        { cmt: "# Initialize Git repository", cmd: "git init" },
      ],
      tip: "Running <code>git init</code> turns a plain directory into a Git repository. Everything remains 100% local on your hard drive!",
    },
    {
      step: 2,
      tag: "Chapter 2 · Staging",
      title: "Creating Files & The 3-State Staging Pipeline",
      icon: "📦",
      narrative:
        "You write code in <code>README.md</code> and <code>notes.md</code>. When you type <code>git status</code>, Git highlights these files in red as <b>UNTRACKED</b>. To include them in your next snapshot, you run <code>git add .</code> to stage them into the Index. Finally, you run <code>git commit -m \"Initial commit\"</code> to permanently freeze your first snapshot in history!",
      code: [
        { cmt: "# Check working tree status", cmd: "git status" },
        { cmt: "# Stage all modified and untracked files", cmd: "git add ." },
        { cmt: "# Freeze staged changes as a permanent snapshot commit", cmd: 'git commit -m "Initial project structure"' },
      ],
      tip: "<b>Working Directory</b> ➔ <code>git add</code> ➔ <b>Staging Area (Index)</b> ➔ <code>git commit</code> ➔ <b>Repository Graph</b>.",
    },
    {
      step: 3,
      tag: "Chapter 3 · Branching",
      title: "Feature Isolation with Lightweight Branches",
      icon: "🔀",
      narrative:
        "You need to build a new login feature. Instead of risking breaking your stable <code>main</code> branch, you run <code>git checkout -b feature-login</code>. In Git, a branch is not a full directory copy — it is simply a 40-character pointer pointing to your current commit! You make changes, test freely, and commit safely without affecting <code>main</code>.",
      code: [
        { cmt: "# Create new branch and switch HEAD pointer to it", cmd: "git checkout -b feature-login" },
        { cmt: "# Commit changes isolated on the branch", cmd: 'git commit -m "Build user login form"' },
      ],
      tip: "<code>HEAD</code> points to the branch you are currently standing on. Switching branches moves <code>HEAD</code> and updates your working disk files instantly.",
    },
    {
      step: 4,
      tag: "Chapter 4 · Collaboration",
      title: "Multi-Developer Sync & GitHub Remotes",
      icon: "🌐",
      narrative:
        "Your project goes open-source on GitHub! You publish your feature branch using <code>git push -u origin feature-login</code> and open a Pull Request. Meanwhile, another developer merges code into the canonical <code>upstream/main</code> repo. To update your local machine safely, you run <code>git fetch upstream</code> and <code>git merge --ff-only upstream/main</code>.",
      code: [
        { cmt: "# Push branch to your GitHub fork", cmd: "git push -u origin feature-login" },
        { cmt: "# Fetch latest commits from upstream maintainer", cmd: "git fetch upstream" },
        { cmt: "# Safely fast-forward local main", cmd: "git merge --ff-only upstream/main" },
      ],
      tip: "<b>Upstream</b> (maintainer) ➔ <code>git fetch</code> ➔ <b>Local</b> (your laptop) ➔ <code>git push</code> ➔ <b>Origin</b> (your GitHub fork).",
    },
    {
      step: 5,
      tag: "Chapter 5 · Conflicts",
      title: "Facing & Resolving Merge Conflicts",
      icon: "💥",
      narrative:
        "A teammate edited the exact same line in <code>config.json</code> that you modified on your branch. When you attempt <code>git merge feature-login</code>, Git stops and warns: <code>Merge conflict in config.json</code>. Git places conflict markers in your file: <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD</code>, <code>=======</code>, <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code>. You open the file, delete conflict markers, stage with <code>git add config.json</code>, and run <code>git commit</code> to seal the merge!",
      code: [
        { cmt: "# Attempt merge — conflict occurs", cmd: "git merge feature-login" },
        { cmt: "# Open file, remove <<<<<<< markers, stage resolved file", cmd: "git add config.json" },
        { cmt: "# Complete merge commit", cmd: "git commit" },
      ],
      tip: "Merge conflicts are simply Git asking a human to decide between two conflicting edits. If you ever feel lost, run <code>git merge --abort</code> to reset!",
    },
    {
      step: 6,
      tag: "Chapter 6 · Rescue",
      title: "Emergency Rescues & History Rewriting",
      icon: "🛠️",
      narrative:
        "You accidentally run <code>git reset --hard HEAD~1</code> and a commit disappears from your history! Don't panic. You run <code>git reflog</code> — Git's safety net that records every movement of <code>HEAD</code>. You locate the SHA of your deleted commit and run <code>git checkout -b rescue &lt;sha&gt;</code> to bring your lost work back to life!",
      code: [
        { cmt: "# View complete history log of HEAD movements", cmd: "git reflog" },
        { cmt: "# Recover lost commit onto a brand new branch", cmd: "git checkout -b rescue a1b2c3d" },
      ],
      tip: "Nothing in Git is truly lost while it remains in the <code>reflog</code>! History is never destroyed until garbage collection runs weeks later.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderNav
        xp={progress.xp}
        theme={progress.theme}
        onToggleTheme={toggleTheme}
        toastMessage={toastMessage}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 font-sans">
        <div className="text-center mb-10">
          <p className="inline-block px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2 border border-amber-200 dark:border-amber-800">
            One Shot ⚡ &middot; Continuous Life-Cycle Narrative
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
            The Single Paragraph Git Journey
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
            From your very first <code>git init</code> command to multi-developer collaboration, merge conflicts, and reflog rescues — read the complete story top to bottom.
          </p>
        </div>

        <div className="space-y-8 relative before:absolute before:inset-0 before:left-6 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 before:-z-10">
          {chapters.map((ch) => (
            <div key={ch.step} className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xl shrink-0 shadow-md">
                {ch.icon}
              </div>

              <div className="flex-1 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {ch.tag}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">Step 0{ch.step}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {ch.title}
                </h3>

                <p
                  className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4"
                  dangerouslySetInnerHTML={{ __html: ch.narrative }}
                />

                <div className="p-3 rounded-xl bg-[#0F172A] text-slate-200 font-mono text-xs space-y-1 mb-3">
                  {ch.code.map((c, i) => (
                    <div key={i}>
                      <span className="text-slate-500 block text-[11px]">{c.cmt}</span>
                      <span className="text-emerald-400 font-semibold">{c.cmd}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-xs text-indigo-800 dark:text-indigo-200 flex items-start gap-2">
                  <span className="text-base">💡</span>
                  <div dangerouslySetInnerHTML={{ __html: ch.tip }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/levels/1"
            className="inline-block px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 transition"
          >
            Launch Interactive Level 1 Trainer &rarr;
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
