"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ACCOUNT_ROLES,
  hydrateAccounts,
  loadAccounts,
  todayLabel,
  upsertAccount,
  type Account,
  type AccountRole,
} from "@/lib/accounts";
import { DEFAULT_PASSWORD } from "@/lib/auth";

export function AddAccountForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("id");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AccountRole>("Kỹ sư vận hành");
  const [password, setPassword] = useState("");
  const [createdAt, setCreatedAt] = useState(todayLabel());
  const [isEdit, setIsEdit] = useState(false);
  const [existing, setExisting] = useState<Account | null>(null);

  useEffect(() => {
    if (!editingId) {
      setIsEdit(false);
      setExisting(null);
      return;
    }
    let active = true;
    void hydrateAccounts().then((accounts) => {
      if (!active) return;
      const found = accounts.find((item) => item.id === editingId);
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
      setCreatedAt(found.createdAt);
      setPassword("");
    });
    return () => {
      active = false;
    };
  }, [editingId]);

  function handleSubmit() {
    const name = username.trim();
    const mail = email.trim();
    if (!name || !mail) return;

    upsertAccount({
      id: editingId && isEdit ? editingId : `acc-${Date.now()}`,
      username: name,
      email: mail,
      role,
      createdAt: isEdit ? createdAt : todayLabel(),
      password: password.trim() || existing?.password || DEFAULT_PASSWORD,
    });
    router.push("/tai-khoan");
  }

  return (
    <div className="mx-auto max-w-[980px] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isEdit ? "Cập nhật tài khoản" : "Thêm tài khoản"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Quản lý các tài khoản đăng nhập hệ thống</p>
      </div>

      <form
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="mb-6">
          <h2 className="text-[15px] font-semibold text-slate-800">
            {isEdit ? "Thông tin tài khoản" : "Thêm tài khoản mới"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Nhập thông tin đăng nhập và vai trò truy cập cho người dùng.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="TÊN NGƯỜI DÙNG">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ví dụ: kisu_vanhanh"
              className="input"
              required
            />
          </Field>
          <Field label="EMAIL">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ví dụ: operator01@sunergy.com"
              className="input"
              required
            />
          </Field>
          <Field label="VAI TRÒ">
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AccountRole)}
                className="input appearance-none pr-9"
              >
                {ACCOUNT_ROLES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <ChevronIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
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

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Link
            href="/tai-khoan"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
          >
            Quay lại danh sách
          </Link>
          <button
            type="submit"
            className="h-10 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
          >
            {isEdit ? "Cập nhật tài khoản" : "Lưu tài khoản"}
          </button>
        </div>
      </form>

      <div className="mt-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm text-slate-700">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white shadow-xs">
          i
        </span>
        <p>
          <span className="font-semibold text-emerald-900">Mẹo:</span> Chỉ cấp quyền Quản trị viên cho người vận
          hành hệ thống. Kỹ sư vận hành chỉ nên được phép theo dõi điểm đo và cảnh báo.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 10l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
