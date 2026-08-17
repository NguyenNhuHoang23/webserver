export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-6 border-b border-slate-200 bg-white px-6">
      <label className="relative flex min-w-0 max-w-xl flex-1 items-center">
        <span className="pointer-events-none absolute left-3.5 text-slate-400">
          <SearchIcon className="h-4 w-4" />
        </span>
        <input
          type="search"
          placeholder="Tìm kiếm nhanh..."
          className="h-10 w-full rounded-full border-0 bg-[#f3f5f7] pl-10 pr-4 text-sm text-slate-700 outline-none ring-1 ring-transparent placeholder:text-slate-400 focus:bg-white focus:ring-[#1a73e8]/30"
        />
      </label>

      <div className="flex shrink-0 items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          System Online
        </span>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          aria-label="Thông báo"
        >
          <BellIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          aria-label="Cài đặt"
        >
          <GearIcon className="h-5 w-5" />
        </button>

        <img
          src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces"
          alt="Ảnh đại diện người dùng"
          className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
        />
      </div>
    </header>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 10a6 6 0 1 1 12 0c0 4 1.2 5.5 1.8 6.2.3.4 0 .8-.6.8H4.8c-.6 0-.9-.4-.6-.8C4.8 15.5 6 14 6 10Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 4.5v1.4M12 18.1v1.4M19.5 12h-1.4M5.9 12H4.5M17.3 6.7l-1 1M7.7 16.3l-1 1M17.3 17.3l-1-1M7.7 7.7l-1-1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
