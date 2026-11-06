"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { DEFAULT_PASSWORD } from "@/lib/auth";
import {
  hydrateCustomerAccounts,
  normalizeProjectIds,
  upsertCustomerAccount,
  type CustomerAccount,
} from "@/lib/customer-accounts";
import { hasPermission } from "@/lib/permissions";
import { hydrateProjects, type Project } from "@/lib/projects";

export function AddAccountForm() {
  const router = useRouter();
  const { session } = useAuth();
  const canManage = hasPermission(session, "manageUsers");
  const searchParams = useSearchParams();
  const editingId = searchParams.get("id");

  const [projects, setProjects] = useState<Project[]>([]);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [primaryProjectId, setPrimaryProjectId] = useState("");
  const [password, setPassword] = useState("");
  const [isEdit, setIsEdit] = useState(false);
  const [existing, setExisting] = useState<CustomerAccount | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void hydrateProjects().then((projectRows) => {
      if (active) setProjects(projectRows);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!editingId) {
      setIsEdit(false);
      setExisting(null);
      return;
    }
    let active = true;
    void hydrateCustomerAccounts().then((rows) => {
      if (!active) return;
      const found = rows.find((item) => item.id === editingId);
      if (!found) {
        setIsEdit(false);
        setExisting(null);
        return;
      }
      const normalized = normalizeProjectIds(found.projectId, found.projectIds);
      setIsEdit(true);
      setExisting(found);
      setUsername(found.username);
      setEmail(found.email);
      setDisplayName(found.displayName);
      setProjectIds(normalized.projectIds);
      setPrimaryProjectId(normalized.projectId);
      setPassword("");
    });
    return () => {
      active = false;
    };
  }, [editingId]);

  function toggleProject(projectId: string) {
    setProjectIds((list) => {
      const next = list.includes(projectId) ? list.filter((id) => id !== projectId) : [...list, projectId];
      setPrimaryProjectId((current) => {
        if (next.includes(current)) return current;
        return next[0] ?? "";
      });
      return next;
    });
  }

  function handleSubmit() {
    if (!canManage) return;
    setError("");
    const name = username.trim();
    const mail = email.trim();
    const display = displayName.trim() || name;
    const normalized = normalizeProjectIds(primaryProjectId, projectIds);
    if (!name || !mail) {
      setError("Vui lòng nhập tên đăng nhập và email.");
      return;
    }
    if (!normalized.projectIds.length) {
      setError("Chọn ít nhất một dự án gắn với Admin khách hàng này.");
      return;
    }
    if (!isEdit && !password.trim()) {
      setError("Vui lòng nhập mật khẩu cho tài khoản mới.");
      return;
    }

    void upsertCustomerAccount({
      id: editingId && isEdit ? editingId : `cus-${Date.now()}`,
      username: name,
      email: mail,
      displayName: display,
      role: "Admin",
      projectId: normalized.projectId,
      projectIds: normalized.projectIds,
      password: password.trim() || existing?.password || DEFAULT_PASSWORD,
    })
      .then(() => router.push("/tai-khoan"))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Không lưu được tài khoản Admin.");
      });
  }

  if (!canManage) {
    return (
      <div className="mx-auto max-w-[640px] p-6 lg:p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Chỉ Quản trị viên được thêm hoặc sửa tài khoản Admin khách hàng.
          <div className="mt-4">
            <Link href="/" className="font-semibold text-emerald-700 hover:underline">
              Về danh sách dự án
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[980px] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isEdit ? "Cập nhật tài khoản Admin" : "Thêm tài khoản Admin khách hàng"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          EMS chỉ tạo Admin ban đầu. Sau đó Admin khách tự tạo tài khoản nhánh (chỉ xem / xem & chỉnh sửa) trong Cấu
          hình → Quản lý tài khoản.
        </p>
      </div>

      <form
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="mb-6">
          <h2 className="text-[15px] font-semibold text-slate-800">Thông tin đăng nhập Admin</h2>
          <p className="mt-1 text-sm text-slate-500">
            Gắn các dự án thuộc khách hàng này. Admin dùng các dự án đó làm phạm vi quản lý tài khoản nhánh.
          </p>
        </div>

        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
          <p className="text-[13px] font-semibold text-slate-900">Phân cấp: Admin</p>
          <p className="mt-1 text-[12px] leading-5 text-slate-500">
            Toàn quyền cấu hình và quản lý tài khoản nhánh. Tài khoản truy cập (Chỉ xem / Xem & chỉnh sửa) do Admin tạo
            sau trên cổng khách hàng.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="TÊN ĐĂNG NHẬP">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ví dụ: admin_khach_a"
              className="input"
              required
            />
          </Field>
          <Field label="EMAIL">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ví dụ: admin@customer.com"
              className="input"
              required
            />
          </Field>
          <Field label="TÊN HIỂN THỊ">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ví dụ: Admin Khách A"
              className="input"
            />
          </Field>
          <Field label={isEdit ? "MẬT KHẨU MỚI (TÙY CHỌN)" : "MẬT KHẨU"}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? "Để trống nếu giữ mật khẩu hiện tại" : "Nhập mật khẩu"}
              className="input"
              required={!isEdit}
            />
          </Field>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-slate-500">DỰ ÁN CỦA KHÁCH HÀNG</p>
              <p className="mt-0.5 text-[12px] text-slate-500">
                Đã chọn {projectIds.length}/{projects.length} dự án
              </p>
            </div>
            {projectIds.length > 0 ? (
              <label className="flex items-center gap-2 text-[12px] text-slate-600">
                <span>Dự án chính</span>
                <select
                  value={primaryProjectId}
                  onChange={(e) => setPrimaryProjectId(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] outline-none focus:border-emerald-500"
                >
                  {projectIds.map((id) => {
                    const project = projects.find((item) => item.id === id);
                    return (
                      <option key={id} value={id}>
                        {project?.name ?? id}
                      </option>
                    );
                  })}
                </select>
              </label>
            ) : null}
          </div>

          <div className="max-h-[320px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            {projects.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-slate-400">Chưa có dự án nào để gán.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {projects.map((project) => {
                  const checked = projectIds.includes(project.id);
                  return (
                    <li key={project.id}>
                      <label
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                          checked
                            ? "border-emerald-300 bg-emerald-50/80"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProject(project.id)}
                          className="mt-1 accent-emerald-600"
                        />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-slate-800">{project.name}</span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">
                            {project.customer} · {project.id}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Link
            href="/tai-khoan"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-xs transition-colors hover:bg-slate-50"
          >
            Quay lại danh sách
          </Link>
          <button
            type="submit"
            className="h-10 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
          >
            {isEdit ? "Cập nhật Admin" : "Lưu tài khoản Admin"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}
