"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { isAuthPath } from "@/lib/auth";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isClientView = pathname.startsWith("/du-an/");
  const isAuthView = isAuthPath(pathname);

  if (isAuthView || isClientView) {
    return (
      <AuthGuard>
        <div className="flex h-full min-h-0 flex-1 flex-col bg-[#e8edf3]">{children}</div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex h-full">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto bg-[#f3f5f8]">{children}</main>
          <Footer />
        </div>
      </div>
    </AuthGuard>
  );
}
