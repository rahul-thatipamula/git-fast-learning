"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import { Footer } from "@/components/Footer";
import { GitCatMascot } from "@/components/GitCatMascot";
import { TerminalWindow } from "@/components/TerminalWindow";
import { DAGGraphCanvas } from "@/components/DAGGraphCanvas";
import { WorkingDirExplorer } from "@/components/WorkingDirExplorer";
import { ConceptBar } from "@/components/ConceptBar";
import { TaskFocusCard } from "@/components/TaskFocusCard";
import { useProgress } from "@/lib/use-progress";
import { Git, OutputLine, GraphRow } from "@/lib/git-engine";
import { LEVELS_DATA, LevelDefinition } from "@/lib/levels-data";

export default function LevelPage() {
  const params = useParams();
  const router = useRouter();
  const levelId = Number(params?.id || 1);

  const { progress, toggleTheme, completeTask, completeLevel, resetLevel, showToast, toastMessage } = useProgress();

  const levelData: LevelDefinition = LEVELS_DATA[levelId] || LEVELS_DATA[1];

  const gitRef = useRef<Git | null>(null);
  const [gitOutput, setGitOutput] = useState<OutputLine[]>([]);
  const [graphRows, setGraphRows] = useState<GraphRow[]>([]);
  const [worktree, setWorktree] = useState<Record<string, string>>({});
  const [currentBranch, setCurrentBranch] = useState<string>("main");
  const [activeTaskIdx, setActiveTaskIdx] = useState(0);
  const [catMessage, setCatMessage] = useState<string>("");
  const [catMood, setCatMood] = useState<"happy" | "wink" | "excited" | "focused">("happy");
  const [isLevelCompleted, setIsLevelCompleted] = useState(false);

  const levelProgress = progress.levels[levelId] || { done: false, tasks: [] };
  const doneSet: Record<string, boolean> = {};
  (levelProgress.tasks || []).forEach((tid) => {
    doneSet[tid] = true;
  });

  const syncState = (git: Git) => {
    setGitOutput([...git.repo.lastOutput]);
    setGraphRows(git.graph());
    setWorktree({ ...git.repo.worktree });
    setCurrentBranch(git.currentBranch() || (git.repo.initialized ? "HEAD" : "—"));
  };

  useEffect(() => {
    const git = new Git(levelData.seed);
    gitRef.current = git;

    // Welcome output
    const introLines: OutputLine[] = (levelData.intro || []).map((t) => ({ text: t, cls: "l-dim" }));
    git.repo.lastOutput = introLines;

    syncState(git);

    const catIntros: Record<number, string> = {
      1: "Meow! Welcome to Level 1. Type <code>git init</code> in the terminal to start your repository!",
      2: "Paws up! Branches are lightweight pointers. Type <code>git branch</code> to see where you stand!",
      3: "3 copies exist: upstream, origin, and local. Sync them up and open a pull request!",
      4: "Don't panic! Reflog remembers every commit. Nothing is truly lost on my watch! 🐾",
    };
    setCatMessage(catIntros[levelId] || "Ready to commit? Type a command below!");
    setCatMood("happy");
  }, [levelId]);

  const checkTasks = (git: Git) => {
    const ctx = { history: git.repo.history };
    let newlyDone = false;

    levelData.tasks.forEach((t) => {
      if (doneSet[t.id]) return;
      let ok = false;
      try {
        ok = !!t.check(git, ctx);
      } catch (e) {
        ok = false;
      }
      if (ok) {
        completeTask(levelId, t.id, 10);
        showToast(`<b>Paws up!</b> &middot; ${t.short}`);
        setCatMessage(`Purr-fect! You cleared: <b>${t.short}</b>. Keep going!`);
        setCatMood("wink");
        newlyDone = true;
      }
    });

    const currentDoneCount = Object.keys(doneSet).length + (newlyDone ? 1 : 0);
    if (currentDoneCount >= levelData.tasks.length && !isLevelCompleted) {
      setIsLevelCompleted(true);
      completeLevel(levelId);
      setCatMessage(`🎉 Meow-velous! You finished all tasks in <b>${levelData.title}</b>! Ready for the next level?`);
      setCatMood("excited");
    }
  };

  const handleCommand = (rawCmd: string) => {
    if (!gitRef.current) return;
    const git = gitRef.current;
    git.run(rawCmd);
    syncState(git);
    checkTasks(git);
  };

  const handleSaveFile = (fname: string, content: string) => {
    if (!gitRef.current) return;
    const git = gitRef.current;
    git.repo.worktree[fname] = content;
    git.repo.lastOutput = [{ text: `saved ${fname}`, cls: "l-dim" }];
    syncState(git);
    checkTasks(git);
  };

  const handleNewFile = (fname: string) => {
    handleCommand(`touch ${fname}`);
  };

  const handleStageFile = (fname: string) => {
    handleCommand(`git add ${fname}`);
  };

  const handleResetLevel = () => {
    if (!confirm("Reset this level? Repo and tasks will be reset to start.")) return;
    resetLevel(levelId);
    if (gitRef.current) {
      gitRef.current.reset();
      syncState(gitRef.current);
    }
    setActiveTaskIdx(0);
    setIsLevelCompleted(false);
  };

  const actionButtons = (levelData.actions || []).map((act) => ({
    label: act.label,
    onClick: () => {
      if (!gitRef.current) return;
      const git = gitRef.current;
      const msg = act.run(git);
      git.repo.lastOutput = [{ text: msg, cls: "l-warn" }];
      syncState(git);
      checkTasks(git);
    },
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderNav
        xp={progress.xp}
        theme={progress.theme}
        onToggleTheme={toggleTheme}
        toastMessage={toastMessage}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 font-sans">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
              Level {levelId} &middot; Scenario Workspace
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {levelData.title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500">
              REPO: <b className="text-slate-800 dark:text-slate-200 font-mono">{currentBranch}</b>
            </span>
            <button
              type="button"
              onClick={handleResetLevel}
              className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium hover:bg-rose-100 transition"
            >
              Reset Level 🔄
            </button>
          </div>
        </div>

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (5 cols): Git Cat Tutor, Commit Graph & Working Directory */}
          <div className="lg:col-span-5 space-y-4">
            {/* Git Cat Tutor Mascot */}
            <GitCatMascot message={catMessage} mood={catMood} />

            {/* Live Commit DAG Graph */}
            <DAGGraphCanvas graphRows={graphRows} />

            {/* Working Directory File Explorer */}
            {gitRef.current && (
              <WorkingDirExplorer
                worktree={worktree}
                fileState={(f) => gitRef.current!.fileState(f)}
                onSaveFile={handleSaveFile}
                onNewFile={handleNewFile}
                onStageFile={handleStageFile}
              />
            )}

            {/* Ask AI Tutor Helper Callout */}
            <div className="p-3.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/30 text-xs text-slate-700 dark:text-slate-300">
              <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                🤖 Ask AI Tutor Helper
              </span>
              <p className="text-[11px] mb-2 leading-relaxed">
                Confused by any concept? Copy questions directly into ChatGPT or Claude:
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText("Why does Git require two steps: git add AND git commit? What is Staging?")}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] hover:border-indigo-500 transition"
                >
                  Copy: Why 2 steps add/commit? 📋
                </button>
                <Link
                  href="/ask-ai"
                  className="px-2 py-1 rounded bg-indigo-600 text-white text-[10px] font-semibold hover:bg-indigo-700 transition"
                >
                  View All 100 Questions ➔
                </Link>
              </div>
            </div>

            {/* Level Completion Banner */}
            {isLevelCompleted && (
              <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 text-xs">
                <h3 className="font-bold text-sm mb-1">🎉 Level {levelId} Complete!</h3>
                <p className="mb-3 leading-relaxed">{levelData.outro}</p>
                {levelData.next && (
                  <Link
                    href={levelData.next}
                    className="inline-block px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition"
                  >
                    Proceed to Next Level &rarr;
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Right Column (7 cols): Active Task Focus, Concept Bar, Terminal */}
          <div className="lg:col-span-7 space-y-4">
            {/* Active Task Focus Spotlight Card */}
            <TaskFocusCard
              tasks={levelData.tasks}
              activeIdx={activeTaskIdx}
              doneSet={doneSet}
              onSelectTask={(idx) => setActiveTaskIdx(idx)}
              onPrevTask={() => setActiveTaskIdx((prev) => Math.max(0, prev - 1))}
              onNextTask={() => setActiveTaskIdx((prev) => Math.min(levelData.tasks.length - 1, prev + 1))}
            />

            {/* Git Concepts Pill Explanations Bar */}
            <ConceptBar onShowInfo={(info) => showToast(info)} />

            {/* Live Interactive Terminal Window */}
            <TerminalWindow
              outputs={gitOutput}
              onCommand={handleCommand}
              branchName={currentBranch}
              quickCommands={levelData.quick}
              actionButtons={actionButtons}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
