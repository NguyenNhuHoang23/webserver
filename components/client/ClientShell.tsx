"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Project } from "@/lib/projects";

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
  const base = `/du-an/${project.id}`;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#e8edf3]">
      <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
        <Link
          href="/"
          title="Quay lại danh sách dự án"
          className="flex items-center gap-2.5"
        >
          <FactoryIcon className="h-8 w-8 text-[#1a5fbe]" />
          <span className="text-[20px] font-bold tracking-wide text-[#1a5fbe] uppercase">
            {project.customer}
          </span>
        </Link>
        <div className="flex items-center gap-5">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            aria-label="Thông báo"
          >
            <BellIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold text-slate-800">Admin User</p>
              <p className="text-[11px] tracking-wide text-slate-400">
                HỆ THỐNG EMS
              </p>
            </div>
            <img
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces"
              alt="Ảnh đại diện"
              className="h-10 w-10 rounded-full object-cover"
            />
          </div>
        </div>
      </header>

      <nav className="flex h-[52px] shrink-0 items-stretch gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4">
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
              className={`flex shrink-0 items-center gap-2 border-b-[3px] px-3.5 text-[13.5px] font-medium ${
                active
                  ? "border-[#1a73e8] text-[#1a73e8]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>

      <footer className="flex h-11 shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-white px-5 text-[11px] text-slate-400">
        <p className="truncate">
          © 2024 {project.customer} EMS. Data Source: Scada System Node-04
        </p>
        <div className="hidden items-center gap-5 md:flex">
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
        <p className="flex shrink-0 items-center gap-1.5">
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
