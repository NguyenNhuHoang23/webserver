"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { DEFAULT_PASSWORD } from "@/lib/auth";
import {
  ACCOUNT_ROLE_META,
  ACCOUNT_ROLES,
  hydrateAccounts,
  normalizeAccountProjectIds,
  todayLabel,
  upsertAccount,
  type Account,
  type AccountRole,
} from "@/lib/accounts";
import { hasPermission } from "@/lib/permissions";
import { hydrateProjects, type Project } from "@/lib/projects";

export function AddAccountForm() {
  const router = useRouter();
  const { session } = useAuth();
  const canManage = hasPermission(session, "manageUsers");
  const searchParams = useSearchParams();
  const editingId = searchParams.get("id");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AccountRole>("Manage");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isEdit, setIsEdit] = useState(false);
  const [existing, setExisting] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isSelf = Boolean(isEdit && editingId && session?.userId === editingId);
  /** Chỉ cấp trên (Admin) được phân quyền cho cấp dưới — không tự phân quyền cho mình. */
  const canAssignRole = canManage && !isSelf;
  /** Admin đổi mk cấp dưới: 1 ô tùy chọn. Tự đổi mk: mk cũ + mk mới + xác nhận. */
  const isAdminResettingOther = canManage && isEdit && !isSelf;
  const isSelfPasswordChange = isEdit && isSelf;
  const canAccessForm = canManage || (isEdit && isSelf) || (!editingId && canManage);

  useEffect(() => {
    let active = true;
    void hydrateProjects().then((rows) => {
      if (active) setProjects(rows);
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
    void hydrateAccounts().then((rows) => {
      if (!active) return;
      const found = rows.find((item) => item.id === editingId);
      if (!found) {
        setIsEdit(false);
        setExisting(null);
        return;
      }
      setIsEdit(true);
      setExisting(found);
      setUsername(found.username);
      setEmail(found.email);
      setRole(found.role);
      setProjectIds(found.projectIds ?? []);
      setPassword("");
      setCurrentPassword("");
      setConfirmPassword("");
    });
    return () => {
      active = false;
    };
  }, [editingId]);

  const lockedRole = useMemo(() => existing?.role ?? role, [existing, role]);

  function toggleProject(id: string) {
    setProjectIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function handleSubmit() {
    if (saving) return;
    if (!canManage && !isSelf) return;
    if (!canManage && !isEdit) return;

    setError("");
    const name = username.trim();
    const mail = email.trim();
    if (!name || !mail) {
      setError("Vui lòng nhập tên đăng nhập và email.");
      return;
    }

    const effectiveRole = canAssignRole ? role : lockedRole;
    const assigned = normalizeAccountProjectIds(effectiveRole, isSelf ? existing?.projectIds : projectIds);

    if (!isEdit && !password.trim()) {
      setError("Vui lòng nhập mật khẩu cho tài khoản mới.");
      return;
    }

    if (isSelfPasswordChange) {
      const next = password.trim();
      const confirm = confirmPassword.trim();
      const current = currentPassword.trim();
      if (next || confirm || current) {
        if (!current) {
          setError("Vui lòng nhập mật khẩu hiện tại.");
          return;
        }
        if (!next) {
          setError("Vui lòng nhập mật khẩu mới.");
          return;
        }
        if (next !== confirm) {
          setError("Xác nhận mật khẩu mới không khớp.");
          return;
        }
      }
    }

    if (effectiveRole === "Manage" && !assigned.length && canManage && !isSelf) {
      setError("Tài khoản Manage cần chọn ít nhất một dự án được gán quyền.");
      return;
    }

    const passwordPayload = isSelfPasswordChange
      ? password.trim()
      : isAdminResettingOther
        ? password.trim()
        : password.trim() || (isEdit ? "" : DEFAULT_PASSWORD);

    setSaving(true);
    void upsertAccount({
      id: editingId && isEdit ? editingId : `acc-${Date.now()}`,
      username: name,
      email: mail,
      role: effectiveRole,
      projectIds: assigned,
      createdAt: existing?.createdAt ?? todayLabel(),
      password: passwordPayload,
      ...(isSelfPasswordChange && password.trim()
        ? { currentPassword: currentPassword.trim() }
        : {}),
    })
      .then(() => router.push("/tai-khoan"))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Không lưu được tài khoản nội bộ.");
      })
      .finally(() => setSaving(false));
  }

  if (editingId && session && !canManage && session.userId !== editingId) {
    return (
      <div className="mx-auto max-w-[640px] p-6 lg:p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Bạn chỉ được cập nhật tài khoản của chính mình. Phân quyền do cấp trên thực hiện.
          <div className="mt-4">
            <Link href="/tai-khoan" className="font-semibold text-emerald-700 hover:underline">
              Về danh sách tài khoản
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!canAccessForm && !editingId) {
    return (
      <div className="mx-auto max-w-[640px] p-6 lg:p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Chỉ Admin được thêm tài khoản nội bộ công ty.
          <div className="mt-4">
            <Link href="/tai-khoan" className="font-semibold text-emerald-700 hover:underline">
              Về danh sách tài khoản
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[820px] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isEdit ? (isSelf ? "Cập nhật tài khoản của tôi" : "Cập nhật tài khoản nội bộ") : "Thêm tài khoản nội bộ"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Nhân sự công ty đăng nhập cổng quản trị. Chỉ 2 phân cấp: Admin (mọi dự án) và Manage (dự án được gán).
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
          <h2 className="text-[15px] font-semibold text-slate-800">Thông tin đăng nhập</h2>
          <p className="mt-1 text-sm text-slate-500">
            {isSelf
              ? "Không thể tự phân quyền cho mình. Đổi mật khẩu cần nhập mật khẩu cũ và xác nhận mật khẩu mới."
              : "Phân cấp do cấp trên gán cho cấp dưới. Admin có thể đặt mật khẩu mới cho cấp dưới."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="TÊN ĐĂNG NHẬP">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ví dụ: nguyenvana"
              className="input"
              required
              readOnly={isSelf && !canManage}
            />
          </Field>
          <Field label="EMAIL">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ví dụ: a.nguyen@congty.com"
              className="input"
              required
            />
          </Field>

          {canAssignRole ? (
            <Field label="PHÂN CẤP QUYỀN">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AccountRole)}
                className="input"
              >
                {ACCOUNT_ROLES.map((item) => (
                  <option key={item} value={item}>
                    {ACCOUNT_ROLE_META[item].label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                {ACCOUNT_ROLE_META[role].hint}
              </p>
            </Field>
          ) : (
            <Field label="PHÂN CẤP QUYỀN">
              <div className="input flex items-center bg-slate-50 font-semibold text-slate-700">
                {ACCOUNT_ROLE_META[lockedRole].label}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                {isSelf
                  ? "Không thể tự phân quyền cho mình — chỉ cấp trên được gán."
                  : ACCOUNT_ROLE_META[lockedRole].hint}
              </p>
            </Field>
          )}

          {!isEdit ? (
            <Field label="MẬT KHẨU">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="input"
                required
              />
            </Field>
          ) : isAdminResettingOther ? (
            <Field label="MẬT KHẨU MỚI (TÙY CHỌN)">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Để trống nếu giữ mật khẩu hiện tại"
                className="input"
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                Admin có thể đặt mật khẩu mới trực tiếp cho cấp dưới.
              </p>
            </Field>
          ) : null}
        </div>

        {isSelfPasswordChange ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="MẬT KHẨU HIỆN TẠI">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu cũ"
                className="input"
                autoComplete="current-password"
              />
            </Field>
            <Field label="MẬT KHẨU MỚI">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                className="input"
                autoComplete="new-password"
              />
            </Field>
            <Field label="XÁC NHẬN MẬT KHẨU MỚI">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="input"
                autoComplete="new-password"
              />
            </Field>
          </div>
        ) : null}

        {canManage && !isSelf && (canAssignRole ? role : lockedRole) === "Manage" ? (
          <div className="mt-6">
            <div className="mb-2">
              <p className="text-[11px] font-semibold tracking-wide text-slate-500">DỰ ÁN ĐƯỢC GÁN QUYỀN</p>
              <p className="mt-0.5 text-[12px] text-slate-500">
                Đã chọn {projectIds.length}/{projects.length} dự án · Manage chỉ truy cập các dự án được tích
              </p>
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
        ) : canManage && !isSelf && (canAssignRole ? role : lockedRole) === "Admin" ? (
          <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-600">
            Admin có toàn quyền trên <strong>tất cả dự án</strong> — không cần chọn danh sách gán.
          </p>
        ) : isSelf ? (
          <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-600">
            {lockedRole === "Admin"
              ? "Tài khoản Admin — toàn quyền mọi dự án."
              : `Dự án được gán: ${(existing?.projectIds ?? []).length ? (existing?.projectIds ?? []).join(", ") : "chưa có"} (do cấp trên quản lý).`}
          </p>
        ) : null}

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
            disabled={saving}
            className="h-10 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : isEdit ? "Cập nhật tài khoản" : "Lưu tài khoản"}
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
