"use client";

import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";
import { useProgress } from "@/lib/use-progress";
import { LEVELS_DATA } from "@/lib/levels-data";

export default function HomePage() {
  const { progress, toggleTheme, toastMessage } = useProgress();

  const totalTasks = 10 + 9 + 12 + 9;
  let doneCount = 0;
  Object.values(progress.levels).forEach((lvl) => {
    doneCount += lvl.tasks ? lvl.tasks.length : 0;
  });
  const percent = Math.round((doneCount / totalTasks) * 100);

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderNav
        xp={progress.xp}
        theme={progress.theme}
        onToggleTheme={toggleTheme}
        toastMessage={toastMessage}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center py-10 px-4 mb-8">
          <p className="inline-block px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-4 border border-indigo-200 dark:border-indigo-800">
            Interactive Skill Journey &middot; 1 ➔ 2 ➔ 3 ➔ 4 Roadmap
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4 leading-tight">
            Learn Git by breaking it, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              not by reading about it.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-6 leading-relaxed">
            Real commands. Real DAG graphs. Real pull requests. Four progressive levels taking you from day-one setup to emergency reflog rescues.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/levels/1"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/25 transition hover:scale-105"
            >
              Start Level 1 &rarr;
            </Link>
            <Link
              href="/story"
              className="px-5 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold hover:bg-indigo-50 dark:hover:bg-slate-800 transition hover:scale-105"
            >
              One Shot ⚡ (Full Story)
            </Link>
            <Link
              href="/ask-ai"
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Ask AI Companion 🧠
            </Link>
          </div>
        </div>

        {/* Global XP & Progress Tracker */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-xs mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            <span>Overall Roadmap Progress</span>
            <span>{doneCount} / {totalTasks} Tasks ({percent}%)</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-500 rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* 4 Levels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {Object.values(LEVELS_DATA).map((lvl) => {
            const lvlProgress = progress.levels[lvl.id] || { done: false, tasks: [] };
            const isDone = lvlProgress.done || lvlProgress.tasks.length >= lvl.tasks.length;
            const lvlTasksDone = lvlProgress.tasks.length;

            const icons: Record<number, string> = { 1: "🚀", 2: "🔀", 3: "🌐", 4: "🛠️" };

            return (
              <div
                key={lvl.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{icons[lvl.id]}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isDone
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                          : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                      }`}
                    >
                      {isDone ? "✓ Complete" : `Step 0${lvl.id}`}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                    Level {lvl.id}: {lvl.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                    {lvl.intro[0]}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4 font-mono text-[11px]">
                    {lvl.quick.slice(0, 5).map((cmd) => (
                      <span
                        key={cmd}
                        className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        {cmd}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">
                    {lvlTasksDone} / {lvl.tasks.length} tasks
                  </span>

                  <Link
                    href={`/levels/${lvl.id}`}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                  >
                    {isDone ? "Review Level ➔" : "Launch Level ➔"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Core Interactive Features Banner */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 text-center">
            Built for Genuine Command-Line Mastery
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-2xl mb-1 inline-block">📟</span>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Real Terminal</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                In-browser shell supporting git init, add, commit, branch, merge, rebase, and stash.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-2xl mb-1 inline-block">📈</span>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Animated DAG Graph</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Dynamic SVG commit history graph drawing parent links, branch pointers, and HEAD refs.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-2xl mb-1 inline-block">🐱</span>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Git Cat Guidance</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Real-time tutor mascot offering celebratory toasts and step-by-step task hints.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
