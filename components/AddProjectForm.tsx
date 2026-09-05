"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  formatProjectDate,
  INITIAL_PROJECTS,
  nextProjectId,
  projectAccent,
  projectInitials,
  upsertProject,
  type AlertRecipient,
  type MeterType,
  type ProjectStatus,
} from "@/lib/projects";

const METER_META: { id: MeterType; hint: string; icon: "bolt" | "drop" | "thermo" | "steam" }[] = [
  { id: "Điện", hint: "Điện năng, công suất, chất lượng điện", icon: "bolt" },
  { id: "Nước", hint: "Lưu lượng và sản lượng nước", icon: "drop" },
  { id: "Nhiệt", hint: "Nhiệt độ và năng lượng nhiệt", icon: "thermo" },
  { id: "Hơi", hint: "Áp suất và lưu lượng hơi", icon: "steam" },
];

function nextRecipient(): AlertRecipient {
  return { id: `rcpt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: "", email: "", phone: "" };
}

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function AddProjectForm() {
  const router = useRouter();

  const [code, setCode] = useState(() => nextProjectId(INITIAL_PROJECTS));
  const [name, setName] = useState("");
  const [customer, setCustomer] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState(todayIso);
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [meterTypes, setMeterTypes] = useState<MeterType[]>(["Điện"]);
  const [recipients, setRecipients] = useState<AlertRecipient[]>([
    { id: "rcpt-new", name: "", email: "", phone: "" },
  ]);
  const [error, setError] = useState("");

  useEffect(() => {
    setCode(nextProjectId());
  }, []);

  function toggleMeter(type: MeterType) {
    setMeterTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  }

  function updateRecipient(id: string, patch: Partial<AlertRecipient>) {
    setRecipients((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function handleSubmit() {
    const projectName = name.trim();
    const customerName = customer.trim();
    const projectCode = code.trim().toUpperCase() || nextProjectId();

    if (!projectName || !customerName) {
      setError("Vui lòng nhập tên dự án và tên khách hàng.");
      return;
    }
    if (meterTypes.length === 0) {
      setError("Chọn ít nhất một loại điểm đo.");
      return;
    }

    const cleanedRecipients = recipients
      .map((item) => ({
        ...item,
        name: item.name.trim(),
        email: item.email.trim(),
        phone: item.phone.trim(),
      }))
      .filter((item) => item.name || item.email || item.phone);

    const invalid = cleanedRecipients.find(
      (item) => item.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email),
    );
    if (invalid) {
      setError("Email người nhận cảnh báo không hợp lệ.");
      return;
    }

    upsertProject({
      id: projectCode,
      name: projectName,
      customer: customerName,
      initials: projectInitials(customerName || projectName),
      accent: projectAccent(projectCode),
      status,
      startDate: formatProjectDate(startDate),
      contactName: contactName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      meterTypes,
      recipients: cleanedRecipients,
    });

    router.push("/");
  }

  return (
    <div className="mx-auto max-w-[980px] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tạo dự án mới</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cấu hình thông tin khách hàng, loại điểm đo và người nhận thông báo cảnh báo.
        </p>
      </div>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:p-8">
          <div className="mb-6">
            <h2 className="text-[15px] font-semibold text-slate-800">Thông tin khách hàng</h2>
            <p className="mt-1 text-sm text-slate-500">
              Thông tin định danh dự án và liên hệ của khách hàng sử dụng hệ thống.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="MÃ DỰ ÁN">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: PRJ-2443"
                className="input"
                required
              />
            </Field>
            <Field label="TÊN DỰ ÁN">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Sunrise Bắc Ninh Factory"
                className="input"
                required
              />
            </Field>
            <Field label="TÊN KHÁCH HÀNG">
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="VD: Sunrise Group"
                className="input"
                required
              />
            </Field>
            <Field label="NGƯỜI LIÊN HỆ">
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Họ và tên người phụ trách"
                className="input"
              />
            </Field>
            <Field label="EMAIL">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@company.com"
                className="input"
              />
            </Field>
            <Field label="SỐ ĐIỆN THOẠI">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0901 234 567"
                className="input"
              />
            </Field>
            <Field label="NGÀY BẮT ĐẦU">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
                required
              />
            </Field>
            <Field label="TRẠNG THÁI">
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="input appearance-none pr-9"
                >
                  <option value="active">Hoạt động</option>
                  <option value="maintenance">Bảo trì</option>
                  <option value="paused">Tạm dừng</option>
                </select>
                <ChevronIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </Field>
          </div>

          <div className="mt-4">
            <Field label="ĐỊA CHỈ">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Địa chỉ nhà máy / văn phòng khách hàng"
                className="input"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:p-8">
          <div className="mb-5">
            <h2 className="text-[15px] font-semibold text-slate-800">Loại điểm đo</h2>
            <p className="mt-1 text-sm text-slate-500">
              Chọn các loại năng lượng sẽ được giám sát trong dự án này.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {METER_META.map((item) => {
              const active = meterTypes.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleMeter(item.id)}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                    active
                      ? "border-[#1a73e8] bg-[#f3f8ff] ring-1 ring-[#1a73e8]/20"
                      : "border-slate-200 bg-white hover:border-[#c5daf7] hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      active ? "bg-[#1a73e8] text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <MeterTypeIcon type={item.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">{item.id}</span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          active ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-slate-300 bg-white"
                        }`}
                      >
                        {active ? <CheckIcon className="h-3 w-3" /> : null}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">{item.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:p-8">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-800">Người nhận thông báo cảnh báo</h2>
              <p className="mt-1 text-sm text-slate-500">
                Danh sách email và số điện thoại nhận cảnh báo khi hệ thống vượt ngưỡng.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRecipients((current) => [...current, nextRecipient()])}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-[#1a73e8] hover:bg-blue-50"
            >
              <span className="text-lg leading-none">+</span>
              Thêm người nhận
            </button>
          </div>

          <div className="space-y-3">
            {recipients.map((item, index) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-xl border border-slate-100 bg-[#f8fafc] p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <Field label={index === 0 ? "HỌ TÊN" : undefined}>
                  <input
                    value={item.name}
                    onChange={(e) => updateRecipient(item.id, { name: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="input"
                  />
                </Field>
                <Field label={index === 0 ? "EMAIL" : undefined}>
                  <input
                    type="email"
                    value={item.email}
                    onChange={(e) => updateRecipient(item.id, { email: e.target.value })}
                    placeholder="alert@company.com"
                    className="input"
                  />
                </Field>
                <Field label={index === 0 ? "SỐ ĐIỆN THOẠI" : undefined}>
                  <input
                    type="tel"
                    value={item.phone}
                    onChange={(e) => updateRecipient(item.id, { phone: e.target.value })}
                    placeholder="0901 234 567"
                    className="input"
                  />
                </Field>
                <div className={index === 0 ? "flex items-end" : "flex items-center"}>
                  <button
                    type="button"
                    onClick={() =>
                      setRecipients((current) =>
                        current.length === 1 ? [nextRecipient()] : current.filter((row) => row.id !== item.id),
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                    aria-label="Xóa người nhận"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {error ? <p className="text-sm font-medium text-red-500">{error}</p> : null}

        <div className="flex flex-wrap justify-end gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Hủy
          </Link>
          <button
            type="submit"
            className="h-10 rounded-lg bg-[#1a73e8] px-5 text-sm font-medium text-white shadow-sm hover:bg-[#1666d0]"
          >
            Tạo dự án
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500">{label}</span>
      ) : null}
      {children}
    </label>
  );
}

function MeterTypeIcon({
  type,
  className,
}: {
  type: "bolt" | "drop" | "thermo" | "steam";
  className?: string;
}) {
  if (type === "drop") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (type === "thermo") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M10 14.5V6.5a2 2 0 1 1 4 0v8a3.5 3.5 0 1 1-4 0Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 9v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "steam") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 17h14M7 14h10M9 11h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 8c0-2 1.5-3.5 4-3.5S16 6 16 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 4.5 13.5h6.2L9.2 22 19.5 10h-6.2L13 2Z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12.5 10 17.5 19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 7h14M9 7V5h6v2M8 7l.8 12h6.4L16 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
