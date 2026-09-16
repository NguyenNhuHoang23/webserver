"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { customerPassword, ensureCustomerAccount } from "@/lib/customer-accounts";
import { hydrateProjects, INITIAL_PROJECTS, loadProjects, type Project, type ProjectStatus } from "@/lib/projects";

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

  useEffect(() => {
    let active = true;
    void hydrateProjects()
      .then((projects) => {
        if (active) setItems(projects);
      })
      .catch(() => {
        if (active) setItems(loadProjects());
      });
    return () => {
      active = false;
    };
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="relative mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8 font-sans space-y-6 sm:space-y-8">
      {/* 1. TOP HEADER & QUICK STATS BANNER */}
      <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900">
            Danh sách dự án
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <Link
            href="/thiet-bi"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 sm:px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <DeviceIcon className="h-4 w-4 text-slate-500" />
            Thư viện thiết bị
          </Link>
          <Link
            href="/tao-du-an"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 sm:px-4 text-xs font-semibold text-white shadow-md shadow-emerald-700/20 hover:from-emerald-500 hover:to-teal-500 transition-all"
          >
            <span className="text-base font-bold leading-none">+</span>
            Thêm Dự Án Mới
          </Link>
        </div>
      </div>

      {/* 4. INDUSTRIAL PROJECT DIRECTORY TABLE WITH LIVE TELEMETRY */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 p-3.5 sm:p-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0 max-w-3xl">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
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
                            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-xs font-bold text-white shadow-xs"
                            style={{ backgroundColor: project.accent || "#059669" }}
                          >
                            {project.logoUrl ? (
                              <img
                                src={project.logoUrl}
                                alt={`Logo ${project.customer}`}
                                className="h-full w-full bg-white object-contain"
                              />
                            ) : (
                              project.initials
                            )}
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
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200/80 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                            title="Xem chi tiết dự án"
                          >
                            <EyeSmallIcon className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/sua-du-an/${project.id}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                            title="Sửa thông tin dự án"
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

function EyeSmallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
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
