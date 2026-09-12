"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  INITIAL_ACCOUNTS,
  loadAccounts,
  removeAccount,
  type Account,
  type AccountRole,
} from "@/lib/accounts";

const PAGE_SIZE = 6;

const ROLE_STYLE: Record<AccountRole, string> = {
  "Quản trị viên": "bg-slate-900 text-white shadow-xs",
  "Kỹ sư vận hành": "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
  "Quản lý dự án": "bg-cyan-50 text-cyan-700 border border-cyan-200/60",
  "Nhân viên kỹ thuật": "bg-amber-50 text-amber-700 border border-amber-200/60",
};

export function AccountList() {
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setAccounts(loadAccounts());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (item) =>
        item.username.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q),
    );
  }, [accounts, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);
  const pageNumbers = visiblePages(currentPage, totalPages);

  return (
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8 font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Quản lý tài khoản đăng nhập
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {accounts.length} tài khoản
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Quản trị danh sách nhân sự vận hành, kỹ sư và quyền truy cập vào bảng điều khiển EMS.
          </p>
        </div>
        <Link
          href="/tai-khoan/them-moi"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
        >
          <span className="text-base leading-none font-bold">+</span>
          Thêm tài khoản
        </Link>
      </div>

      {/* Search Input */}
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
          placeholder="Tìm kiếm tài khoản, email hoặc vai trò..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-xs"
        />
      </div>

      {/* Main Table */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                <th className="px-5 py-3">Tên người dùng</th>
                <th className="px-5 py-3">Địa chỉ Email</th>
                <th className="px-5 py-3">Vai trò phân quyền</th>
                <th className="px-5 py-3">Ngày tạo</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((account) => (
                <tr
                  key={account.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200/60 uppercase">
                        {account.username.slice(0, 2)}
                      </div>
                      <span className="font-semibold text-slate-900">{account.username}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px]">
                    {account.email}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${ROLE_STYLE[account.role]}`}
                    >
                      {account.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                    {account.createdAt}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/tai-khoan/them-moi?id=${account.id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                        title={`Sửa tài khoản ${account.username}`}
                      >
                        <EditIcon className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setAccounts(removeAccount(account.id))}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                        title={`Xóa tài khoản ${account.username}`}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-xs text-slate-400">
                    Không tìm thấy tài khoản nào phù hợp với từ khóa tìm kiếm.
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
            {Math.min(start + PAGE_SIZE, filtered.length)} trên tổng số {filtered.length} tài khoản
          </p>
          <div className="flex items-center gap-1">
            <PageBtn disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
              ‹
            </PageBtn>
            {pageNumbers.map((p, idx) =>
              p === "ellipsis" ? (
                <span key={`e-${idx}`} className="px-1 text-slate-400">
                  …
                </span>
              ) : (
                <PageBtn key={p} active={p === currentPage} onClick={() => setPage(p)}>
                  {p}
                </PageBtn>
              ),
            )}
            <PageBtn
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              ›
            </PageBtn>
          </div>
        </div>
      </section>

      {/* Bottom Info Note */}
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 text-xs text-emerald-900">
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
          i
        </span>
        <p className="leading-relaxed">
          <strong className="font-semibold">Phân quyền bảo mật:</strong> Chỉ có tài khoản với vai trò Quản trị viên mới có quyền tạo mới, chỉnh sửa thông tin dự án và quản lý tài khoản người dùng khác trong hệ thống.
        </p>
      </div>
    </div>
  );
}

function visiblePages(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Array<number | "ellipsis"> = [1];
  if (current > 3) items.push("ellipsis");
  for (let n = Math.max(2, current - 1); n <= Math.min(total - 1, current + 1); n += 1) {
    items.push(n);
  }
  if (current < total - 2) items.push("ellipsis");
  items.push(total);
  return items;
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
