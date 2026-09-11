"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/useAuth";
import { logout } from "@/lib/auth";
import { loadProjects, type Project } from "@/lib/projects";

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
  const homeHref = session?.portal === "admin" ? "/" : base;

  useEffect(() => {
    const stored = loadProjects().find((item) => item.id === project.id);
    setResolved(stored ?? project);
  }, [project]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#e8edf3]">
      <header className="flex min-h-[52px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 sm:px-4">
        <Link
          href={homeHref}
          title={resolved.customer}
          className="flex min-w-0 max-w-[min(280px,32vw)] shrink items-center gap-2 sm:max-w-[240px] lg:max-w-[280px]"
        >
          <FactoryIcon className="h-7 w-7 shrink-0 text-[#1a5fbe] sm:h-8 sm:w-8" />
          <span className="truncate text-[15px] font-bold tracking-wide text-[#1a5fbe] uppercase sm:text-[17px]">
            {resolved.customer}
          </span>
        </Link>

        <nav
          className="flex min-h-[52px] min-w-0 flex-1 items-stretch gap-0.5 overflow-x-auto"
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
                className={`flex shrink-0 items-center gap-1.5 border-b-[3px] px-2.5 text-[12.5px] font-medium whitespace-nowrap sm:px-3 sm:text-[13px] ${
                  active
                    ? "border-[#1a73e8] text-[#1a73e8]"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 sm:h-[17px] sm:w-[17px]" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 sm:h-9 sm:w-9"
            aria-label="Thông báo"
          >
            <BellIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {session?.displayName ?? session?.username ?? resolved.customer}
              </p>
              <p className="text-[11px] tracking-wide text-slate-400">
                {session?.portal === "admin" ? "QUẢN TRỊ VIÊN" : "KHÁCH HÀNG"}
              </p>
            </div>
            <img
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces"
              alt="Ảnh đại diện"
              className="h-8 w-8 rounded-full object-cover sm:h-9 sm:w-9"
            />
            <button
              type="button"
              onClick={() => {
                const portal = session?.portal;
                logout();
                if (portal === "admin") router.replace("/");
              }}
              className="inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-medium text-[#d94848] hover:bg-red-50"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>

      <footer className="flex h-10 shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-white px-4 text-[11px] text-slate-400 sm:px-5">
        <p className="truncate">
          © 2024 {resolved.customer} EMS. Data Source: Scada System Node-04
        </p>
        <div className="hidden items-center gap-5 lg:flex">
          <a href="#" className="hover:text-slate-600">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-slate-600">
            System Status
          </a>
          <a href="#" className="hover:text-slate-600">
            Technical Support
          </a>
        </div>
        <p className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Cập nhật lần cuối: 2026-07-19 09:42:23
        </p>
      </footer>
    </div>
  );
}

function FactoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M4 28V12l7-3v4l6-4v5l7-3v17H4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M20 12h8v16h-8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M23 16v2M26 16v2M23 21v2M26 21v2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 10a6 6 0 1 1 12 0c0 4 1.2 5.5 1.8 6.2.3.4 0 .8-.6.8H4.8c-.6 0-.9-.4-.6-.8C4.8 15.5 6 14 6 10Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
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
