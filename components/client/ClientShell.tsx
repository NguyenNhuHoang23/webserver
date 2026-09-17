"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/useAuth";
import { logout } from "@/lib/auth";
import { hydrateProjects, type Project } from "@/lib/projects";

const navItems = [
  { href: "", label: "Trang chủ", icon: HomeIcon },
  { href: "/so-do", label: "Sơ đồ", icon: DiagramIcon },
  { href: "/bieu-do", label: "Biểu đồ", icon: TrendIcon },
  { href: "/chi-phi", label: "Chi phí", icon: CostIcon },
  { href: "/khi-nha-kinh", label: "Khí nhà kính", icon: LeafIcon },
  { href: "/canh-bao", label: "Cảnh báo", icon: AlertIcon },
  { href: "/bao-cao", label: "Báo cáo", icon: ReportIcon },
  { href: "/cau-hinh", label: "Cấu hình", icon: ConfigIcon },
];

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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#f8fafc] font-sans">
      <header className="flex min-h-[56px] shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-3 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <Link
            href={base}
            title={resolved.customer}
            aria-label={resolved.customer}
            className="flex items-center shrink-0"
          >
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-emerald-600 text-[10px] font-bold text-white shadow-xs">
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
          </Link>

          {/* Desktop/Tablet Nav */}
          <nav
            className="hidden sm:flex min-h-[56px] items-stretch gap-1 overflow-x-auto"
            aria-label="Điều hướng dự án"
          >
            {navItems.map((item) => {
              const href = `${base}${item.href}`;
              const active =
                item.href === ""
                  ? pathname === base
                  : pathname === href || pathname.startsWith(`${href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href || "home"}
                  href={href}
                  title={item.label}
                  className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 text-xs font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "border-emerald-600 text-emerald-800 font-semibold"
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

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>SCADA Online</span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-700 font-semibold text-white text-[11px]">
              {(session?.displayName ?? session?.username ?? resolved.customer).slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-left leading-tight md:block">
              <p className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
                {session?.displayName ?? session?.username ?? resolved.customer}
              </p>
              <p className="text-[10px] tracking-wide text-slate-400 uppercase">
                {session?.portal === "admin" ? "Quản trị viên" : "Khách hàng"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const portal = session?.portal;
                logout();
                if (portal === "admin") router.replace("/");
              }}
              className="inline-flex h-7 items-center rounded-lg border border-slate-200 px-2 text-[11px] font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors ml-0.5"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Strip */}
      <nav
        className="flex sm:hidden overflow-x-auto border-b border-slate-200/80 bg-white px-2.5 py-1.5 gap-1 shrink-0 scrollbar-none"
        aria-label="Điều hướng dự án mobile"
      >
        {navItems.map((item) => {
          const href = `${base}${item.href}`;
          const active =
            item.href === ""
              ? pathname === base
              : pathname === href || pathname.startsWith(`${href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href || "home"}
              href={href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                active
                  ? "bg-emerald-600 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>

      <footer className="flex h-9 shrink-0 items-center justify-between gap-4 border-t border-slate-200/80 bg-white px-4 text-[11px] text-slate-400 sm:px-6">
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
