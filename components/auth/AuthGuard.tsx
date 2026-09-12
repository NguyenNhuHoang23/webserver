"use client";

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

  if (session?.portal === "admin") return children;

  return <LoginForm portal="admin" />;
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
