"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { isAuthPath } from "@/lib/auth";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isClientView = pathname.startsWith("/du-an/");
  const isAuthView = isAuthPath(pathname);

  if (isAuthView) {
    return (
      <AuthGuard>
        <div className="flex h-screen w-full flex-col overflow-hidden bg-[#0b1120]">{children}</div>
      </AuthGuard>
    );
  }

  if (isClientView) {
    return (
      <AuthGuard>
        <div className="flex h-full min-h-0 flex-1 flex-col bg-[#e8edf3]">{children}</div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="relative flex h-full w-full overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f3f5f8]">{children}</main>
            <Footer />
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
