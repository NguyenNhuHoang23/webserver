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

const PAGE_SIZE = 8;

export function CustomerAccountList() {
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
        normalizeCustomerRole(item.role).toLowerCase().includes(q) ||
        projectHit
      );
    });
  }, [accounts, projectName, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="mx-auto max-w-[1400px] p-4 font-sans sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Tài khoản khách hàng
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {accounts.length} tài khoản
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Admin (tài khoản chính) · nhánh: <strong>Chỉ xem</strong> / <strong>Xem và chỉnh sửa</strong>.
          </p>
        </div>
        {canManage ? (
          <Link
            href="/tai-khoan-khach/chi-tiet"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <span className="text-base leading-none font-bold">+</span>
            Thêm tài khoản khách
          </Link>
        ) : null}
      </div>

      <div className="relative mb-6 max-w-md">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm theo tên đăng nhập, khách hàng, dự án hoặc quyền..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 shadow-xs outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                <th className="px-5 py-3">Tài khoản khách</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Phân cấp</th>
                <th className="px-5 py-3">Dự án được gán</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((account) => {
                const role = normalizeCustomerRole(account.role);
                const managedIds =
                  account.projectIds?.length > 0
                    ? account.projectIds
                    : account.projectId
                      ? [account.projectId]
                      : [];
                return (
                  <tr key={account.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{account.username}</p>
                      <p className="text-[11px] text-slate-500">{account.displayName}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600">{account.email}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          role === "Admin"
                            ? "bg-slate-900 text-white"
                            : role === "View"
                              ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        }`}
                        title={CUSTOMER_ACCOUNT_ROLE_META[role].hint}
                      >
                        {CUSTOMER_ACCOUNT_ROLE_META[role].label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
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
                        {managedIds.length === 0 ? (
                          <span className="text-[11px] text-slate-400">Chưa gán dự án</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {canManage ? (
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/tai-khoan-khach/chi-tiet?id=${account.id}`}
                            className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                          >
                            Chi tiết
                          </Link>
                          <button
                            type="button"
                            onClick={() => setAccountToDelete(account)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                            title={`Xóa ${account.username}`}
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Chỉ xem</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-xs text-slate-400">
                    Chưa có tài khoản khách. Thêm mới và chọn Admin / Chỉ xem / Xem và chỉnh sửa.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 text-xs text-slate-500">
          <p>
            Hiển thị {filtered.length === 0 ? 0 : start + 1}-
            {Math.min(start + PAGE_SIZE, filtered.length)} / {filtered.length}
          </p>
          <div className="flex gap-1">
            <PageBtn disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
              ‹
            </PageBtn>
            <PageBtn disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
              ›
            </PageBtn>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(accountToDelete)}
        title="Xác nhận xóa tài khoản khách"
        description={`Xóa "${accountToDelete?.username}" sẽ khiến khách không đăng nhập được các dự án đã gán.`}
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

function PageBtn({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
