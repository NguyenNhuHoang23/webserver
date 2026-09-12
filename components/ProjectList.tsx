"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { customerPassword, ensureCustomerAccount } from "@/lib/customer-accounts";
import { INITIAL_PROJECTS, loadProjects, type Project, type ProjectStatus } from "@/lib/projects";

const statusMeta: Record<
  ProjectStatus,
  { label: string; dot: string; pill: string }
> = {
  active: {
    label: "Hoạt động",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  },
  maintenance: {
    label: "Bảo trì",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-200/80",
  },
  paused: {
    label: "Tạm dừng",
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

// Dữ liệu mô phỏng phụ tải & phát thải realtime theo từng dự án
const PROJECT_TELEMETRY: Record<string, { loadKw: number; meterCount: number; co2Day: number; solarPct: number }> = {
  "PRJ-2401": { loadKw: 2840, meterCount: 24, co2Day: 8.4, solarPct: 34 },
  "PRJ-2402": { loadKw: 1950, meterCount: 18, co2Day: 5.6, solarPct: 42 },
  "PRJ-2403": { loadKw: 5600, meterCount: 48, co2Day: 19.2, solarPct: 20 },
  "PRJ-2404": { loadKw: 1420, meterCount: 16, co2Day: 4.1, solarPct: 55 },
  "PRJ-2405": { loadKw: 8900, meterCount: 64, co2Day: 32.5, solarPct: 15 },
  "PRJ-2406": { loadKw: 7400, meterCount: 52, co2Day: 28.0, solarPct: 18 },
  "PRJ-2407": { loadKw: 1680, meterCount: 14, co2Day: 4.9, solarPct: 48 },
};

const PAGE_SIZE = 10;

export function ProjectList() {
  const [items, setItems] = useState<Project[]>(INITIAL_PROJECTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [customer, setCustomer] = useState("all");
  const [status, setStatus] = useState<"all" | ProjectStatus>("all");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState("");
  const [chartPeriod, setChartPeriod] = useState<"24h" | "7d" | "30d">("24h");

  useEffect(() => {
    setItems(loadProjects());
  }, []);

  const customers = useMemo(
    () => Array.from(new Set(items.map((p) => p.customer))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    return items.filter((p) => {
      const matchCustomer = customer === "all" || p.customer === customer;
      const matchStatus = status === "all" || p.status === status;
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.customer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCustomer && matchStatus && matchSearch;
    });
  }, [customer, status, searchQuery, items]);

  const activeCount = items.filter((p) => p.status === "active").length;
  const maintenanceCount = items.filter((p) => p.status === "maintenance").length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="relative mx-auto max-w-[1600px] p-6 lg:p-8 font-sans space-y-8">
      {/* 1. TOP HEADER & QUICK STATS BANNER */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900">
              Trung tâm Điều hành Năng lượng & Dự án
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Telemetries Live
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-500 max-w-2xl">
            Giám sát phụ tải công suất tức thời, tổng tiêu thụ kWh và kiểm kê phát thải carbon theo thời gian thực của {items.length} cơ sở công nghiệp.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/thiet-bi"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <DeviceIcon className="h-4 w-4 text-slate-500" />
            Thư viện thiết bị
          </Link>
          <Link
            href="/tao-du-an"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-xs font-semibold text-white shadow-md shadow-emerald-700/20 hover:from-emerald-500 hover:to-teal-500 transition-all"
          >
            <span className="text-base font-bold leading-none">+</span>
            Thêm Dự Án Mới
          </Link>
        </div>
      </div>

      {/* 2. REAL-TIME TELEMETRY STAT CARDS (RICH INDUSTRIAL METRICS) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Metric 1: Realtime Power Demand */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Công suất phụ tải tức thời
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <BoltIcon className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">34.8</span>
            <span className="text-sm font-semibold text-slate-500">MW</span>
            <span className="ml-auto rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              82% tải định mức
            </span>
          </div>
          {/* Mini Sparkline Bar */}
          <div className="mt-3.5 flex items-center gap-1">
            <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 w-[82%]" />
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Đỉnh: 42 MW</span>
          </div>
        </div>

        {/* Metric 2: Today Energy Consumption */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Điện năng tiêu thụ 24h
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
              <ZapIcon className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">246.5</span>
            <span className="text-sm font-semibold text-slate-500">MWh</span>
            <span className="ml-auto rounded-md bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700">
              -8.4% tiết kiệm
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Chi phí ước tính: <strong className="text-slate-700">418.2 triệu đ</strong> (EVN)
          </p>
        </div>

        {/* Metric 3: Carbon GHG Emission Today */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Phát thải carbon hôm nay
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <LeafIcon className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">82.6</span>
            <span className="text-sm font-semibold text-slate-500">tCO₂e</span>
            <span className="ml-auto rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              Scope 1 + 2
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Quy chuẩn: <span className="font-mono text-slate-600">0.7221 kgCO₂/kWh</span>
          </p>
        </div>

        {/* Metric 4: Connected IoT Infrastructure */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Cơ sở & Điểm đo trực tuyến
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ActivityIcon className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{activeCount}</span>
            <span className="text-sm font-semibold text-slate-500">/ {items.length} cơ sở</span>
            <span className="ml-auto rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              98.2% online
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {maintenanceCount > 0 ? (
              <span className="text-amber-600 font-medium">⚠️ {maintenanceCount} cơ sở đang kiểm tra thiết bị</span>
            ) : (
              <span className="text-emerald-600 font-medium">● 100% gateway kết nối bình thường</span>
            )}
          </p>
        </div>
      </div>

      {/* 3. INTERACTIVE ENERGY ANALYTICS (LOAD PROFILE & GHG EMISSION BREAKDOWN) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: 24h Load Profile Curve */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Biểu đồ Phụ tải Công suất Toàn hệ thống (MW)
              </h2>
              <p className="text-xs text-slate-500">
                Theo dõi biến thiên phụ tải giờ cao điểm, giờ bình thường và giờ thấp điểm.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setChartPeriod("24h")}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  chartPeriod === "24h" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                24 Giờ
              </button>
              <button
                type="button"
                onClick={() => setChartPeriod("7d")}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  chartPeriod === "7d" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                7 Ngày
              </button>
              <button
                type="button"
                onClick={() => setChartPeriod("30d")}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  chartPeriod === "30d" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                30 Ngày
              </button>
            </div>
          </div>

          {/* SVG Smooth Load Curve */}
          <div className="relative h-56 w-full pt-2">
            <svg className="h-full w-full overflow-visible" viewBox="0 0 800 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="loadGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="70%" stopColor="#10b981" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="800" y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="90" x2="800" y2="90" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="140" x2="800" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />

              {/* Peak Hours Band Shading (09:30 - 11:30 & 17:00 - 20:00) */}
              <rect x="300" y="0" width="80" height="200" fill="#fef3c7" opacity="0.35" />
              <rect x="540" y="0" width="100" height="200" fill="#fef3c7" opacity="0.35" />

              {/* Solar Power Contribution (Middle Day Peak) */}
              <path
                d="M 240 190 Q 400 40 560 190 Z"
                fill="url(#solarGradient)"
              />
              <path
                d="M 240 190 Q 400 40 560 190"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeDasharray="4 2"
              />

              {/* Total Grid Load Area */}
              <path
                d="M 0 160 C 100 150, 160 110, 240 120 C 320 80, 380 50, 480 70 C 580 40, 680 90, 800 130 L 800 200 L 0 200 Z"
                fill="url(#loadGradient)"
              />
              {/* Total Grid Load Line */}
              <path
                d="M 0 160 C 100 150, 160 110, 240 120 C 320 80, 380 50, 480 70 C 580 40, 680 90, 800 130"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Peak Dot */}
              <circle cx="580" cy="40" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            </svg>

            {/* Time labels below chart */}
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-2">
              <span>00:00</span>
              <span>04:00</span>
              <span>08:00</span>
              <span className="font-semibold text-amber-600">11:00 (Cao điểm)</span>
              <span>14:00 (Solar Max)</span>
              <span className="font-semibold text-amber-600">18:00 (Cao điểm)</span>
              <span>22:00</span>
            </div>
          </div>

          {/* Chart Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              Tổng phụ tải lưới điện (MW)
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-cyan-400" />
              Sản lượng Solar áp mái tự dùng (MW)
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-amber-200" />
              Khung giờ cao điểm EVN
            </span>
          </div>
        </div>

        {/* Right 1 Col: GHG Emissions Structure */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Cơ cấu Phát thải GHG
              </h2>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
                GHG Protocol
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Phân loại nguồn phát thải theo tiêu chuẩn quốc tế.
            </p>

            <div className="mt-6 space-y-4">
              {/* Scope 1 */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700">Scope 1 (Trực tiếp: Lò hơi, Gas, DO)</span>
                  <span className="font-bold text-slate-900">31.4 tCO₂e <span className="text-slate-400 font-normal">(38%)</span></span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 w-[38%]" />
                </div>
              </div>

              {/* Scope 2 */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700">Scope 2 (Gián tiếp: Điện lưới EVN)</span>
                  <span className="font-bold text-slate-900">51.2 tCO₂e <span className="text-slate-400 font-normal">(62%)</span></span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 w-[62%]" />
                </div>
              </div>

              {/* Scope 3 */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700">Scope 3 (Chuỗi cung ứng & Vận chuyển)</span>
                  <span className="font-bold text-slate-900">Đang kiểm kê...</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-slate-300 w-[15%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-semibold">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px]">
                ✓
              </span>
              Mục tiêu Net-Zero 2026
            </div>
            <p className="mt-1 text-[11px] text-emerald-800 leading-relaxed">
              Hệ thống đã bù trừ <strong>18.4%</strong> lượng carbon thông qua điện mặt trời áp mái và tối ưu hóa hệ thống máy nén khí.
            </p>
          </div>
        </div>
      </div>

      {/* 4. INDUSTRIAL PROJECT DIRECTORY TABLE WITH LIVE TELEMETRY */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px] max-w-3xl">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon className="h-4 w-4" />
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm kiếm dự án, khách hàng hoặc mã PRJ..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all shadow-xs"
              />
            </div>

            {/* Customer Filter */}
            <FilterSelect
              value={customer}
              onChange={(v) => {
                setCustomer(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Tất cả khách hàng" },
                ...customers.map((c) => ({ value: c, label: c })),
              ]}
            />

            {/* Status Filter */}
            <FilterSelect
              value={status}
              onChange={(v) => {
                setStatus(v as "all" | ProjectStatus);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Trạng thái: Tất cả" },
                { value: "active", label: "Trạng thái: Hoạt động" },
                { value: "maintenance", label: "Trạng thái: Bảo trì" },
                { value: "paused", label: "Trạng thái: Tạm dừng" },
              ]}
            />
          </div>

          <div className="text-xs text-slate-500">
            Hiển thị: <strong className="text-slate-800 font-semibold">{filtered.length}</strong> cơ sở
          </div>
        </div>

        {/* Project Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                <th className="px-5 py-3.5">Cơ sở / Dự án</th>
                <th className="px-5 py-3.5">Doanh nghiệp quản lý</th>
                <th className="px-5 py-3.5">Phụ tải hiện tại (kW)</th>
                <th className="px-5 py-3.5">Phát thải / ngày</th>
                <th className="px-5 py-3.5">Hạ tầng đo</th>
                <th className="px-5 py-3.5">Trạng thái</th>
                <th className="px-5 py-3.5 text-right">Điều hành</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-slate-400">
                    Không tìm thấy dự án nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                rows.map((project) => {
                  const telem = PROJECT_TELEMETRY[project.id] ?? { loadKw: 2100, meterCount: 16, co2Day: 6.2, solarPct: 25 };
                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-slate-50/90 transition-colors group"
                    >
                      {/* Project Name & Code */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3.5">
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-xs"
                            style={{ backgroundColor: project.accent || "#059669" }}
                          >
                            {project.initials}
                          </span>
                          <div>
                            <Link
                              href={`/du-an/${project.id}`}
                              className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors text-[13px]"
                            >
                              {project.name}
                            </Link>
                            <span className="block font-mono text-[11px] text-slate-400">
                              {project.id} • Khởi tạo: {project.startDate}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4 font-medium text-slate-700">
                        {project.customer}
                      </td>

                      {/* Load Demand */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">
                            {telem.loadKw.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400">kW</span>
                        </div>
                        <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(100, (telem.loadKw / 9000) * 100)}%` }}
                          />
                        </div>
                      </td>

                      {/* CO2 Emissions */}
                      <td className="px-5 py-4">
                        <span className="font-mono font-semibold text-slate-800">
                          {telem.co2Day}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">tCO₂e</span>
                        {telem.solarPct > 0 && (
                          <span className="block text-[10px] text-emerald-600 font-medium">
                            +{telem.solarPct}% Solar
                          </span>
                        )}
                      </td>

                      {/* Meters count */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {telem.meterCount} điểm đo
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta[project.status].pill}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[project.status].dot}`} />
                          {statusMeta[project.status].label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/du-an/${project.id}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="Mở bảng điều khiển SCADA dự án"
                          >
                            <DiagramSmallIcon className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Sơ đồ</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => copyCustomerInvite(project, setCopiedId)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                            title="Sao chép link mời và tài khoản khách hàng"
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
                          </button>
                          <Link
                            href={`/chinh-sua-du-an/${project.id}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                            title="Cấu hình dự án"
                          >
                            <EditIcon className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 text-xs text-slate-500 bg-white">
          <p>
            Hiển thị {filtered.length === 0 ? 0 : start + 1}-
            {Math.min(start + PAGE_SIZE, filtered.length)} trên tổng số {filtered.length} dự án
          </p>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
          />
        </div>
      </section>

      {/* Copy Alert Toast */}
      {copiedId && (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-2xl animate-fadeIn">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>Đã sao chép link và tài khoản khách hàng vào clipboard!</span>
        </div>
      )}
    </div>
  );
}

// ---------------- Helpers & Subcomponents ----------------

function copyCustomerInvite(project: Project, setCopiedId: (id: string) => void) {
  const account = ensureCustomerAccount(project);
  const link = `${window.location.origin}/du-an/${project.id}`;
  const text = [
    `Link dự án: ${link}`,
    `Tài khoản: ${account.username}`,
    `Mật khẩu: ${customerPassword(account)}`,
  ].join("\n");

  void navigator.clipboard.writeText(text).then(() => {
    setCopiedId(project.id);
    window.setTimeout(() => setCopiedId(""), 2500);
  });
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 appearance-none rounded-xl border border-slate-200 bg-white py-0 pr-8 pl-3 text-xs font-medium text-slate-700 outline-none hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all shadow-xs"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 text-xs">
        ▾
      </span>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const items: Array<number | "…"> = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) items.push(i);
  } else if (page <= 3) {
    items.push(1, 2, 3, "…", totalPages);
  } else if (page >= totalPages - 2) {
    items.push(1, "…", totalPages - 2, totalPages - 1, totalPages);
  } else {
    items.push(1, "…", page, "…", totalPages);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
      >
        ‹
      </button>
      {items.map((item, idx) =>
        item === "…" ? (
          <span key={`e-${idx}`} className="px-1 text-slate-400">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition-colors ${
              item === page
                ? "bg-emerald-600 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
      >
        ›
      </button>
    </div>
  );
}

// ---------------- SVG Icons ----------------

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
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

function DiagramSmallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
      <path d="M12 7v4M12 11H6v6M12 11h6v6" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}
