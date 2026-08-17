import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppFrame } from "@/components/layout/AppFrame";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "EMS Console",
  description: "Hệ thống giám sát và quản lý năng lượng công nghiệp",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className={`${inter.className} h-full overflow-hidden text-slate-800`}>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
