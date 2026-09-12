"use client";

import { useAuth } from "@/components/auth/useAuth";

export function Header() {
  const { session } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-6 border-b border-slate-200/80 bg-white px-6 font-sans">
      {/* Search Bar with Shortcut */}
      <div className="relative flex min-w-0 max-w-md flex-1 items-center">
        <span className="pointer-events-none absolute left-3.5 text-slate-400">
          <SearchIcon className="h-4 w-4" />
        </span>
        <input
          type="search"
          placeholder="Tìm kiếm dự án, mã điểm đo hoặc thiết bị..."
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-12 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all"
        />
        <span className="pointer-events-none absolute right-2.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
          ⌘K
        </span>
      </div>

      {/* Right Actions & Status */}
      <div className="flex shrink-0 items-center gap-3.5">
        {/* Live System Indicator */}
        <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/70 px-3 py-1 text-xs font-medium text-emerald-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span>Hệ thống trực tuyến</span>
        </div>

        {/* Action Icons */}
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          aria-label="Thông báo"
        >
          <BellIcon className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </button>

        <div className="h-4 w-px bg-slate-200" />

        {/* User Badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 font-semibold text-white text-xs">
            {session?.username ? session.username.slice(0, 2).toUpperCase() : "AD"}
          </div>
          <div className="hidden text-left leading-tight md:block">
            <p className="text-xs font-semibold text-slate-800">{session?.username ?? "Quản trị viên"}</p>
            <p className="text-[10px] tracking-wide text-slate-400 uppercase">{session?.role ?? "Vận hành hệ thống"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
