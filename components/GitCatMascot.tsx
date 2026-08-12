"use client";

interface GitCatMascotProps {
  message: string;
  mood?: "happy" | "wink" | "excited" | "focused";
}

export function GitCatMascot({ message, mood = "happy" }: GitCatMascotProps) {
  const avatars = {
    happy: "🐱",
    wink: "😸",
    excited: "😻",
    focused: "😼",
  };

  return (
    <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl p-3.5 mb-4 flex items-start gap-3 shadow-sm">
      <div className="text-2xl select-none p-1 bg-white dark:bg-slate-800 rounded-lg shadow-xs border border-indigo-100 dark:border-indigo-900">
        {avatars[mood] || "🐱"}
      </div>
      <div className="flex-1 text-xs leading-relaxed text-slate-700 dark:text-slate-200">
        <div className="font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5 flex items-center justify-between">
          <span>Git Cat Tutor</span>
          <span className="text-[10px] text-slate-400 font-normal">Realtime Assistant</span>
        </div>
        <p dangerouslySetInnerHTML={{ __html: message }} />
      </div>
    </div>
  );
}
