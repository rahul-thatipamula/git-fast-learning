"use client";

import { useState } from "react";
import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";
import { useProgress } from "@/lib/use-progress";

export default function AskAIPage() {
  const { progress, toggleTheme, showToast, toastMessage } = useProgress();
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const categories = [
    "All",
    "Day 1 & Silly",
    "Staging & Commits",
    "Branching & Merging",
    "GitHub & PRs",
    "Rescues & Reflog",
    "Workflows & Team",
    "Fixing Mistakes",
    "Tags & Releases",
    "Career & Mastery",
  ];

  const questions = [
    { cat: "Day 1 & Silly", q: "Why is Git so confusing when all I want to do is save my files?" },
    { cat: "Day 1 & Silly", q: "What is the difference between Git and GitHub?" },
    { cat: "Day 1 & Silly", q: "If I delete my project folder, does my Git history die too?" },
    { cat: "Day 1 & Silly", q: "What actually lives inside the hidden .git directory?" },
    { cat: "Day 1 & Silly", q: "Can I use Git without any internet connection?" },
    { cat: "Day 1 & Silly", q: "Why does git init not create any visible files?" },

    { cat: "Staging & Commits", q: "Why does Git require two steps: git add AND git commit?" },
    { cat: "Staging & Commits", q: "What is the Staging Area (Index) and why is it useful?" },
    { cat: "Staging & Commits", q: "What makes a good commit message vs a bad commit message?" },
    { cat: "Staging & Commits", q: "How do I unstage a file I accidentally added with git add?" },
    { cat: "Staging & Commits", q: "What is the difference between Working Directory, Staging Area, and Repo?" },
    { cat: "Staging & Commits", q: "How do I view changes line-by-line before staging them?" },

    { cat: "Branching & Merging", q: "What is a Git branch under the hood?" },
    { cat: "Branching & Merging", q: "What is the difference between Fast-Forward merge and 3-way merge?" },
    { cat: "Branching & Merging", q: "Why do merge conflicts happen and how do I resolve them safely?" },
    { cat: "Branching & Merging", q: "What does HEAD point to in Git?" },
    { cat: "Branching & Merging", q: "How do I safely delete a local branch vs a remote branch?" },

    { cat: "GitHub & PRs", q: "What is the 3-copy model: Upstream, Origin, and Local?" },
    { cat: "GitHub & PRs", q: "What is a Pull Request (PR) and how does code review work?" },
    { cat: "GitHub & PRs", q: "Why should I never push directly to main on a shared project?" },
    { cat: "GitHub & PRs", q: "How do I sync my fork when the upstream maintainer pushes new commits?" },

    { cat: "Rescues & Reflog", q: "What is git reflog and how can it rescue lost commits?" },
    { cat: "Rescues & Reflog", q: "What is the difference between git reset --soft, --mixed, and --hard?" },
    { cat: "Rescues & Reflog", q: "How does git stash work and where are parked edits saved?" },
    { cat: "Rescues & Reflog", q: "When should I use git rebase vs git merge?" },
    { cat: "Rescues & Reflog", q: "Why is git push --force-with-lease safer than git push --force?" },
  ];

  const filtered = activeCategory === "All" ? questions : questions.filter((q) => q.cat === activeCategory);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("<b>Copied to Clipboard!</b> Paste directly into AI.");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderNav
        xp={progress.xp}
        theme={progress.theme}
        onToggleTheme={toggleTheme}
        toastMessage={toastMessage}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 font-sans">
        <div className="text-center mb-8">
          <p className="inline-block px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2 border border-indigo-200 dark:border-indigo-800">
            What to Ask AI Companion 🧠
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            100 Questions Humans Ask While Learning Git
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
            Click <b>Copy Question 📋</b> on any question below to copy it directly into your AI tutor!
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                activeCategory === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Questions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition"
            >
              <div>
                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-semibold mb-2">
                  {item.cat}
                </span>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed mb-4">
                  "{item.q}"
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(item.q)}
                className="w-full py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <span>Copy Question for AI</span>
                <span>📋</span>
              </button>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
