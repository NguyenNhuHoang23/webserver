"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
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
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 px-5 py-6">
        <FactoryIcon className="h-9 w-9 text-[#1a5fbe]" />
        <div>
          <p className="text-[17px] font-bold leading-tight tracking-tight text-[#1a5fbe]">
            EMS Console
          </p>
          <p className="mt-0.5 text-[10px] font-semibold tracking-[0.12em] text-slate-400">
            OPERATOR LEVEL 1
          </p>
        </div>
      </div>

      <nav className="mt-1 flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/" ||
                pathname.startsWith("/tao-du-an") ||
                pathname.startsWith("/chinh-sua-du-an") ||
                pathname.startsWith("/them-diem-do")
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                active
                  ? "bg-[#1a73e8] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-5">
        <Link
          href="/ho-tro"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-slate-600 hover:bg-slate-200/60"
        >
          <SupportIcon className="h-[18px] w-[18px]" />
          Support
        </Link>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium text-[#d94848] hover:bg-red-50"
        >
          <LogoutIcon className="h-[18px] w-[18px]" />
          Logout
        </button>
      </div>
    </aside>
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

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 19V10M10 19V5M15 19v-7M20 19V8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DeviceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 9h.01M12 9h.01M16 9h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function EmissionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 18c2.5-1 4-3.2 4-6 0-2.2-1.2-3.8-2-4 1.8.2 4.5 1.8 4.5 5.2 0 1.7-.6 3-1.4 4.1C10.8 13.8 13 11 13 8c0-2-.8-3.5-1.6-4.2 2.4.6 5.6 3 5.6 7.4 0 4.4-3.4 7.8-8.8 8.8H4v-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="18.5" cy="6.5" r="1.6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function AccountIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 19c.8-3 3.3-4.8 6.5-4.8s5.7 1.8 6.5 4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="18.2" cy="17.2" r="2.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M18.2 16.2v2M17.2 17.2h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SupportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9.5 9.4A2.5 2.5 0 0 1 12 7.6c1.4 0 2.5.9 2.5 2.3 0 1.3-1 1.9-2 2.4-.7.4-1 .8-1 1.6V14.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.2" r="0.9" fill="currentColor" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4h7A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 10 18.5V17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M4 12h10M11 8.5 14.5 12 11 15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
