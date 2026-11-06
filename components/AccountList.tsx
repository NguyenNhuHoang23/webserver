"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  CUSTOMER_ACCOUNT_ROLE_META,
  hydrateCustomerAccounts,
  loadCustomerAccounts,
  normalizeCustomerRole,
  removeCustomerAccount,
  type CustomerAccount,
} from "@/lib/customer-accounts";
import { hasPermission } from "@/lib/permissions";
import { hydrateProjects, loadProjects, type Project } from "@/lib/projects";

const PAGE_SIZE = 6;

export function AccountList() {
  const { session } = useAuth();
  const canManage = hasPermission(session, "manageUsers");
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [accountToDelete, setAccountToDelete] = useState<CustomerAccount | null>(null);

  useEffect(() => {
    setAccounts(loadCustomerAccounts());
    setProjects(loadProjects());
    let active = true;
    void Promise.all([hydrateCustomerAccounts(), hydrateProjects()]).then(([items, projectRows]) => {
      if (!active) return;
      setAccounts(items);
      setProjects(projectRows);
    });
    return () => {
      active = false;
    };
  }, []);

  const projectName = useMemo(() => {
    const map = new Map(projects.map((item) => [item.id, item]));
    return (projectId: string) => map.get(projectId);
  }, [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((item) => {
      const managedIds = item.projectIds?.length ? item.projectIds : item.projectId ? [item.projectId] : [];
      const projectHit = managedIds.some((id) => {
        const project = projectName(id);
        return (
          id.toLowerCase().includes(q) ||
          (project?.name ?? "").toLowerCase().includes(q) ||
          (project?.customer ?? "").toLowerCase().includes(q)
        );
      });
      return (
        item.username.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.displayName.toLowerCase().includes(q) ||
        projectHit
      );
    });
  }, [accounts, projectName, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);
  const pageNumbers = visiblePages(currentPage, totalPages);

  return (
    <div className="mx-auto max-w-[1400px] p-4 font-sans sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Quản trị người dùng
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {accounts.length} tài khoản khách
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            EMS chỉ tạo Admin ban đầu. Tài khoản nhánh (chỉ xem / xem & chỉnh sửa) do Admin khách tạo trong Cấu hình dự án.
          </p>
        </div>
        {canManage ? (
          <Link
            href="/tai-khoan/them-moi"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <span className="text-base leading-none font-bold">+</span>
            Thêm tài khoản Admin
          </Link>
        ) : null}
      </div>

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
          placeholder="Tìm theo tên đăng nhập, khách hàng hoặc dự án..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-xs text-slate-800 shadow-xs outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                <th className="px-5 py-3">Tài khoản khách</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Phân cấp</th>
                <th className="px-5 py-3">Dự án được quản trị</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((account) => {
                const accountRole = normalizeCustomerRole(account.role);
                const managedIds =
                  account.projectIds?.length > 0 ? account.projectIds : account.projectId ? [account.projectId] : [];
                return (
                  <tr key={account.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/60 bg-slate-100 text-xs font-semibold text-slate-700 uppercase">
                          {account.username.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{account.username}</p>
                          <p className="text-[11px] text-slate-500">{account.displayName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600">{account.email}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          accountRole === "Admin"
                            ? "bg-slate-900 text-white"
                            : accountRole === "Edit"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                        }`}
                        title={CUSTOMER_ACCOUNT_ROLE_META[accountRole].hint}
                      >
                        {CUSTOMER_ACCOUNT_ROLE_META[accountRole].label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {accountRole === "Admin" ? (
                        managedIds.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {managedIds.map((id) => {
                              const project = projectName(id);
                              return (
                                <span
                                  key={id}
                                  className="inline-flex max-w-full items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                                >
                                  <span className="truncate">{project?.name ?? id}</span>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-600">Chưa gắn dự án</span>
                        )
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {managedIds.map((id) => {
                            const project = projectName(id);
                            const isPrimary = id === account.projectId;
                            return (
                              <span
                                key={id}
                                className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  isPrimary
                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                                title={isPrimary ? "Dự án chính" : project?.customer}
                              >
                                <span className="truncate">{project?.name ?? id}</span>
                              </span>
                            );
                          })}
                          {managedIds.length === 0 ? (
                            <span className="text-[11px] text-slate-400">Chưa gán dự án</span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {canManage ? (
                        <div className="flex justify-end gap-1">
                          {accountRole === "Admin" ? (
                            <Link
                              href={`/tai-khoan/them-moi?id=${account.id}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                              title={`Sửa ${account.username}`}
                            >
                              <EditIcon className="h-3.5 w-3.5" />
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setAccountToDelete(account)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                            title={`Xóa ${account.username}`}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Chỉ xem</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-xs text-slate-400">
                    Chưa có tài khoản Admin. Thêm Admin ban đầu để khách quản lý truy cập ứng dụng.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3.5 text-xs text-slate-500">
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
            <PageBtn disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
              ›
            </PageBtn>
          </div>
        </div>
      </section>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 text-xs text-emerald-900">
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
          i
        </span>
        <p className="leading-relaxed">
          <strong className="font-semibold">Phân cấp:</strong> EMS tạo Admin ban đầu. Admin khách tạo tài khoản nhánh
          trong Cấu hình → Quản lý tài khoản: <em>Chỉ xem</em> hoặc <em>Xem &amp; chỉnh sửa</em> thông số cấu hình.
        </p>
      </div>

      <ConfirmDialog
        open={Boolean(accountToDelete)}
        title="Xác nhận xóa tài khoản khách"
        description={`Xóa "${accountToDelete?.username}" sẽ khiến khách không đăng nhập được các dự án đã được gán.`}
        confirmText="Xác nhận xóa"
        onConfirm={() => {
          if (!accountToDelete) return;
          void removeCustomerAccount(accountToDelete.id).then((next) => {
            setAccounts(next);
            setAccountToDelete(null);
          });
        }}
        onCancel={() => setAccountToDelete(null)}
      />
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
