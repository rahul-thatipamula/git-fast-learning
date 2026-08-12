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
      title: "Creating the Project & Turning On Git",
      icon: "⚡",
      narrative:
        "<b>Beginner Mental Model:</b> Imagine turning on a security camera inside your project folder! You open your terminal, create a folder named <code>my-app</code>, and type <code>git init</code>. Git creates a hidden <code>.git</code> folder inside your directory. This hidden folder is Git's brain — it stores every snapshot and change locally on your laptop without sending anything to the internet.",
      code: [
        { cmt: "# Create project folder and step inside", cmd: "mkdir my-app && cd my-app" },
        { cmt: "# Turn on Git tracking in this folder", cmd: "git init" },
      ],
      tip: "Running <code>git init</code> turns a plain folder into an intelligent Git repository. Everything stays 100% private on your laptop hard drive!",
    },
    {
      step: 2,
      tag: "Chapter 2 · Staging",
      title: "Creating Files & The Photo Snapshot Analogy",
      icon: "📦",
      narrative:
        "<b>Beginner Photo Analogy:</b> Imagine taking a group photo! <br/>1. <b>Working Directory:</b> People walking around (untracked/modified files in red). <br/>2. <b>Staging Area (<code>git add .</code>):</b> Asking people to stand in front of the camera lens ready for the shot (staged files in green). <br/>3. <b>Repository Commit (<code>git commit</code>):</b> Clicking the shutter button! Your snapshot is permanently saved in history.",
      code: [
        { cmt: "# Check who is walking around (file status)", cmd: "git status" },
        { cmt: "# Line up all changes in front of camera lens (staging)", cmd: "git add ." },
        { cmt: "# Click the shutter button to save photo (commit)", cmd: 'git commit -m "Initial project snapshot"' },
      ],
      tip: "<b>Working Directory</b> ➔ <code>git add</code> ➔ <b>Staging Area</b> ➔ <code>git commit</code> ➔ <b>Permanent Snapshot Graph</b>.",
    },
    {
      step: 3,
      tag: "Chapter 3 · Branching",
      title: "Feature Isolation — Working in a Parallel Universe",
      icon: "🔀",
      narrative:
        "<b>Beginner Sandbox Analogy:</b> Want to build a new feature without risking breaking your working code? In Git, you create a <i>branch</i>! Typing <code>git checkout -b feature-login</code> creates a parallel universe where you can experiment, make mistakes, and commit freely. Your working <code>main</code> branch stays completely safe!",
      code: [
        { cmt: "# Create and switch to an isolated sandbox branch", cmd: "git checkout -b feature-login" },
        { cmt: "# Save changes safely inside the branch", cmd: 'git commit -m "Build user login form"' },
      ],
      tip: "In Git, a branch is not a huge folder copy — it is a lightweight 40-character pointer! Switching branches swaps your disk files instantly.",
    },
    {
      step: 4,
      tag: "Chapter 4 · Collaboration",
      title: "Syncing Team Work — The 3-Copy Model",
      icon: "🌐",
      narrative:
        "<b>Beginner Cloud Analogy:</b> When working with a team, 3 copies of the code exist: <br/>1. <b>Upstream:</b> The official project owned by the lead maintainer. <br/>2. <b>Origin:</b> Your personal online GitHub copy (fork). <br/>3. <b>Local:</b> Your laptop. <br/>You run <code>git fetch upstream</code> to download new team commits, and <code>git push origin</code> to upload your finished feature!",
      code: [
        { cmt: "# Upload feature branch to your online GitHub fork", cmd: "git push -u origin feature-login" },
        { cmt: "# Download latest team updates from official project", cmd: "git fetch upstream" },
        { cmt: "# Fast-forward your local main branch safely", cmd: "git merge --ff-only upstream/main" },
      ],
      tip: "<b>Upstream</b> (maintainer) ➔ <code>git fetch</code> ➔ <b>Local</b> (your laptop) ➔ <code>git push</code> ➔ <b>Origin</b> (your GitHub fork).",
    },
    {
      step: 5,
      tag: "Chapter 5 · Conflicts",
      title: "Merge Conflicts — When Git Asks a Human for Help",
      icon: "💥",
      narrative:
        "<b>Beginner Conflict Analogy:</b> A merge conflict happens when two developers edit the exact same line of code. Git doesn't guess who is right — it stops and places markers in the file: <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD</code>, <code>=======</code>, <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code>. You open the file, delete the marker lines, keep the best code, and run <code>git add</code> + <code>git commit</code>!",
      code: [
        { cmt: "# Attempt to merge branch — Git pauses for conflict", cmd: "git merge feature-login" },
        { cmt: "# Open file, remove <<<<<<< markers, stage resolved file", cmd: "git add config.json" },
        { cmt: "# Complete the merge commit snapshot", cmd: "git commit" },
      ],
      tip: "Merge conflicts are normal! Git is simply asking a human to decide between two edits. If you get confused, run <code>git merge --abort</code> to reset!",
    },
    {
      step: 6,
      tag: "Chapter 6 · Rescue",
      title: "Emergency Rescues — The Reflog Time Machine",
      icon: "🛠️",
      narrative:
        "<b>Beginner Time Machine Analogy:</b> What if you accidentally delete a commit or run <code>git reset --hard</code>? Don't panic! Git records every single step you take in a flight recorder called <code>git reflog</code>. You open <code>git reflog</code>, find the SHA code of your deleted work, and run <code>git checkout -b rescue &lt;sha&gt;</code> to bring it back to life!",
      code: [
        { cmt: "# Open Git's black box flight recorder log", cmd: "git reflog" },
        { cmt: "# Recover lost commit onto a new rescue branch", cmd: "git checkout -b rescue a1b2c3d" },
      ],
      tip: "Nothing in Git is lost while the <code>reflog</code> remembers it! Git never deletes commits immediately — your work is safe on disk.",
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
