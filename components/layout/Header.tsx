"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useSidebar } from "@/components/layout/SidebarContext";
import {
  clearAdminNotifications,
  formatNotificationTime,
  loadAdminNotifications,
  markAdminNotificationsRead,
  subscribeAdminNotifications,
  unreadAdminNotificationCount,
  type AdminNotification,
} from "@/lib/admin-notifications";

export function Header() {
  const { session } = useAuth();
  const { toggleMobile, collapsed, toggleCollapsed } = useSidebar();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setItems(loadAdminNotifications());
    return subscribeAdminNotifications(() => {
      setItems(loadAdminNotifications());
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = useMemo(() => unreadAdminNotificationCount(items), [items]);

  function togglePanel() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      markAdminNotificationsRead();
      setItems(loadAdminNotifications());
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2.5 sm:gap-6 border-b border-slate-200/80 bg-white px-3 sm:px-6 font-sans">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleMobile}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors lg:hidden"
          aria-label="Mở menu"
          title="Mở menu điều hướng"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden lg:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          title={collapsed ? "Mở rộng thanh bên (Alt+B)" : "Thu gọn thanh bên để mở rộng không gian"}
        >
          {collapsed ? <PanelOpenIcon className="h-4 w-4" /> : <PanelCloseIcon className="h-4 w-4" />}
        </button>

        <div className="relative flex min-w-0 max-w-xs sm:max-w-md flex-1 items-center">
          <span className="pointer-events-none absolute left-3 text-slate-400">
            <SearchIcon className="h-4 w-4" />
          </span>
          <input
            type="search"
            placeholder="Tìm kiếm dự án, mã PRJ..."
            className="h-9 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 pl-9 pr-3 sm:pr-12 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all"
          />
          <span className="pointer-events-none absolute right-2.5 hidden sm:inline-block rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
            ⌘K
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3.5">
        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={togglePanel}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            aria-label="Thông báo"
            aria-expanded={open}
          >
            <BellIcon className="h-4 w-4" />
            {unread > 0 ? (
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            ) : null}
          </button>

          {open ? (
            <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Thông báo</p>
                  <p className="text-[11px] text-slate-400">
                    Dự án, thay đồng hồ,...
                  </p>
                </div>
                {items.length ? (
                  <button
                    type="button"
                    onClick={() => {
                      clearAdminNotifications();
                      setItems([]);
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Xóa hết
                  </button>
                ) : null}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-400">
                    Chưa có thông báo.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const content = (
                        <div className="px-4 py-3 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                            <span className="shrink-0 text-[10px] text-slate-400">
                              {formatNotificationTime(item.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-600">{item.body}</p>
                        </div>
                      );
                      return (
                        <li key={item.id}>
                          {item.href ? (
                            <Link href={item.href} onClick={() => setOpen(false)}>
                              {content}
                            </Link>
                          ) : (
                            content
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 font-semibold text-white text-xs shadow-xs">
            {session?.username ? session.username.slice(0, 2).toUpperCase() : "AD"}
          </div>
          <div className="hidden text-left leading-tight md:block">
            <p className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">{session?.username ?? "Quản trị viên"}</p>
            <p className="text-[10px] tracking-wide text-slate-400 uppercase">{session?.role ?? "Vận hành hệ thống"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function PanelCloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m16 15-3-3 3-3" />
    </svg>
  );
}

function PanelOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m14 9 3 3-3 3" />
    </svg>
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
