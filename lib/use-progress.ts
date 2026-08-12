"use client";

import { useState, useEffect } from "react";

export interface LevelProgress {
  done: boolean;
  tasks: string[];
}

export interface ProgressState {
  xp: number;
  levels: Record<number, LevelProgress>;
  theme: "light" | "dark";
}

const STORAGE_KEY = "git_fast_learning_v1";

function loadProgress(): ProgressState {
  if (typeof window === "undefined") {
    return { xp: 0, levels: {}, theme: "light" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { xp: 0, levels: {}, theme: "light" };
    return JSON.parse(raw);
  } catch (e) {
    return { xp: 0, levels: {}, theme: "light" };
  }
}

function saveProgress(state: ProgressState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressState>({
    xp: 0,
    levels: {},
    theme: "light",
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadProgress();
    setProgress(loaded);
    document.documentElement.setAttribute("data-theme", loaded.theme || "light");
    if (loaded.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const toggleTheme = () => {
    const nextTheme = progress.theme === "light" ? "dark" : "light";
    const nextState = { ...progress, theme: nextTheme };
    setProgress(nextState);
    saveProgress(nextState);
    document.documentElement.setAttribute("data-theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const completeTask = (levelId: number, taskId: string, xpPoints: number = 10) => {
    const currentLvl = progress.levels[levelId] || { done: false, tasks: [] };
    if (currentLvl.tasks.includes(taskId)) return;

    const nextTasks = [...currentLvl.tasks, taskId];
    const nextState: ProgressState = {
      ...progress,
      xp: progress.xp + xpPoints,
      levels: {
        ...progress.levels,
        [levelId]: { ...currentLvl, tasks: nextTasks },
      },
    };
    setProgress(nextState);
    saveProgress(nextState);
  };

  const completeLevel = (levelId: number) => {
    const currentLvl = progress.levels[levelId] || { done: false, tasks: [] };
    const nextState: ProgressState = {
      ...progress,
      xp: progress.xp + 50,
      levels: {
        ...progress.levels,
        [levelId]: { ...currentLvl, done: true },
      },
    };
    setProgress(nextState);
    saveProgress(nextState);
  };

  const resetLevel = (levelId: number) => {
    const nextState: ProgressState = {
      ...progress,
      levels: {
        ...progress.levels,
        [levelId]: { done: false, tasks: [] },
      },
    };
    setProgress(nextState);
    saveProgress(nextState);
  };

  return {
    progress,
    toggleTheme,
    completeTask,
    completeLevel,
    resetLevel,
    showToast,
    toastMessage,
  };
}
