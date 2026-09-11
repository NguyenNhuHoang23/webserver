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
    <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[#f3f5f8]">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#1a73e8]" />
        <p className="mt-3 text-sm text-slate-500">{message}</p>
      </div>
    </div>
  );
}
