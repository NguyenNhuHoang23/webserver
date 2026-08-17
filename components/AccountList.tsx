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

const PAGE_SIZE = 4;

const ROLE_STYLE: Record<AccountRole, string> = {
  "Quản trị viên": "bg-[#e8f1fd] text-[#1a73e8]",
  "Kỹ sư vận hành": "bg-emerald-50 text-emerald-700",
  "Quản lý dự án": "bg-violet-50 text-violet-700",
  "Nhân viên kỹ thuật": "bg-amber-50 text-amber-700",
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
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Quản lý tài khoản đăng nhập
          </h1>
          <p className="mt-1 text-sm text-slate-500">Quản lý các tài khoản</p>
        </div>
        <Link
          href="/tai-khoan/them-moi"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#1a73e8] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#1666d0]"
        >
          <span className="text-lg leading-none">+</span>
          Thêm tài khoản
        </Link>
      </div>

      <label className="relative mb-4 block max-w-md">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
          <SearchIcon className="h-4 w-4" />
        </span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm kiếm tài khoản..."
          className="h-10 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-[#1a73e8]"
        />
      </label>

      <section className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-[#f8fafc] text-[11px] font-semibold tracking-wide text-slate-400">
                <th className="px-5 py-3">TÊN NGƯỜI DÙNG</th>
                <th className="px-5 py-3">EMAIL</th>
                <th className="px-5 py-3">VAI TRÒ</th>
                <th className="px-5 py-3">NGÀY TẠO</th>
                <th className="px-5 py-3 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((account) => (
                <tr
                  key={account.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80"
                >
                  <td className="px-5 py-3.5 font-medium text-slate-800">
                    {account.username}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{account.email}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${ROLE_STYLE[account.role]}`}
                    >
                      {account.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{account.createdAt}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/tai-khoan/them-moi?id=${account.id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-[#1a73e8]"
                        aria-label={`Chỉnh sửa ${account.username}`}
                      >
                        <EditIcon className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setAccounts(removeAccount(account.id))}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
                        aria-label={`Xóa ${account.username}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                    Không tìm thấy tài khoản.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm text-slate-500">
          <p>
            Hiển thị {filtered.length === 0 ? 0 : start + 1}-
            {Math.min(start + PAGE_SIZE, filtered.length)} trên tổng số {filtered.length} tài khoản
          </p>
          <div className="flex items-center gap-1">
            <PageBtn disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
              ‹
            </PageBtn>
            {pageNumbers.map((n, idx) =>
              n === "ellipsis" ? (
                <span key={`e-${idx}`} className="px-1 text-slate-400">
                  …
                </span>
              ) : (
                <PageBtn key={n} active={n === currentPage} onClick={() => setPage(n)}>
                  {n}
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

      <div className="mt-5 flex gap-3 rounded-xl border border-[#c5daf7] bg-[#f3f8ff] px-4 py-3 text-sm text-slate-600">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1a73e8] text-[11px] font-bold text-white">
          i
        </span>
        <p>
          <span className="font-semibold">Mẹo:</span> Phân quyền theo vai trò để hạn chế truy cập
          cấu hình thiết bị, cảnh báo và hệ số phát thải.
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
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium disabled:opacity-40 ${
        active ? "bg-[#1a73e8] text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 17.5V20h2.5L18 8.5 15.5 6 4 17.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M13.8 7.7 16.3 10.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 7h14M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M8 7l.7 12.2A1.5 1.5 0 0 0 10.2 21h3.6a1.5 1.5 0 0 0 1.5-1.8L16 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
