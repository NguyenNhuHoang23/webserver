"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  formatProjectDate,
  hydrateProjects,
  INITIAL_PROJECTS,
  nextProjectId,
  projectAccent,
  projectInitials,
  resolveMeterTypes,
  upsertProject,
  type AlertRecipient,
  type MeterType,
  type Project,
  type ProjectStatus,
} from "@/lib/projects";
import { ensureCustomerAccount } from "@/lib/customer-accounts";
import {
  loadMeterTypeDefs,
  hydrateMeterTypeDefs,
  removeMeterTypeDef,
  upsertMeterTypeDef,
  type MeterTypeDef,
  type MeterTypeIconId,
} from "@/lib/meter-types";

function nextRecipient(): AlertRecipient {
  return { id: `rcpt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: "", email: "", phone: "" };
}

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function toInputDate(value?: string) {
  if (!value) return todayIso();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : todayIso();
}

export function AddProjectForm({ initialProject }: { initialProject?: Project }) {
  const router = useRouter();

  const [code, setCode] = useState(() => initialProject?.id ?? nextProjectId(INITIAL_PROJECTS));
  const [name, setName] = useState(() => initialProject?.name ?? "");
  const [customer, setCustomer] = useState(() => initialProject?.customer ?? "");
  const [contactName, setContactName] = useState(() => initialProject?.contactName ?? "");
  const [email, setEmail] = useState(() => initialProject?.email ?? "");
  const [phone, setPhone] = useState(() => initialProject?.phone ?? "");
  const [address, setAddress] = useState(() => initialProject?.address ?? "");
  const [logoUrl, setLogoUrl] = useState(() => initialProject?.logoUrl ?? "");
  const [startDate, setStartDate] = useState(() => toInputDate(initialProject?.startDate));
  const [status, setStatus] = useState<ProjectStatus>(() => initialProject?.status ?? "active");
  const [meterTypes, setMeterTypes] = useState<MeterType[]>(() =>
    initialProject ? resolveMeterTypes(initialProject) : ["Điện"],
  );
  const [meterCatalog, setMeterCatalog] = useState<MeterTypeDef[]>(loadMeterTypeDefs);
  const [meterEditor, setMeterEditor] = useState<"add" | string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [meterError, setMeterError] = useState("");
  const [recipients, setRecipients] = useState<AlertRecipient[]>(() =>
    initialProject?.recipients?.length
      ? initialProject.recipients
      : [{ id: "rcpt-new", name: "", email: "", phone: "" }],
  );
  const [error, setError] = useState("");
  const [meterTypeToDelete, setMeterTypeToDelete] = useState<MeterTypeDef | null>(null);
  const [recipientToDelete, setRecipientToDelete] = useState<AlertRecipient | null>(null);

  function handleLogoChange(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Logo phải là một tệp hình ảnh.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo không được vượt quá 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoUrl(reader.result);
        setError("");
      }
    };
    reader.onerror = () => setError("Không thể đọc tệp logo.");
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    void Promise.all([hydrateProjects(), hydrateMeterTypeDefs()]).then(([projects, meterTypes]) => {
      if (!initialProject) setCode(nextProjectId(projects));
      setMeterCatalog(meterTypes);
    });
  }, []);

  function toggleMeter(type: MeterType) {
    setMeterTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  }

  function openAddMeterType() {
    setMeterEditor("add");
    setDraftName("");
    setDraftDescription("");
    setMeterError("");
  }

  function openEditMeterType(item: MeterTypeDef) {
    setMeterEditor(item.name);
    setDraftName(item.name);
    setDraftDescription(item.description);
    setMeterError("");
  }

  function cancelMeterEditor() {
    setMeterEditor(null);
    setDraftName("");
    setDraftDescription("");
    setMeterError("");
  }

  function saveMeterType() {
    try {
      const previous = meterEditor === "add" ? undefined : meterEditor ?? undefined;
      const next = upsertMeterTypeDef({ name: draftName, description: draftDescription }, previous);
      setMeterCatalog(next);
      const savedName = draftName.trim();
      if (previous && previous !== savedName) {
        setMeterTypes((current) => current.map((item) => (item === previous ? savedName : item)));
      }
      if (meterEditor === "add" && savedName && !meterTypes.includes(savedName)) {
        setMeterTypes((current) => [...current, savedName]);
      }
      cancelMeterEditor();
    } catch (err) {
      setMeterError(err instanceof Error ? err.message : "Không thể lưu loại điểm đo.");
    }
  }

  function deleteMeterType(item: MeterTypeDef) {
    try {
      const next = removeMeterTypeDef(item.name);
      setMeterCatalog(next);
      setMeterTypes((current) => current.filter((type) => type !== item.name));
      if (meterEditor === item.name) cancelMeterEditor();
    } catch (err) {
      setMeterError(err instanceof Error ? err.message : "Không thể xóa loại điểm đo.");
    }
  }

  function updateRecipient(id: string, patch: Partial<AlertRecipient>) {
    setRecipients((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function handleSubmit() {
    const projectName = name.trim();
    const customerName = customer.trim();
    const projectCode = (initialProject?.id ?? code.trim().toUpperCase()) || nextProjectId();

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

    try {
      await hydrateProjects();
      await upsertProject({
        id: projectCode,
        name: projectName,
        customer: customerName,
        initials: projectInitials(customerName || projectName),
        accent: initialProject?.accent ?? projectAccent(projectCode),
        logoUrl: logoUrl || undefined,
        status,
        startDate: formatProjectDate(startDate),
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        meterTypes,
        recipients: cleanedRecipients,
      });
      if (!initialProject) ensureCustomerAccount({ id: projectCode, customer: customerName });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu dự án vào database.");
    }
  }

  return (
    <div className="mx-auto max-w-[980px] p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {initialProject ? "Sửa thông tin dự án" : "Tạo dự án mới"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {initialProject
            ? "Cập nhật thông tin khách hàng, loại điểm đo và người nhận thông báo cảnh báo."
            : "Cấu hình thông tin khách hàng, loại điểm đo và người nhận thông báo cảnh báo."}
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
                readOnly={Boolean(initialProject)}
                required
              />
            </Field>
            <Field label="TÊN DỰ ÁN">
              <input
                value={name}
                onChange={(e) => {
                  const value = e.target.value;
                  setName(value);
                  if (!initialProject) setCustomer(value);
                }}
                placeholder="VD: Công ty TNHH ABC"
                className="input"
                required
              />
            </Field>
            <Field label="TÊN KHÁCH HÀNG">
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Tự điền theo tên dự án"
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

          <div className="mt-4">
            <Field label="LOGO CÔNG TY">
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl text-lg font-bold text-white shadow-xs"
                  style={{ backgroundColor: initialProject?.accent ?? "#059669" }}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt={`Logo ${customer || name || "công ty"}`} className="h-full w-full object-contain bg-white" />
                  ) : (
                    projectInitials(customer || name)
                  )}
                </div>
                <div className="min-w-[220px] flex-1">
                  <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Chọn logo công ty
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        handleLogoChange(event.target.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <p className="mt-1.5 text-xs text-slate-400">PNG, JPG hoặc SVG · tối đa 2 MB</p>
                  {logoUrl ? (
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="mt-1 text-xs font-semibold text-red-500 hover:underline"
                    >
                      Xóa logo, dùng chữ viết tắt
                    </button>
                  ) : null}
                </div>
              </div>
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:p-8">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-800">Loại điểm đo</h2>
              <p className="mt-1 text-sm text-slate-500">
                Chọn các loại năng lượng sẽ được giám sát trong dự án này. Có thể thêm loại mới ngoài 4 loại mặc định.
              </p>
            </div>
            <button
              type="button"
              onClick={openAddMeterType}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100/70 transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              Thêm loại điểm đo
            </button>
          </div>

          {meterEditor ? (
            <div className="mb-4 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 sm:grid-cols-[1fr_1fr_auto]">
              <Field label="TÊN LOẠI ĐIỂM ĐO">
                <input
                  value={draftName}
                  onChange={(e) => {
                    setDraftName(e.target.value);
                    setMeterError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveMeterType();
                    }
                    if (e.key === "Escape") cancelMeterEditor();
                  }}
                  placeholder="VD: Khí nén"
                  className="input"
                  disabled={meterEditor !== "add" && meterCatalog.find((item) => item.name === meterEditor)?.builtin}
                />
              </Field>
              <Field label="MÔ TẢ LOẠI ĐIỂM ĐO">
                <input
                  value={draftDescription}
                  onChange={(e) => {
                    setDraftDescription(e.target.value);
                    setMeterError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveMeterType();
                    }
                    if (e.key === "Escape") cancelMeterEditor();
                  }}
                  placeholder="VD: Áp suất và lưu lượng khí nén"
                  className="input"
                />
              </Field>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={saveMeterType}
                  className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  {meterEditor === "add" ? "Thêm" : "Lưu"}
                </button>
                <button
                  type="button"
                  onClick={cancelMeterEditor}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
              </div>
              {meterError ? <p className="text-sm font-medium text-red-500 sm:col-span-3">{meterError}</p> : null}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {meterCatalog.map((item) => {
              const active = meterTypes.includes(item.name);
              return (
                <div
                  key={item.name}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                    active
                      ? "border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleMeter(item.name)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        active ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <MeterTypeIcon type={item.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-800">{item.name}</span>
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                            active ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"
                          }`}
                        >
                          {active ? <CheckIcon className="h-3 w-3" /> : null}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{item.description}</span>
                    </span>
                  </button>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => openEditMeterType(item)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-emerald-600"
                      aria-label={`Sửa ${item.name}`}
                      title="Sửa"
                    >
                      <EditIcon className="h-3.5 w-3.5" />
                    </button>
                    {item.builtin ? null : (
                      <button
                        type="button"
                        onClick={() => setMeterTypeToDelete(item)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
                        aria-label={`Xóa ${item.name}`}
                        title="Xóa"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
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
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <span className="text-lg leading-none text-emerald-600">+</span>
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
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
          >
            Hủy
          </Link>
          <button
            type="submit"
            className="h-10 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
          >
            {initialProject ? "Lưu thay đổi" : "Tạo dự án"}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={Boolean(meterTypeToDelete)}
        title="Xác nhận xóa loại điểm đo"
        description={`Bạn có chắc chắn muốn xóa loại điểm đo "${meterTypeToDelete?.name}" không?`}
        confirmText="Xác nhận xóa"
        onConfirm={() => {
          if (meterTypeToDelete) {
            deleteMeterType(meterTypeToDelete);
            setMeterTypeToDelete(null);
          }
        }}
        onCancel={() => setMeterTypeToDelete(null)}
      />

      <ConfirmDialog
        open={Boolean(recipientToDelete)}
        title="Xác nhận xóa người nhận"
        description={`Bạn có chắc chắn muốn xóa người nhận thông báo "${recipientToDelete?.name || "này"}" không?`}
        confirmText="Xác nhận xóa"
        onConfirm={() => {
          if (recipientToDelete) {
            setRecipients((current) =>
              current.length === 1 ? [nextRecipient()] : current.filter((row) => row.id !== recipientToDelete.id)
            );
            setRecipientToDelete(null);
          }
        }}
        onCancel={() => setRecipientToDelete(null)}
      />
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
  type: MeterTypeIconId;
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
  if (type === "air") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 9h11a3 3 0 1 0 0-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 13h14a3 3 0 1 1 0 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 17h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "generic") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v4l2.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 4.5 13.5h6.2L9.2 22 19.5 10h-6.2L13 2Z" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 17.5V20h2.5L18 8.5 15.5 6 4 17.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M13.8 7.7 16.3 10.2" stroke="currentColor" strokeWidth="1.8" />
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
