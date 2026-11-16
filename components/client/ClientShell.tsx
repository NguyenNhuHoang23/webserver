"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/useAuth";
import { logout } from "@/lib/auth";
import { hydrateProjects, type Project } from "@/lib/projects";

const navItems = [
  { href: "", label: "Trang chủ", short: "Chủ", icon: HomeIcon },
  { href: "/so-do", label: "Sơ đồ", short: "Sơ đồ", icon: DiagramIcon },
  { href: "/bieu-do", label: "Biểu đồ", short: "Biểu đồ", icon: TrendIcon },
  { href: "/chi-phi", label: "Chi phí", short: "Chi phí", icon: CostIcon },
  { href: "/khi-nha-kinh", label: "Khí nhà kính", short: "GHG", icon: LeafIcon },
  { href: "/canh-bao", label: "Cảnh báo", short: "Cảnh báo", icon: AlertIcon },
  { href: "/bao-cao", label: "Báo cáo", short: "Báo cáo", icon: ReportIcon },
  { href: "/cau-hinh", label: "Cấu hình", short: "Cấu hình", icon: ConfigIcon },
] as const;

const MOBILE_PRIMARY_HREFS = ["", "/so-do", "/bieu-do", "/chi-phi"] as const;

export function ClientShell({
  project,
  children,
}: {
  project: Project;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();
  const [resolved, setResolved] = useState(project);
  const [moreOpen, setMoreOpen] = useState(false);
  const base = `/du-an/${project.id}`;

  useEffect(() => {
    let active = true;
    void hydrateProjects().then((projects) => {
      if (active) setResolved(projects.find((item) => item.id === project.id) ?? project);
    });
    return () => {
      active = false;
    };
  }, [project]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === ""
      ? pathname === base
      : pathname === `${base}${href}` || pathname.startsWith(`${base}${href}/`);

  const primaryMobile = useMemo(
    () => navItems.filter((item) => (MOBILE_PRIMARY_HREFS as readonly string[]).includes(item.href)),
    [],
  );
  const moreMobile = useMemo(
    () => navItems.filter((item) => !(MOBILE_PRIMARY_HREFS as readonly string[]).includes(item.href)),
    [],
  );
  const moreActive = moreMobile.some((item) => isActive(item.href));

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#f8fafc] font-sans">
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-3 sm:h-14 sm:gap-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          {session?.portal === "admin" ? (
            <Link
              href="/"
              title="Quay lại danh sách dự án"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-2.5"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden text-[11px] font-medium sm:inline lg:hidden">Dự án</span>
              <span className="hidden text-[11px] font-medium lg:inline">Quay lại danh sách dự án</span>
            </Link>
          ) : null}

          <Link
            href={base}
            title={resolved.customer}
            aria-label={resolved.customer}
            className="flex min-w-0 items-center gap-2.5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-emerald-600 text-[10px] font-bold text-white shadow-xs">
              {resolved.logoUrl ? (
                <img
                  src={resolved.logoUrl}
                  alt={`Logo ${resolved.customer}`}
                  className="h-full w-full bg-white object-contain"
                />
              ) : (
                resolved.initials
              )}
            </div>
            <div className="min-w-0 sm:hidden">
              <p className="truncate text-sm font-semibold text-slate-800">{resolved.name}</p>
            </div>
          </Link>

          <nav
            className="hidden h-14 items-stretch gap-1 overflow-x-auto sm:flex"
            aria-label="Điều hướng dự án"
          >
            {navItems.map((item) => {
              const href = `${base}${item.href}`;
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href || "home"}
                  href={href}
                  title={item.label}
                  className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 text-xs font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "border-emerald-600 font-semibold text-emerald-800"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-emerald-600" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>SCADA Online</span>
          </div>

          <div className="hidden h-4 w-px bg-slate-200 sm:block" />

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-[11px] font-semibold text-white sm:h-7 sm:w-7">
              {(session?.displayName ?? session?.username ?? resolved.customer).slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-left leading-tight md:block">
              <p className="max-w-[140px] truncate text-xs font-semibold text-slate-800">
                {session?.displayName ?? session?.username ?? resolved.customer}
              </p>
              <p className="text-[10px] tracking-wide text-slate-400 uppercase">
                {session?.portal === "admin" ? "Quản trị viên" : "Khách hàng"}
              </p>
            </div>
            <button
              type="button"
              title="Đăng xuất"
              onClick={() => {
                const portal = session?.portal;
                logout();
                if (portal === "admin") router.replace("/");
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 sm:h-7 sm:w-auto sm:px-2"
            >
              <LogoutIcon className="h-3.5 w-3.5 sm:hidden" />
              <span className="hidden text-[11px] font-medium sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-[4.75rem] sm:pb-0">
        {children}
      </main>

      {moreOpen ? (
        <button
          type="button"
          aria-label="Đóng menu thêm"
          className="fixed inset-0 z-40 bg-slate-900/40 sm:hidden"
          onClick={() => setMoreOpen(false)}
        />
      ) : null}

      {moreOpen ? (
        <div className="fixed inset-x-3 bottom-[4.75rem] z-50 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl sm:hidden">
          <p className="px-2 py-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Thêm mục
          </p>
          <div className="grid grid-cols-2 gap-1">
            {moreMobile.map((item) => {
              const href = `${base}${item.href}`;
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-emerald-600" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur-md sm:hidden"
        aria-label="Điều hướng dự án mobile"
      >
        <div className="grid h-16 grid-cols-5">
          {primaryMobile.map((item) => {
            const href = `${base}${item.href}`;
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href || "home"}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium ${
                  active ? "font-semibold text-emerald-700" : "text-slate-500"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    active ? "bg-emerald-50" : ""
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-emerald-600" : "text-slate-400"}`} />
                </span>
                <span className="leading-none">{item.short}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className={`flex flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium ${
              moreActive || moreOpen ? "font-semibold text-emerald-700" : "text-slate-500"
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                moreActive || moreOpen ? "bg-emerald-50" : ""
              }`}
            >
              <MoreIcon className={`h-4 w-4 ${moreActive || moreOpen ? "text-emerald-600" : "text-slate-400"}`} />
            </span>
            <span className="leading-none">Thêm</span>
          </button>
        </div>
      </nav>

      <footer className="hidden h-9 shrink-0 items-center justify-between gap-4 border-t border-slate-200/80 bg-white px-4 text-[11px] text-slate-400 sm:flex sm:px-6">
        <p className="truncate">
          © 2026 {resolved.customer} • EMS Telemetry Gateway
        </p>
        <p className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Dữ liệu thời gian thực
        </p>
      </footer>
    </div>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-5H10v5H5a1 1 0 0 1-1-1v-8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

function DiagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="6" cy="18.5" r="2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="18" cy="18.5" r="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.5v3M12 10.5H6v6M12 10.5h6v6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function TrendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 16.5 9 11l4 3.5 7-8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 6.5h5v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CostIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8v8M9.5 10.2c.6-.8 1.4-1.2 2.5-1.2 1.6 0 2.5.8 2.5 1.8s-.9 1.7-2.6 2.1c-1.8.4-2.6 1.1-2.6 2.2 0 1 .9 1.9 2.6 1.9 1.2 0 2-.4 2.6-1.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 19c3-1 8-6 8-13 6 2 8 8 6 13-4 0-9 1-14 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 16c2-3 4-7 5-11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4 3.5 19h17L12 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 10v5M12 17.4v.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ReportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 3.5h7l5 5V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14 3.5V9h5.5M9 13h6M9 16.5h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ConfigIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 4.5v1.4M12 18.1v1.4M19.5 12h-1.4M5.9 12H4.5M17.3 6.7l-1 1M7.7 16.3l-1 1M17.3 17.3l-1-1M7.7 7.7l-1-1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
