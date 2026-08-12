"use client";

import { useState } from "react";
import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";
import { useProgress } from "@/lib/use-progress";

export default function ReferencePage() {
  const { progress, toggleTheme, toastMessage } = useProgress();
  const [searchTerm, setSearchTerm] = useState("");

  const commands = [
    { cmd: "git init", category: "Basics", safety: "Safe", desc: "Create a brand new local repository in current directory." },
    { cmd: "git status", category: "Basics", safety: "Safe", desc: "Inspect working directory state, staged files, and untracked files." },
    { cmd: "git add <file>", category: "Staging", safety: "Safe", desc: "Stage modified or new files into the Index ready for commit." },
    { cmd: "git commit -m \"msg\"", category: "Commits", safety: "Adds History", desc: "Permanently freeze staged changes into a new snapshot commit." },
    { cmd: "git branch", category: "Branching", safety: "Safe", desc: "List local branches; * indicates active checked-out branch." },
    { cmd: "git checkout -b <name>", category: "Branching", safety: "Safe", desc: "Create a new branch and switch HEAD pointer to it instantly." },
    { cmd: "git merge <branch>", category: "Merging", safety: "Adds History", desc: "Combine commits from target branch into active branch." },
    { cmd: "git fetch <remote>", category: "Remotes", safety: "Safe", desc: "Download latest commits and refs from remote without touching local workspace." },
    { cmd: "git push -u origin <branch>", category: "Remotes", safety: "Adds History", desc: "Upload local branch commits to remote repository fork." },
    { cmd: "git rebase main", category: "Rewriting", safety: "Rewrites History", desc: "Replay feature branch commits on top of main for linear history." },
    { cmd: "git stash", category: "Parking", safety: "Safe", desc: "Park uncommitted working directory edits on a temporary shelf." },
    { cmd: "git reflog", category: "Rescues", safety: "Safe", desc: "Log all movements of HEAD. Recovers lost commits and reset branches." },
    { cmd: "git reset --hard HEAD~1", category: "Undo", safety: "Destructive", desc: "Discard last commit and reset working tree files. Recoverable via reflog." },
    { cmd: "git revert <sha>", category: "Undo", safety: "Adds History", desc: "Create a brand new commit that safely cancels out targeted commit edits." },
  ];

  const filtered = commands.filter(
    (c) =>
      c.cmd.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            Searchable Command Reference 📖
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Git Command Cheat Sheet & Safety Levels
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
            Categorized by workflow with safety indicator levels.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 max-w-md mx-auto">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search commands, categories, or descriptions (e.g. rebase, stash, reset)..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />
        </div>

        {/* Commands Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold">
                <th className="p-3">Command</th>
                <th className="p-3">Category</th>
                <th className="p-3">Safety Level</th>
                <th className="p-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((item, idx) => {
                let badgeCls = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300";
                if (item.safety === "Rewrites History") badgeCls = "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300";
                else if (item.safety === "Destructive") badgeCls = "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300";

                return (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {item.cmd}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{item.category}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${badgeCls}`}>
                        {item.safety}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.desc}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      <Footer />
    </div>
  );
}
