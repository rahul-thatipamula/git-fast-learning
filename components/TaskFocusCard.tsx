"use client";

import { useState } from "react";
import { LevelTask } from "@/lib/levels-data";

interface TaskFocusCardProps {
  tasks: LevelTask[];
  activeIdx: number;
  doneSet: Record<string, boolean>;
  onSelectTask: (idx: number) => void;
  onPrevTask: () => void;
  onNextTask: () => void;
}

export function TaskFocusCard({
  tasks,
  activeIdx,
  doneSet,
  onSelectTask,
  onPrevTask,
  onNextTask,
}: TaskFocusCardProps) {
  const [showAllMenu, setShowAllMenu] = useState(false);
  const [openHintId, setOpenHintId] = useState<string | null>(null);

  const total = tasks.length;
  const currentTask = tasks[activeIdx] || tasks[0];
  const isDone = !!doneSet[currentTask.id];

  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-4 shadow-sm my-2 font-sans">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800/80 pb-2">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
          <span>Active Task Focus</span>
        </h3>
        <button
          type="button"
          onClick={() => setShowAllMenu(!showAllMenu)}
          className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition"
        >
          {showAllMenu ? "Hide Tasks Menu ▲" : `📋 All Tasks Menu (${activeIdx + 1}/${total}) ▼`}
        </button>
      </div>

      {showAllMenu ? (
        <ul className="space-y-2 mb-3">
          {tasks.map((t, idx) => {
            const taskDone = !!doneSet[t.id];
            const isActive = idx === activeIdx;

            return (
              <li
                key={t.id}
                onClick={() => {
                  onSelectTask(idx);
                }}
                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-start gap-2.5 ${
                  isActive
                    ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 font-medium"
                    : taskDone
                    ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 text-slate-600 dark:text-slate-300"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                    taskDone
                      ? "bg-emerald-500 text-white"
                      : isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {taskDone ? "✓" : idx + 1}
                </span>

                <div className="flex-1">
                  <div dangerouslySetInnerHTML={{ __html: t.text }} />
                  {t.hint && !taskDone && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenHintId(openHintId === t.id ? null : t.id);
                      }}
                      className="mt-1 text-[10px] text-indigo-600 dark:text-indigo-400 underline font-medium"
                    >
                      {openHintId === t.id ? "hide hint" : "show hint"}
                    </button>
                  )}
                  {openHintId === t.id && (
                    <div className="mt-1 p-2 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {t.hint}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div
          className={`p-3.5 rounded-lg border text-xs transition mb-3 flex items-start gap-3 ${
            isDone
              ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30"
              : "border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/30"
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${
              isDone ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white"
            }`}
          >
            {isDone ? "✓" : activeIdx + 1}
          </span>
          <div className="flex-1">
            <div className="text-slate-800 dark:text-slate-100 leading-relaxed" dangerouslySetInnerHTML={{ __html: currentTask.text }} />
            {currentTask.hint && !isDone && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setOpenHintId(openHintId === currentTask.id ? null : currentTask.id)}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold underline"
                >
                  {openHintId === currentTask.id ? "hide hint" : "show hint"}
                </button>
                {openHintId === currentTask.id && (
                  <div className="mt-1.5 p-2 rounded bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {currentTask.hint}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Arrow Controls */}
      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5">
        <button
          type="button"
          onClick={onPrevTask}
          disabled={activeIdx <= 0}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          ← Previous Task
        </button>

        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Task {activeIdx + 1} of {total}
        </span>

        <button
          type="button"
          onClick={onNextTask}
          disabled={activeIdx >= total - 1}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          Next Task →
        </button>
      </div>
    </div>
  );
}
