"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { useAuth } from "@/components/auth/useAuth";
import { useSidebar } from "@/components/layout/SidebarContext";
import { matchProjectConfig, projectConfigPath, type ProjectConfigModule } from "@/lib/project-config";
import { getProject, hydrateProjects, type Project } from "@/lib/projects";

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
  { module: "project-info", label: "Sửa thông tin dự án", icon: EditProjectIcon },
  { module: "points", label: "Cấu hình điểm đo", icon: MeterConfigIcon },
  { module: "ghg", label: "Cấu hình khí nhà kính", icon: EmissionIcon },
  { module: "alerts", label: "Cấu hình cảnh báo", icon: AlertConfigIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();
  const { mobileOpen, setMobileOpen, collapsed, toggleCollapsed } = useSidebar();
  const config = matchProjectConfig(pathname);
  const [project, setProject] = useState<Project | undefined>(() =>
    config ? getProject(config.projectId) : undefined,
  );

  useEffect(() => {
    if (!config) {
      setProject(undefined);
      return;
    }
    let active = true;
    void hydrateProjects().then((projects) => {
      if (active) setProject(projects.find((item) => item.id === config.projectId) ?? getProject(config.projectId));
    });
    return () => {
      active = false;
    };
  }, [config?.projectId]);

  const handleLinkClick = () => {
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    router.replace("/dang-nhap");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col border-r border-slate-200/80 bg-white font-sans shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
      >
        <SidebarBody
          pathname={pathname}
          config={config}
          project={project}
          session={session}
          isMobile={true}
          collapsed={false}
          onClose={() => setMobileOpen(false)}
          onLinkClick={handleLinkClick}
          onLogout={handleLogout}
        />
      </aside>

      {/* Desktop / Laptop Static Sidebar */}
      <aside
        className={`hidden lg:flex h-full shrink-0 flex-col border-r border-slate-200/80 bg-white font-sans transition-[width] duration-200 ease-in-out ${
          collapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        <SidebarBody
          pathname={pathname}
          config={config}
          project={project}
          session={session}
          isMobile={false}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          onLinkClick={handleLinkClick}
          onLogout={handleLogout}
        />
      </aside>
    </>
  );
}

// ---------------- Reusable Sidebar Body ----------------

function SidebarBody({
  pathname,
  config,
  project,
  session,
  isMobile,
  collapsed,
  onClose,
  onToggleCollapse,
  onLinkClick,
  onLogout,
}: {
  pathname: string;
  config: ReturnType<typeof matchProjectConfig>;
  project?: Project;
  session: ReturnType<typeof useAuth>["session"];
  isMobile: boolean;
  collapsed: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
  onLinkClick: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand Header */}
      <div
        className={`flex items-center border-b border-slate-100 ${
          collapsed
            ? "justify-center px-2 py-4"
            : "justify-between px-5 py-4 sm:px-6 sm:py-5"
        }`}
      >
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm shadow-emerald-700/20"
            title="EMS Console"
          >
            <EnergyLogoIcon className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="text-base font-bold tracking-tight text-slate-900 leading-none">
                EMS Console
              </span>
              <p className="mt-1 text-[11px] font-medium tracking-wide text-slate-400 truncate">
                {config?.module === "project-info"
                  ? "QUẢN LÝ DỰ ÁN"
                  : config
                    ? "CẤU HÌNH DỰ ÁN"
                    : "Energy & Carbon Platform"}
              </p>
            </div>
          )}
        </div>

        {/* Close Button on Mobile Drawer */}
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Đóng menu"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className={`flex-1 overflow-y-auto ${collapsed ? "px-2 py-4 space-y-4" : "px-3.5 py-4 space-y-6"}`}>
        {config ? (
          <div>
            {!collapsed && project && (
              <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Dự án hiện tại</span>
                  <span className="font-mono text-[10px] text-emerald-600">{project.id}</span>
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-slate-900">{project.name}</p>
              </div>
            )}

            {!collapsed && (
              <p className="px-2.5 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {config.module === "project-info" ? "Quản lý dự án" : "Module cấu hình"}
              </p>
            )}
            <nav className="flex flex-col gap-1">
              {configItems.map((item) => {
                const href = projectConfigPath(config.projectId, item.module);
                const active = config.module === item.module;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.module}
                    href={href}
                    onClick={onLinkClick}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center rounded-lg text-xs font-medium transition-all ${
                      collapsed
                        ? "h-10 w-10 mx-auto justify-center"
                        : "gap-3 px-3 py-2"
                    } ${
                      active
                        ? "bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-700/20"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : (
          navGroups.map((group) => (
            <div key={group.group}>
              {!collapsed && (
                <p className="px-2.5 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.group}
                </p>
              )}
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
                      onClick={onLinkClick}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center rounded-lg text-xs font-medium transition-all ${
                        collapsed
                          ? "h-10 w-10 mx-auto justify-center"
                          : "gap-3 px-3 py-2.5"
                      } ${
                        active
                          ? "bg-slate-900 text-white font-semibold shadow-sm"
                          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-emerald-400" : "text-slate-400"}`} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))
        )}
      </div>

      {/* Footer Navigation & User Card */}
      <div className={`border-t border-slate-100 ${collapsed ? "p-2 space-y-2" : "p-3.5 space-y-2"}`}>
        {config ? (
          <Link
            href="/"
            onClick={onLinkClick}
            title={collapsed ? "Về danh sách dự án" : undefined}
            className={`flex items-center rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors ${
              collapsed ? "h-9 w-9 mx-auto justify-center" : "gap-2.5 px-3 py-2"
            }`}
          >
            <ChartIcon className="h-4 w-4 text-slate-400 shrink-0" />
            {!collapsed && <span>Về danh sách dự án</span>}
          </Link>
        ) : (
          <Link
            href="/ho-tro"
            onClick={onLinkClick}
            title={collapsed ? "Trung tâm hỗ trợ" : undefined}
            className={`flex items-center rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors ${
              collapsed ? "h-9 w-9 mx-auto justify-center" : "gap-2.5 px-3 py-2"
            }`}
          >
            <SupportIcon className="h-4 w-4 text-slate-400 shrink-0" />
            {!collapsed && <span>Trung tâm hỗ trợ</span>}
          </Link>
        )}

        {/* User Card with One-Click Logout */}
        <div
          className={`flex items-center rounded-xl bg-slate-50 border border-slate-200/60 ${
            collapsed ? "justify-center p-1.5" : "justify-between p-2.5"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-700 text-xs uppercase">
              {session?.username ? session.username.slice(0, 2) : "AD"}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-800 leading-tight">
                  {session?.username ?? "Quản trị viên"}
                </p>
                <p className="truncate text-[10px] text-slate-400 uppercase tracking-wider">
                  {session?.role ?? "Hệ thống EMS"}
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              onClick={onLogout}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              title="Đăng xuất"
            >
              <LogoutIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- SVG Icons ----------------

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

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

function EditProjectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
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
