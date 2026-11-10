"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { DEFAULT_PASSWORD } from "@/lib/auth";
import {
  ACCOUNT_ROLE_META,
  ACCOUNT_ROLES,
  hydrateAccounts,
  todayLabel,
  upsertAccount,
  type Account,
  type AccountRole,
} from "@/lib/accounts";
import { hasPermission } from "@/lib/permissions";

export function AddAccountForm() {
  const router = useRouter();
  const { session } = useAuth();
  const canManage = hasPermission(session, "manageUsers");
  const searchParams = useSearchParams();
  const editingId = searchParams.get("id");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AccountRole>("Nhân viên kỹ thuật");
  const [password, setPassword] = useState("");
  const [isEdit, setIsEdit] = useState(false);
  const [existing, setExisting] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
      setPassword("");
    });
    return () => {
      active = false;
    };
  }, [editingId]);

  function handleSubmit() {
    if (!canManage || saving) return;
    setError("");
    const name = username.trim();
    const mail = email.trim();
    if (!name || !mail) {
      setError("Vui lòng nhập tên đăng nhập và email.");
      return;
    }
    if (!isEdit && !password.trim()) {
      setError("Vui lòng nhập mật khẩu cho tài khoản mới.");
      return;
    }

    setSaving(true);
    void upsertAccount({
      id: editingId && isEdit ? editingId : `acc-${Date.now()}`,
      username: name,
      email: mail,
      role,
      createdAt: existing?.createdAt ?? todayLabel(),
      password: password.trim() || (isEdit ? "" : DEFAULT_PASSWORD),
    })
      .then(() => router.push("/tai-khoan"))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Không lưu được tài khoản nội bộ.");
      })
      .finally(() => setSaving(false));
  }

  if (!canManage) {
    return (
      <div className="mx-auto max-w-[640px] p-6 lg:p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Chỉ Quản trị viên được thêm hoặc sửa tài khoản nội bộ công ty.
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
    <div className="mx-auto max-w-[720px] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isEdit ? "Cập nhật tài khoản nội bộ" : "Thêm tài khoản nội bộ"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Nhân sự công ty đăng nhập cổng quản trị EMS. Tài khoản khách hàng tạo trong dự án, không dùng form này.
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
          <p className="mt-1 text-sm text-slate-500">Vai trò quyết định quyền trên cổng quản trị.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="TÊN ĐĂNG NHẬP">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ví dụ: nguyenvana"
              className="input"
              required
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
          <Field label="VAI TRÒ">
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
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{ACCOUNT_ROLE_META[role].hint}</p>
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
