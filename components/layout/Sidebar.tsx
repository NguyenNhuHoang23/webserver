"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { useAuth } from "@/components/auth/useAuth";
import { matchProjectConfig, projectConfigPath, type ProjectConfigModule } from "@/lib/project-config";
import { getProject, loadProjects, type Project } from "@/lib/projects";

const navGroups = [
  {
    group: "VẬN HÀNH & GIÁM SÁT",
    items: [
      {
        href: "/",
        label: "Danh sách Dự án",
        icon: ChartIcon,
      },
      {
        href: "/thiet-bi",
        label: "Thư viện loại đồng hồ",
        icon: DeviceIcon,
      },
    ],
  },
  {
    group: "QUẢN TRỊ & PHÁT THẢI",
    items: [
      {
        href: "/he-so-phat-thai",
        label: "Hệ số phát thải",
        icon: EmissionIcon,
      },
      {
        href: "/tai-khoan",
        label: "Quản lý tài khoản",
        icon: AccountIcon,
      },
    ],
  },
];

const configItems: { module: ProjectConfigModule; label: string; icon: typeof ChartIcon }[] = [
  { module: "points", label: "Cấu hình điểm đo", icon: MeterConfigIcon },
  { module: "ghg", label: "Cấu hình khí nhà kính", icon: EmissionIcon },
  { module: "alerts", label: "Cấu hình cảnh báo", icon: AlertConfigIcon },
  { module: "add-meter", label: "Thêm mới điểm đo", icon: DeviceIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();
  const config = matchProjectConfig(pathname);
  const [project, setProject] = useState<Project | undefined>(() =>
    config ? getProject(config.projectId) : undefined,
  );

  useEffect(() => {
    if (!config) {
      setProject(undefined);
      return;
    }
    const stored = loadProjects().find((item) => item.id === config.projectId);
    setProject(stored ?? getProject(config.projectId));
  }, [config?.projectId]);

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-slate-200/80 bg-white font-sans">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm shadow-emerald-700/20">
          <EnergyLogoIcon className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-slate-900 leading-none">
              EMS Console
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium tracking-wide text-slate-400">
            {config ? "CẤU HÌNH DỰ ÁN" : "Energy & Carbon Platform"}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        {config ? (
          <div>
            {project ? (
              <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Dự án hiện tại</span>
                  <span className="font-mono text-[10px] text-emerald-600">{project.id}</span>
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-slate-900">{project.name}</p>
              </div>
            ) : null}

            <p className="px-2.5 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Module cấu hình
            </p>
            <nav className="flex flex-col gap-1">
              {configItems.map((item) => {
                const href = projectConfigPath(config.projectId, item.module);
                const active = config.module === item.module;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.module}
                    href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                      active
                        ? "bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-700/20"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : (
          navGroups.map((group) => (
            <div key={group.group}>
              <p className="px-2.5 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.group}
              </p>
              <nav className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/" || pathname.startsWith("/tao-du-an")
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                        active
                          ? "bg-slate-900 text-white font-semibold shadow-sm"
                          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-emerald-400" : "text-slate-400"}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))
        )}
      </div>

      {/* Footer Navigation & User Card */}
      <div className="border-t border-slate-100 p-3.5 space-y-2">
        {config ? (
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <ChartIcon className="h-4 w-4 text-slate-400" />
            Về danh sách dự án
          </Link>
        ) : (
          <Link
            href="/ho-tro"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <SupportIcon className="h-4 w-4 text-slate-400" />
            Trung tâm hỗ trợ
          </Link>
        )}

        {/* User Card with One-Click Logout */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-700 text-xs uppercase">
              {session?.username ? session.username.slice(0, 2) : "AD"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800 leading-tight">
                {session?.username ?? "Quản trị viên"}
              </p>
              <p className="truncate text-[10px] text-slate-400 uppercase tracking-wider">
                {session?.role ?? "Hệ thống EMS"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/dang-nhap");
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            title="Đăng xuất"
          >
            <LogoutIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ---------------- SVG Icons ----------------

function EnergyLogoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

function MeterConfigIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 15V9M12 15v-4M16 15v-6" />
    </svg>
  );
}

function AlertConfigIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4 3.5 19h17L12 4Z" />
      <path d="M12 10v5M12 17.4v.01" />
    </svg>
  );
}

function DeviceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="12" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M8 9h.01M12 9h.01M16 9h.01" strokeWidth="2.4" />
    </svg>
  );
}

function EmissionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function AccountIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SupportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
