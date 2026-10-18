"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/components/auth/useAuth";
import {
  canViewClientProject,
  clientProjectId,
  getAuthRedirect,
  isAuthPath,
  isClientPath,
} from "@/lib/auth";
import { canAccessPath } from "@/lib/permissions";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, ready } = useAuth();
  const publicAuth = isAuthPath(pathname);
  const redirectTo = ready ? getAuthRedirect(session, pathname) : null;
  const projectId = clientProjectId(pathname);

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (!ready) {
    return <AuthSplash message="Đang kiểm tra phiên đăng nhập..." />;
  }

  if (redirectTo) {
    return <AuthSplash message="Đang chuyển hướng..." />;
  }

  if (isClientPath(pathname)) {
    if (canViewClientProject(session, projectId)) return children;
    return <LoginForm portal="customer" projectId={projectId} />;
  }

  if (publicAuth) return children;

  if (session?.portal === "admin") {
    if (!canAccessPath(session, pathname)) {
      return <Forbidden role={session.role} />;
    }
    return children;
  }

  return <LoginForm portal="admin" />;
}

function Forbidden({ role }: { role: string }) {
  return (
    <div className="flex h-full min-h-screen w-full items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold tracking-[0.14em] text-amber-600 uppercase">Phân quyền</p>
        <h1 className="mt-2 text-xl font-bold text-slate-900">Không có quyền truy cập</h1>
        <p className="mt-2 text-sm text-slate-500">
          Vai trò <span className="font-semibold text-slate-700">{role}</span> không được phép mở trang này.
          Liên hệ Quản trị viên nếu cần cấp quyền.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Về danh sách dự án
        </Link>
      </div>
    </div>
  );
}

function AuthSplash({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-screen w-full items-center justify-center bg-[#0b1120]">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-800 border-t-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
        <p className="mt-4 text-xs font-medium tracking-wide text-slate-400">{message}</p>
      </div>
    </div>
  );
}
