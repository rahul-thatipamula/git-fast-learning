import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-8 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs mt-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="font-bold text-slate-700 dark:text-slate-200">Git-Fast-Learning</span> &copy; 2026 Rahul Thatipam. Built for fast open-source mastery.
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            Map
          </Link>
          <Link href="/story" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            One Shot ⚡
          </Link>
          <Link href="/ask-ai" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            Ask AI
          </Link>
          <Link href="/reference" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            Reference
          </Link>
        </div>
      </div>
    </footer>
  );
}
