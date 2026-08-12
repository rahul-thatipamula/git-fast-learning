"use client";

import { useState, useRef, useEffect } from "react";
import { OutputLine } from "@/lib/git-engine";

interface TerminalWindowProps {
  outputs: OutputLine[];
  onCommand: (cmd: string) => void;
  branchName: string;
  quickCommands?: string[];
  actionButtons?: { label: string; onClick: () => void }[];
}

export function TerminalWindow({
  outputs,
  onCommand,
  branchName,
  quickCommands = ["git status", "git log --oneline", "git branch", "help"],
  actionButtons = [],
}: TerminalWindowProps) {
  const [inputValue, setInputValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [outputs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = inputValue.trim();
    if (cmd) {
      setHistory((prev) => [cmd, ...prev]);
      setHistoryIdx(-1);
      onCommand(cmd);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIdx < history.length - 1) {
        const nextIdx = historyIdx + 1;
        setHistoryIdx(nextIdx);
        setInputValue(history[nextIdx] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInputValue(history[nextIdx] || "");
      } else {
        setHistoryIdx(-1);
        setInputValue("");
      }
    }
  };

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-800 bg-[#0F172A] text-slate-200 font-mono text-xs shadow-2xl flex flex-col my-3">
      <div className="bg-[#0A0E1A] px-3 py-2 flex items-center justify-between border-b border-slate-800/80 text-[11px] text-slate-400 select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          <span className="ml-2 font-medium text-slate-300">you@laptop — notes-repo</span>
        </div>
        <span className="text-[10px] text-slate-500">zsh</span>
      </div>

      <div className="p-3 min-h-[220px] max-h-[380px] overflow-y-auto space-y-1">
        {outputs.map((line, idx) => {
          let colorClass = "text-slate-300";
          if (line.cls === "l-err") colorClass = "text-rose-400 font-semibold";
          else if (line.cls === "l-ok") colorClass = "text-emerald-400 font-semibold";
          else if (line.cls === "l-warn") colorClass = "text-amber-300";
          else if (line.cls === "l-dim") colorClass = "text-slate-500";
          else if (line.cls === "l-sha") colorClass = "text-indigo-300 font-bold";
          else if (line.cls === "l-cmd") colorClass = "text-slate-100 font-semibold";

          if (line.html) {
            return (
              <div key={idx} className={colorClass} dangerouslySetInnerHTML={{ __html: line.html }} />
            );
          }

          return (
            <div key={idx} className={colorClass}>
              {line.text}
            </div>
          );
        })}
        <div ref={terminalEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-800 bg-[#070A13] p-2 flex items-center gap-2">
        <span className="text-emerald-400 font-semibold whitespace-nowrap">
          ~/notes-repo <span className="text-indigo-400">({branchName})</span> $
        </span>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="flex-1 bg-transparent border-none outline-none text-slate-100 font-mono text-xs focus:ring-0"
          placeholder="type a git command, or: help"
        />
      </form>

      <div className="bg-[#070A13] border-t border-slate-800/80 p-2 flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-slate-500 font-sans mr-1">Quick Chips:</span>
        {quickCommands.map((cmd) => (
          <button
            key={cmd}
            type="button"
            onClick={() => setInputValue(cmd)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-mono transition"
          >
            {cmd}
          </button>
        ))}
        {actionButtons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={btn.onClick}
            className="px-2 py-0.5 rounded border border-indigo-500/60 bg-indigo-950/40 hover:bg-indigo-900/60 text-[11px] text-indigo-300 font-mono transition"
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
