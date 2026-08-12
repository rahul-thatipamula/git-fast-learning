"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderNavProps {
  xp: number;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  toastMessage?: string | null;
}

export function HeaderNav({ xp, theme, onToggleTheme, toastMessage }: HeaderNavProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/80 dark:bg-[#121A2C]/80 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between font-sans">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-base hover:opacity-80 transition">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse"></span>
            Git-Fast-Learning
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-md transition ${
                pathname === "/" ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400" : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              🗺️ Roadmap
            </Link>
            <Link
              href="/story"
              className={`px-3 py-1.5 rounded-md transition ${
                pathname === "/story" ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400" : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              One Shot ⚡
            </Link>
            <Link
              href="/ask-ai"
              className={`px-3 py-1.5 rounded-md transition ${
                pathname === "/ask-ai" ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400" : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Ask AI 🧠
            </Link>
            <Link
              href="/reference"
              className={`px-3 py-1.5 rounded-md transition ${
                pathname === "/reference" ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400" : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Reference 📖
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 rounded-full text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
            <span>⚡ XP</span>
            <span className="font-mono">{xp}</span>
          </div>

          <button
            onClick={onToggleTheme}
            type="button"
            className="p-1.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-sm"
            aria-label="Toggle dark mode"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-indigo-600 text-white text-xs py-1.5 px-4 text-center font-medium shadow-inner flex items-center justify-center gap-2">
          <span>✨</span>
          <span dangerouslySetInnerHTML={{ __html: toastMessage }} />
        </div>
      )}
    </header>
  );
}
