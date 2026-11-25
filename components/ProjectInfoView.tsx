"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { hasPermission } from "@/lib/permissions";
import {
  ALERT_CHANNEL_OPTIONS,
  formatProjectDate,
  resolveMeterTypes,
  type Project,
  type ProjectStatus,
} from "@/lib/projects";

const STATUS_META: Record<ProjectStatus, { label: string; pill: string }> = {
  active: { label: "Hoạt động", pill: "bg-emerald-50 text-emerald-700 border-emerald-200/80" },
  maintenance: { label: "Bảo trì", pill: "bg-amber-50 text-amber-700 border-amber-200/80" },
  paused: { label: "Tạm dừng", pill: "bg-slate-100 text-slate-600 border-slate-200" },
};

export function ProjectInfoView({ project }: { project: Project }) {
  const { session } = useAuth();
  const canEdit = hasPermission(session, "manageProjects");
  const meterTypes = resolveMeterTypes(project);
  const recipients = project.recipients ?? [];
  const history = project.managerHistory ?? [];
  const pending = project.pendingManagerTransfer ?? null;
  const status = STATUS_META[project.status] ?? STATUS_META.active;

  return (
    <div className="mx-auto max-w-[980px] p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Thông tin dự án</h1>
          <p className="mt-1 text-sm text-slate-500">
            {project.name} · {project.id}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
          >
            Danh sách dự án
          </Link>
          {canEdit ? (
            <Link
              href={`/sua-du-an/${encodeURIComponent(project.id)}/chinh-sua`}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <EditIcon className="h-4 w-4" />
              Chỉnh sửa
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-5">
        <Card title="Thông tin khách hàng">
          <div className="mb-5 flex items-center gap-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl text-base font-bold text-white shadow-xs"
              style={{ backgroundColor: project.accent || "#059669" }}
            >
              {project.logoUrl ? (
                <img src={project.logoUrl} alt={`Logo ${project.name}`} className="h-full w-full bg-white object-contain" />
              ) : (
                project.initials
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-900">{project.name}</p>
              <span
                className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${status.pill}`}
              >
                {status.label}
              </span>
            </div>
          </div>

          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <InfoField label="Mã dự án" value={project.id} mono />
            <InfoField label="Tên dự án" value={project.name} />
            <InfoField label="Người quản lý dự án" value={project.contactName || "Chưa gán"} />
            <InfoField label="Email" value={project.email || "—"} />
            <InfoField label="Số điện thoại" value={project.phone || "—"} />
            <InfoField
              label="Ngày bắt đầu"
              value={project.startDate ? formatProjectDate(project.startDate) : "—"}
            />
            <InfoField label="Địa chỉ" value={project.address || "—"} className="sm:col-span-2" />
          </dl>
        </Card>

        <Card title="Loại điểm đo">
          {meterTypes.length ? (
            <div className="flex flex-wrap gap-2">
              {meterTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200"
                >
                  {type}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Chưa cấu hình loại điểm đo.</p>
          )}
        </Card>

        <Card title="Người nhận thông báo cảnh báo">
          {recipients.length ? (
            <ul className="divide-y divide-slate-100">
              {recipients.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{item.name || "Chưa đặt tên"}</p>
                    <p className="truncate text-xs text-slate-500">
                      {[item.email, item.phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.channels.map((channel) => (
                      <span
                        key={channel}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                      >
                        {ALERT_CHANNEL_OPTIONS.find((option) => option.id === channel)?.label ?? channel}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Chưa có người nhận thông báo.</p>
          )}
        </Card>

        <Card title="Quản lý dự án">
          {pending ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
              Đã hẹn chuyển giao:{" "}
              <span className="font-semibold">{pending.fromUsername || project.contactName || "—"}</span>
              {" → "}
              <span className="font-semibold">{pending.toUsername}</span>
              {" vào "}
              <span className="font-semibold">{formatProjectDate(pending.transferDate)}</span>
            </div>
          ) : null}

          {history.length ? (
            <ul className="space-y-2">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-slate-700"
                >
                  <span>
                    {entry.fromUsername ? (
                      <>
                        <span className="font-medium">{entry.fromUsername}</span>
                        {" → "}
                        <span className="font-medium">{entry.toUsername}</span>
                      </>
                    ) : (
                      <>
                        Gán <span className="font-medium">{entry.toUsername}</span>
                      </>
                    )}
                    {!entry.appliedAt ? (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        Chờ ngày
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatProjectDate(entry.transferDate)}
                    {entry.appliedAt ? ` · áp dụng ${entry.appliedAt}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Chưa có lịch sử chuyển giao quản lý.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
      <h2 className="mb-4 text-[15px] font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

function InfoField({
  label,
  value,
  mono = false,
  className = "",
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{label}</dt>
      <dd className={`mt-1.5 text-sm text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
