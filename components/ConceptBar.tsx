"use client";

interface ConceptBarProps {
  onShowInfo: (info: string) => void;
}

export function ConceptBar({ onShowInfo }: ConceptBarProps) {
  const concepts = [
    {
      label: "⭕ Untracked",
      info: "UNTRACKED: New file on disk that Git is not watching yet. Run git add to track it.",
      cls: "border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300",
    },
    {
      label: "✨ Staged",
      info: "STAGED: File prepared in index ready for next commit snapshot. Run git commit.",
      cls: "border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300",
    },
    {
      label: "🔄 Modified",
      info: "UNSTAGED: Edits un-staged or discarded using git restore.",
      cls: "border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
    },
    {
      label: "✅ Tracked",
      info: "TRACKED: Frozen snapshot permanently saved in commit history repository.",
      cls: "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "📦 Stashed",
      info: "STASHED: Dirty working edits temporarily shelved using git stash.",
      cls: "border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300",
    },
    {
      label: "🗑️ Deleted",
      info: "DELETED: Merged branch or file removed using git branch -d or rm.",
      cls: "border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300",
    },
  ];

  return (
    <div className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 my-2 flex items-center gap-1.5 flex-wrap font-sans text-xs">
      <span className="font-semibold text-slate-500 dark:text-slate-400 mr-1 text-[11px]">
        Git Concepts:
      </span>
      {concepts.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={() => onShowInfo(c.info)}
          className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition hover:scale-105 ${c.cls}`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
