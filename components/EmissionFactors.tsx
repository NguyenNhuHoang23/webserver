"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  formatFactorValue,
  hydrateFactorGroups,
  INITIAL_FACTOR_GROUPS,
  loadFactorGroups,
  removeFactorGroup,
  type FactorGroup,
  type GasKey,
} from "@/lib/emission-factors";

const PAGE_SIZE = 4;

const GAS_META: Record<GasKey, { label: string; className: string }> = {
  co2: { label: "CO₂", className: "bg-emerald-50 text-emerald-700 border-emerald-200/60" },
  ch4: { label: "CH₄", className: "bg-amber-50 text-amber-700 border-amber-200/60" },
  n2o: { label: "N₂O", className: "bg-violet-50 text-violet-700 border-violet-200/60" },
};

export function EmissionFactors() {
  const [groups, setGroups] = useState<FactorGroup[]>(INITIAL_FACTOR_GROUPS);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [groupToDelete, setGroupToDelete] = useState<FactorGroup | null>(null);

  useEffect(() => {
    void hydrateFactorGroups().then(setGroups).catch(() => setGroups(loadFactorGroups()));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q),
    );
  }, [groups, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8 font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Quản lý hệ số phát thải
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {groups.length} nhóm hệ số
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Thư viện hệ số phát thải phục vụ quy đổi năng lượng và kiểm kê carbon theo tiêu chuẩn GHG Protocol và Bộ TN&MT.
          </p>
        </div>
        <Link
          href="/he-so-phat-thai/them-moi"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors shrink-0"
        >
          <span className="text-base leading-none font-bold">+</span>
          Thêm hệ số
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6 max-w-md">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
          <SearchIcon className="h-4 w-4" />
        </span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm kiếm theo tên nguồn hoặc xuất xứ..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-xs"
        />
      </div>

      {/* Main Table */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                <th className="px-5 py-3">Nguồn / Loại nhiên liệu</th>
                <th className="px-5 py-3">Loại khí & Giá trị</th>
                <th className="px-5 py-3">Đơn vị đo</th>
                <th className="px-5 py-3">Nguồn tham chiếu / Căn cứ</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((group) =>
                group.gases.map((gas, index) => {
                  const first = index === 0;
                  const last = index === group.gases.length - 1;
                  const gasMeta = (GAS_META as Record<string, { label: string; className: string }>)[gas.key] ?? {
                    label: gas.label || String(gas.key || "GAS").toUpperCase(),
                    className: "bg-slate-50 text-slate-700 border-slate-200/60",
                  };
                  return (
                    <tr
                      key={`${group.id}-${gas.key}`}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        last ? "border-b border-slate-100" : ""
                      }`}
                    >
                      {first && (
                        <td
                          rowSpan={group.gases.length}
                          className="max-w-[320px] px-5 py-4 align-middle font-semibold text-slate-900 border-r border-slate-100"
                        >
                          {group.name}
                        </td>
                      )}
                      <td className="px-5 py-3">
                        <div className="inline-flex items-center gap-3">
                          <span
                            className={`inline-flex min-w-11 justify-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${gasMeta.className}`}
                          >
                            {gasMeta.label}
                          </span>
                          <span className="font-mono font-semibold text-slate-800 text-xs">
                            {formatFactorValue(gas.value)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600 font-mono text-[11px]">{gas.unit}</td>
                      {first && (
                        <>
                          <td
                            rowSpan={group.gases.length}
                            className="max-w-[280px] px-5 py-4 align-middle text-xs leading-relaxed text-slate-500 border-l border-slate-100"
                          >
                            {group.source}
                          </td>
                          <td rowSpan={group.gases.length} className="px-5 py-4 align-middle text-right">
                            <div className="flex justify-end gap-1">
                              <Link
                                href={`/he-so-phat-thai/them-moi?id=${group.id}`}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                                title={`Chỉnh sửa ${group.name}`}
                              >
                                <EditIcon className="h-3.5 w-3.5" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => setGroupToDelete(group)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                                title={`Xóa ${group.name}`}
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                }),
              )}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-xs text-slate-400">
                    Không tìm thấy hệ số phát thải nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 text-xs text-slate-500 bg-white">
          <p>
            Hiển thị {filtered.length === 0 ? 0 : start + 1}-
            {Math.min(start + PAGE_SIZE, filtered.length)} trên tổng số {filtered.length} nhóm hệ số
          </p>
          <div className="flex items-center gap-1">
            <PageBtn disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
              ‹
            </PageBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <PageBtn key={n} active={n === currentPage} onClick={() => setPage(n)}>
                {n}
              </PageBtn>
            ))}
            <PageBtn
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              ›
            </PageBtn>
          </div>
        </div>
      </section>

      {/* Note Banner */}
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 text-xs text-emerald-900">
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
          i
        </span>
        <p className="leading-relaxed">
          <strong className="font-semibold">Căn cứ tiêu chuẩn:</strong> Hệ số phát thải được phân loại theo các chất khí gây hiệu ứng nhà kính chính (CO₂, CH₄, N₂O) và quy đổi sang tấn CO₂ tương đương ($tCO_2e$) dựa theo GWP (Global Warming Potential) công bố bởi IPCC và quy chuẩn của Bộ Tài nguyên & Môi trường.
        </p>
      </div>
    </div>
  );
}

function PageBtn({
  children,
  onClick,
  active = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors disabled:opacity-30 ${
        active
          ? "bg-emerald-600 text-white shadow-xs"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
