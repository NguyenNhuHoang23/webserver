"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  DEFAULT_PASSWORD,
  homePathFor,
  isAuthPath,
  loginAdmin,
  loginCustomer,
  type AuthPortal,
} from "@/lib/auth";
import { customerPassword, getCustomerAccountForProject } from "@/lib/customer-accounts";
import { loadProjects, type Project } from "@/lib/projects";

export function LoginForm({
  portal: initialPortal,
  projectId,
}: {
  portal: AuthPortal;
  projectId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [portal, setPortal] = useState<AuthPortal>(initialPortal);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [project, setProject] = useState<Project | undefined>();
  const [demoUser, setDemoUser] = useState(initialPortal === "admin" ? "admin_system" : "khachhang");
  const [demoPassword, setDemoPassword] = useState(DEFAULT_PASSWORD);

  // Sync state when portal or projectId changes
  useEffect(() => {
    if (portal === "admin") {
      setDemoUser("admin_system");
      setDemoPassword(DEFAULT_PASSWORD);
      setProject(undefined);
    } else {
      if (projectId) {
        const found = loadProjects().find((item) => item.id === projectId);
        setProject(found);
        const account = getCustomerAccountForProject(projectId);
        if (account) {
          setDemoUser(account.username);
          setDemoPassword(customerPassword(account));
          return;
        }
      }
      setDemoUser("khachhang");
      setDemoPassword(DEFAULT_PASSWORD);
    }
  }, [portal, projectId]);

  function handleQuickFill() {
    setIdentifier(demoUser);
    setPassword(demoPassword);
    setError("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    // Giả lập độ trễ phản hồi siêu mượt để tạo cảm giác xác thực an toàn
    setTimeout(() => {
      const result =
        portal === "admin"
          ? loginAdmin(identifier, password)
          : loginCustomer(identifier, password, projectId);

      if (!result.ok) {
        setError(result.message);
        setSubmitting(false);
        return;
      }

      if (isAuthPath(pathname)) {
        router.replace(homePathFor(result.session));
        return;
      }

      setSubmitting(false);
    }, 450);
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col lg:flex-row bg-[#0b1120] text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* LEFT COLUMN: Cinematic CleanTech & Energy Showcase */}
      <div className="relative hidden lg:flex lg:w-7/12 xl:w-2/3 flex-col justify-between overflow-hidden p-10 xl:p-14">
        {/* Background Image with Deep Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/login-hero.jpg"
            alt="EMS Smart Green Industrial Facility"
            fill
            priority
            className="object-cover object-center scale-105 transform transition-transform duration-10000 ease-out"
          />
          {/* Multi-layered futuristic gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#070b14]/90 via-[#070b14]/75 to-[#0b1120]" />
          <div className="absolute inset-0 bg-radial-[at_top_left] from-emerald-500/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-radial-[at_bottom_center] from-cyan-500/15 via-transparent to-transparent" />
        </div>

        {/* Ambient Top Bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#090d16]">
                <EnergyLogoIcon className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">EMS Console</span>
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400">Energy Management & Carbon Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-3.5 py-1.5 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-slate-300">Hạ tầng IoT: 100% Sẵn sàng</span>
          </div>
        </div>

        {/* Hero Central Content */}
        <div className="relative z-10 my-auto max-w-xl py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300 backdrop-blur-md mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Nền tảng Quản trị Năng lượng & Phát thải GHG</span>
          </div>

          <h2 className="text-3xl xl:text-5xl font-bold tracking-tight text-white leading-[1.15]">
            Kiểm soát năng lượng &{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              phát thải thông minh
            </span>
          </h2>
          <p className="mt-5 text-base text-slate-300/80 leading-relaxed font-normal">
            Giám sát thời gian thực toàn bộ mạng lưới phụ tải công nghiệp, tự động hóa kiểm kê carbon
            theo tiêu chuẩn GHG Protocol và ISO 50001.
          </p>

          {/* Minimal Key Highlights */}
          <div className="mt-8 flex items-center gap-8 border-t border-white/10 pt-6">
            <div>
              <p className="text-2xl font-bold tracking-tight text-white">10,400+</p>
              <p className="text-xs text-slate-400 mt-0.5">Điểm đo kết nối IoT</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-2xl font-bold tracking-tight text-emerald-400">-18.4%</p>
              <p className="text-xs text-slate-400 mt-0.5">Phát thải CO₂e trung bình</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-2xl font-bold tracking-tight text-cyan-400">99.98%</p>
              <p className="text-xs text-slate-400 mt-0.5">Độ ổn định dữ liệu</p>
            </div>
          </div>
        </div>

        {/* Left Bottom Meta */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheckIcon className="h-4 w-4 text-emerald-400" />
              Chuẩn ISO 50001
            </span>
            <span className="h-3 w-px bg-slate-700" />
            <span className="flex items-center gap-1.5">
              <LeafIcon className="h-4 w-4 text-cyan-400" />
              GHG Protocol Verified
            </span>
          </div>
          <span>© 2026 EMS Ecosystem. Tất cả quyền được bảo lưu.</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Modern High-Precision Auth Card */}
      <div className="relative flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 xl:px-18 bg-[#0b1120]">
        {/* Background Ambient Glows */}
        <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />

        <div className="mx-auto w-full max-w-md">
          {/* Mobile Logo Brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 shadow-md">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#090d16]">
                <EnergyLogoIcon className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">EMS Console</span>
              <p className="text-xs text-slate-400">Energy & Carbon Intelligence</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {portal === "admin" ? "Đăng nhập Quản trị" : "Cổng thông tin Khách hàng"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {portal === "admin"
                ? "Truy cập hệ thống trung tâm điều hành và cấu hình hạ tầng EMS."
                : project
                  ? `Giám sát dữ liệu vận hành dự án: ${project.name}`
                  : "Truy cập báo cáo đo đạc và phát thải của cơ sở của bạn."}
            </p>
          </div>

          {/* Portal Switcher Tabs */}
          <div className="mb-6 flex rounded-xl border border-slate-800 bg-slate-900/80 p-1 backdrop-blur-md">
            <button
              type="button"
              onClick={() => {
                setPortal("admin");
                setError("");
              }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all duration-200 ${
                portal === "admin"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/50"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <AdminBadgeIcon className="h-4 w-4" />
              Quản trị viên
            </button>
            <button
              type="button"
              onClick={() => {
                setPortal("customer");
                setError("");
              }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all duration-200 ${
                portal === "customer"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/50"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <UserGroupIcon className="h-4 w-4" />
              Khách hàng dự án
            </button>
          </div>

          {/* Project Context Badge if applicable */}
          {project && (
            <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <BuildingIcon className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-medium truncate">{project.name}</span>
              </div>
              <span className="shrink-0 rounded bg-emerald-900/60 px-2 py-0.5 font-mono text-[10px] text-emerald-200">
                {project.id}
              </span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identifier Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Tài khoản hoặc Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError("");
                  }}
                  placeholder={demoUser}
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 transition-all"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Mật khẩu
                </label>
                <a
                  href="#support"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Vui lòng liên hệ quản trị viên IT hoặc Hotline hỗ trợ 1900-xxxx để đặt lại mật khẩu.");
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Quên mật khẩu?
                </a>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <LockIcon className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Nhập mật khẩu truy cập"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 py-3 pl-10 pr-11 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 transition-all"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-0"
                />
                <span className="text-xs text-slate-300">Ghi nhớ phiên đăng nhập này</span>
              </label>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 animate-fadeIn">
                <AlertCircleIcon className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-px font-medium text-white shadow-lg shadow-emerald-950/50 hover:shadow-emerald-900/80 active:scale-[0.99] disabled:opacity-60 transition-all duration-200 mt-2"
            >
              <span className="flex h-full w-full items-center justify-center rounded-[11px] bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 text-sm font-semibold transition-all group-hover:bg-opacity-90">
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <SpinnerIcon className="h-4 w-4 animate-spin text-white" />
                    Đang xác thực bảo mật...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Đăng nhập hệ thống
                    <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </span>
            </button>
          </form>

          {/* Quick Demo Credentials Bar */}
          <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/40 px-3.5 py-2 text-xs">
            <div className="flex items-center gap-2 text-slate-400 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate">Thử nghiệm: <strong className="font-mono text-slate-200">{demoUser}</strong> / <span className="font-mono text-slate-400">{demoPassword}</span></span>
            </div>
            <button
              type="button"
              onClick={handleQuickFill}
              className="shrink-0 text-xs font-medium text-emerald-400 hover:text-emerald-300 ml-2 transition-colors cursor-pointer"
            >
              Điền nhanh ⚡
            </button>
          </div>

          {/* Bottom Security Footer */}
          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <LockClosedSmallIcon className="h-3.5 w-3.5 text-slate-400" />
            <span>Kết nối bảo mật 256-bit TLS mã hóa đầu cuối</span>
          </div>
        </div>
      </div>
    </div>
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

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function AdminBadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}

function UserGroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M8 10h.01" />
      <path d="M16 10h.01" />
      <path d="M8 14h.01" />
      <path d="M16 14h.01" />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function LockClosedSmallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
