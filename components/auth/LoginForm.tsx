"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  DEFAULT_PASSWORD,
  homePathFor,
  isAuthPath,
  loginAdmin,
  loginCustomer,
  type AuthPortal,
} from "@/lib/auth";
import { customerPassword, getCustomerAccountForProject } from "@/lib/customer-accounts";
import { loadProjects, type Project } from "@/lib/projects";

export function LoginForm({
  portal,
  projectId,
}: {
  portal: AuthPortal;
  projectId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [project, setProject] = useState<Project | undefined>();
  const [demoUser, setDemoUser] = useState(portal === "admin" ? "admin_system" : "khachhang");
  const [demoPassword, setDemoPassword] = useState(DEFAULT_PASSWORD);

  useEffect(() => {
    if (portal !== "customer" || !projectId) return;
    const found = loadProjects().find((item) => item.id === projectId);
    setProject(found);
    const account = getCustomerAccountForProject(projectId);
    if (account) {
      setDemoUser(account.username);
      setDemoPassword(customerPassword(account));
    }
  }, [portal, projectId]);

  const title = portal === "admin" ? "Đăng nhập quản trị viên" : "Đăng nhập khách hàng";
  const subtitle =
    portal === "admin"
      ? "Truy cập bảng điều khiển vận hành hệ thống EMS."
      : project
        ? `Dùng tài khoản được cấp để xem dự án ${project.name}.`
        : "Dùng tài khoản được cấp cho dự án của bạn.";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const result =
      portal === "admin"
        ? loginAdmin(identifier, password)
        : loginCustomer(identifier, password, projectId);

    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }

    if (isAuthPath(pathname)) {
      router.replace(homePathFor(result.session));
      return;
    }

    setSubmitting(false);
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-[#eef2f7] px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a73e8] text-white">
            <FactoryIcon className="h-7 w-7" />
          </div>
          <p className="text-lg font-bold tracking-tight text-[#1a5fbe]">EMS Console</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          {project ? (
            <p className="mt-2 text-xs font-medium tracking-wide text-slate-400">{project.id}</p>
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(16,24,40,0.06)]"
        >
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500">
              TÀI KHOẢN HOẶC EMAIL
            </span>
            <input
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError("");
              }}
              placeholder={demoUser}
              className="input"
              autoComplete="username"
              required
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500">MẬT KHẨU</span>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Nhập mật khẩu"
              className="input"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <p className="mt-3 text-sm font-medium text-red-500">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 h-10 w-full rounded-lg bg-[#1a73e8] text-sm font-medium text-white shadow-sm hover:bg-[#1666d0] disabled:opacity-70"
          >
            Đăng nhập
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-[#c5daf7] bg-[#f3f8ff] px-4 py-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-700">Tài khoản dùng thử</p>
          <p className="mt-1">
            Tài khoản: <span className="font-medium text-slate-800">{demoUser}</span>
          </p>
          <p>
            Mật khẩu: <span className="font-medium text-slate-800">{demoPassword}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function FactoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M4 28V12l7-3v4l6-4v5l7-3v17H4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M20 12h8v16h-8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
