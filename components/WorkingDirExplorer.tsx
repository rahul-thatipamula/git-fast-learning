"use client";

import { useState } from "react";

interface WorkingDirExplorerProps {
  worktree: Record<string, string>;
  fileState: (filename: string) => "untracked" | "modified" | "staged" | "clean";
  onSaveFile: (filename: string, content: string) => void;
  onNewFile: (filename: string) => void;
  onStageFile: (filename: string) => void;
}

export function WorkingDirExplorer({
  worktree,
  fileState,
  onSaveFile,
  onNewFile,
  onStageFile,
}: WorkingDirExplorerProps) {
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const handleOpenEdit = (filename: string) => {
    setEditingFile(filename);
    setEditContent(worktree[filename] || "");
  };

  const handleSave = () => {
    if (editingFile) {
      onSaveFile(editingFile, editContent);
      setEditingFile(null);
    }
  };

  const handleCreateNew = () => {
    const fname = prompt("Enter new file name (e.g. notes.md, README.md):", "notes.md");
    if (fname && fname.trim()) {
      onNewFile(fname.trim());
    }
  };

  const files = Object.keys(worktree).sort();

  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-3 shadow-xs my-2 font-sans">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <span>📁 Working Directory</span>
        </h4>
        <button
          type="button"
          onClick={handleCreateNew}
          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold transition"
        >
          + New File
        </button>
      </div>

      {!files.length ? (
        <div className="text-xs text-slate-400 italic py-2 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          Folder is empty — type <code>touch notes.md</code> or click <b>+ New File</b>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {files.map((f) => {
            const st = fileState(f);
            const icon = f.endsWith(".md") ? "📄" : f.endsWith(".json") ? "⚙️" : "📝";

            let stateDot = "bg-emerald-500";
            if (st === "untracked") stateDot = "bg-rose-500";
            else if (st === "modified") stateDot = "bg-amber-500";
            else if (st === "staged") stateDot = "bg-indigo-500";

            return (
              <div
                key={f}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${stateDot}`} title={st} />
                  <span className="text-base">{icon}</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 truncate">{f}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(f)}
                    className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-[11px] font-medium transition"
                  >
                    ✏️ Edit
                  </button>
                  {st !== "staged" && st !== "clean" && (
                    <button
                      type="button"
                      onClick={() => onStageFile(f)}
                      className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium transition"
                    >
                      ⚡ Stage
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingFile && (
        <div className="mt-3 p-3 border border-indigo-200 dark:border-indigo-800 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/40">
          <div className="flex items-center justify-between mb-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <span>Editing: {editingFile}</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleSave}
                className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[11px] font-semibold hover:bg-indigo-700 transition"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingFile(null)}
                className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] transition"
              >
                Close
              </button>
            </div>
          </div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-24 p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      )}

      <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-3">
        <span>Click a file to edit content</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> untracked</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> modified</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> staged</span>
      </div>
    </div>
  );
}
