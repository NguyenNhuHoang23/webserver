"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { customerPassword, ensureCustomerAccount } from "@/lib/customer-accounts";
import { INITIAL_PROJECTS, loadProjects, type Project, type ProjectStatus } from "@/lib/projects";

const statusMeta: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  active: {
    label: "HOẠT ĐỘNG",
    className: "bg-emerald-50 text-emerald-700",
  },
  maintenance: {
    label: "BẢO TRÌ",
    className: "bg-orange-50 text-orange-600",
  },
  paused: {
    label: "TẠM DỪNG",
    className: "bg-slate-100 text-slate-500",
  },
};

const PAGE_SIZE = 10;

export function ProjectList() {
  const [items, setItems] = useState<Project[]>(INITIAL_PROJECTS);
  const [customer, setCustomer] = useState("all");
  const [status, setStatus] = useState<"all" | ProjectStatus>("all");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState("");

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
      return matchCustomer && matchStatus;
    });
  }, [customer, status, items]);

  const activeCount = items.filter((p) => p.status === "active").length;
  const maintenanceCount = items.filter((p) => p.status === "maintenance").length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="relative mx-auto max-w-[1400px] p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Quản lý Dự án
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Giám sát và quản lý hạ tầng năng lượng toàn hệ thống.
          </p>
        </div>
        <Link
          href="/tao-du-an"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#1a73e8] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#1666d0]"
        >
          <span className="text-lg leading-none">+</span>
          Tạo Dự Án Mới
        </Link>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard
          label="TỔNG SỐ DỰ ÁN"
          value={String(items.length).padStart(2, "0")}
          hint={
            <span className="text-emerald-600">+12% so với tháng trước</span>
          }
          icon={<FolderIcon className="h-5 w-5" />}
          iconWrap="bg-blue-50 text-[#1a73e8]"
        />
        <StatCard
          label="DỰ ÁN ĐANG HOẠT ĐỘNG"
          value={String(activeCount).padStart(2, "0")}
          hint={
            <span className="text-emerald-600">
              ● {items.length ? `${((activeCount / items.length) * 100).toFixed(1)}% Hiệu suất vận hành` : "Chưa có dữ liệu"}
            </span>
          }
          icon={<BoltIcon className="h-5 w-5" />}
          iconWrap="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="DỰ ÁN CẦN BẢO TRÌ"
          value={String(maintenanceCount).padStart(2, "0")}
          valueClass="text-red-500"
          hint={<span className="text-red-500">Cần kiểm tra thiết bị ngay</span>}
          icon={<WarningIcon className="h-5 w-5" />}
          iconWrap="bg-red-50 text-red-500"
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
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
          <div className="flex items-center gap-1 text-slate-400">
            <ToolbarButton label="Tải xuống">
              <DownloadIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton label="In">
              <PrintIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton label="Dạng danh sách" active>
              <ListIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton label="Dạng lưới">
              <GridIcon className="h-4 w-4" />
            </ToolbarButton>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wide text-slate-400">
                <th className="px-5 py-3">TÊN DỰ ÁN (MÃ)</th>
                <th className="px-5 py-3">KHÁCH HÀNG</th>
                <th className="px-5 py-3">TRẠNG THÁI</th>
                <th className="px-5 py-3">NGÀY BẮT ĐẦU</th>
                <th className="px-5 py-3 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: project.accent }}
                      >
                        {project.initials}
                      </span>
                      <span>
                        <span className="block font-semibold text-slate-800">
                          {project.name}
                        </span>
                        <span className="block text-xs text-slate-400">
                          {project.id}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {project.customer}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusMeta[project.status].className}`}
                    >
                      {statusMeta[project.status].label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {project.startDate}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/du-an/${project.id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-[#1a73e8] hover:bg-blue-50"
                        aria-label="Xem dự án"
                        title="Xem dự án khách hàng"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => copyCustomerInvite(project, setCopiedId)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                        aria-label="Sao chép link khách hàng"
                        title={copiedId === project.id ? "Đã sao chép" : "Sao chép link và tài khoản khách hàng"}
                      >
                        <LinkIcon className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/chinh-sua-du-an/${project.id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                        aria-label="Sửa dự án"
                      >
                        <EditIcon className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm text-slate-500">
          <p>
            Hiển thị {filtered.length === 0 ? 0 : start + 1}-
            {Math.min(start + PAGE_SIZE, filtered.length)} của {filtered.length}{" "}
            dự án
          </p>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
          />
        </div>
      </section>

      <Link
        href="/tao-du-an"
        className="fixed bottom-20 right-8 z-10 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a73e8] text-white shadow-lg shadow-blue-500/30 hover:bg-[#1666d0]"
        aria-label="Tạo nhanh"
      >
        <BoltIcon className="h-5 w-5" />
      </Link>

      {copiedId ? (
        <p className="fixed right-8 bottom-36 z-10 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg">
          Đã sao chép link và tài khoản khách hàng
        </p>
      ) : null}
    </div>
  );
}

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
    window.setTimeout(() => setCopiedId(""), 2200);
  });
}

function StatCard({
  label,
  value,
  hint,
  icon,
  iconWrap,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string;
  hint: ReactNode;
  icon: ReactNode;
  iconWrap: string;
  valueClass?: string;
}) {
  return (
    <article className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div>
        <p className="text-[11px] font-semibold tracking-wide text-slate-400">
          {label}
        </p>
        <p className={`mt-2 text-3xl font-bold tracking-tight ${valueClass}`}>
          {value}
        </p>
        <p className="mt-2 text-xs font-medium">{hint}</p>
      </div>
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconWrap}`}
      >
        {icon}
      </span>
    </article>
  );
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
        className="h-9 appearance-none rounded-lg border border-slate-200 bg-white py-0 pr-8 pl-3 text-sm text-slate-600 outline-none focus:border-[#1a73e8]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400">
        ▾
      </span>
    </div>
  );
}

function ToolbarButton({
  children,
  label,
  active = false,
}: {
  children: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-md ${
        active ? "bg-slate-100 text-slate-700" : "hover:bg-slate-100 hover:text-slate-600"
      }`}
    >
      {children}
    </button>
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
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40"
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
            className={`h-8 min-w-8 rounded-md px-2 text-sm font-medium ${
              item === page
                ? "bg-[#1a73e8] text-white"
                : "text-slate-600 hover:bg-slate-100"
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
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40"
      >
        ›
      </button>
    </div>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7.5A1.5 1.5 0 0 1 5.5 6H10l2 2h6.5A1.5 1.5 0 0 1 20 9.5v8A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-10Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 4.5 13.5h6.2L9.2 22 19.5 10h-6.2L13 2Z" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4 3.5 19h17L12 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 10v5M12 17.5v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4v10M8 10l4 4 4-4M5 18h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PrintIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 8V4h10v4M7 16H5a2 2 0 0 1-2-2v-4h18v4a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="7" y="14" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5.93"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M14 11a5 5 0 0 0-7.07 0L5.52 12.41a5 5 0 0 0 7.07 7.07L14 18.07"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 15.5 15 9l1.5 1.5-6.5 6.5H8.5v-1.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
