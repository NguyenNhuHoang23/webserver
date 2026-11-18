"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEVICE_KIND_OPTIONS,
  hydrateDevices,
  kindFromDeviceType,
  kindLabel,
  todaySyncLabel,
  upsertDevice,
  type DeviceExtraField,
  type DeviceKind,
  type DeviceRegister,
} from "@/lib/devices";
import { PROTOCOL_VERSION } from "@/lib/gateway-protocol";
import {
  hydrateMeterModels,
  loadMeterModels,
  serialsForModel,
  type MeterModelDef,
} from "@/lib/meter-models";

type ExtraField = DeviceExtraField;
type RegisterRow = DeviceRegister;

const dataTypes = ["UINT16", "UINT32", "INT32", "FLOAT32", "FLOAT64"];
const PROTOCOL_OPTIONS = [PROTOCOL_VERSION];

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyRegisterRows(): RegisterRow[] {
  return [
    { id: "r1", name: "", description: "", dataType: "FLOAT32", multiplier: "1.0" },
  ];
}

function normalizeRegisterRows(rows: DeviceRegister[]): RegisterRow[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name?.trim() || "",
    description: (row.description ?? row.address ?? "").trim(),
    dataType: row.dataType || "FLOAT32",
    multiplier: row.multiplier || "1.0",
  }));
}

export function AddCustomDeviceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("id");

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [deviceKind, setDeviceKind] = useState<DeviceKind>("power");
  const [category, setCategory] = useState("");
  const [serial, setSerial] = useState("");
  const [error, setError] = useState("");
  const [protocol, setProtocol] = useState(PROTOCOL_VERSION);
  const [isEdit, setIsEdit] = useState(false);
  const [meterModels, setMeterModels] = useState<MeterModelDef[]>(loadMeterModels);
  const [extraFields, setExtraFields] = useState<ExtraField[]>([]);
  const [fieldToDelete, setFieldToDelete] = useState<ExtraField | null>(null);
  const [rowToDelete, setRowToDelete] = useState<RegisterRow | null>(null);
  const [rows, setRows] = useState<RegisterRow[]>(emptyRegisterRows());

  const lastEdited = useMemo(() => "Vừa xong", []);
  const categoryOptions = useMemo(
    () => meterModels.map((item) => item.name).filter(Boolean),
    [meterModels],
  );
  const serialOptions = useMemo(() => {
    const configured = serialsForModel(meterModels, category);
    if (serial && !configured.includes(serial)) {
      return [...configured, serial].sort();
    }
    return configured;
  }, [meterModels, category, serial]);

  useEffect(() => {
    let active = true;
    void Promise.all([hydrateMeterModels(), hydrateDevices()]).then(([models, devices]) => {
      if (!active) return;
      setMeterModels(models);
      if (!editingId) {
        setIsEdit(false);
        return;
      }
      const existing = devices.find((item) => item.id === editingId);
      if (!existing) {
        setIsEdit(false);
        return;
      }
      setIsEdit(true);
      setBrand(existing.brand);
      setModel(existing.brandModel.replace(`${existing.brand} `, "").trim() || existing.name);
      const savedProtocol = existing.protocol?.replace(/^v/i, "").trim();
      setProtocol(savedProtocol || PROTOCOL_VERSION);
      setDeviceKind(existing.kind || kindFromDeviceType(existing.type));
      setCategory(existing.category ?? "");
      setSerial(existing.sn);
      setExtraFields(existing.extraFields ?? []);
      setRows(
        existing.registers?.length
          ? normalizeRegisterRows(existing.registers)
          : emptyRegisterRows(),
      );
    });
    return () => {
      active = false;
    };
  }, [editingId]);

  function applyCategory(nextCategory: string) {
    setCategory(nextCategory);
    setSerial("");
    if (!model.trim() || categoryOptions.includes(model.trim())) {
      setModel(nextCategory);
    }
  }

  function addExtraField() {
    setExtraFields((current) => [
      ...current,
      { id: nextId("f"), label: "Trường mới", value: "" },
    ]);
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        id: nextId("r"),
        name: "",
        description: "",
        dataType: "FLOAT32",
        multiplier: "1.0",
      },
    ]);
  }

  function updateRow(id: string, key: keyof RegisterRow, value: string) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  }

  async function handleSubmit() {
    const brandName = brand.trim() || "Custom";
    const modelName = model.trim() || category.trim() || "Device";
    const brandModel = modelName.toLowerCase().startsWith(brandName.toLowerCase())
      ? modelName
      : `${brandName} ${modelName}`;
    const serialNumber = serial.trim();
    const categoryName = category.trim();
    if (!categoryName || !serialNumber) {
      setError("Vui lòng chọn Category (meterModel gateway) và Serial.");
      return;
    }
    if (!categoryOptions.includes(categoryName)) {
      setError("Category phải chọn từ danh mục đã cấu hình.");
      return;
    }
    if (!serialOptions.includes(serialNumber)) {
      setError("Serial phải chọn từ danh sách của Category đã chọn.");
      return;
    }
    setError("");
    const id = editingId || `dev-${Date.now()}`;
    const protocolVersion = protocol.trim() || PROTOCOL_VERSION;

    try {
      await upsertDevice({
        id,
        name: modelName,
        sn: serialNumber,
        category: categoryName,
        brandModel,
        brand: brandName,
        type: kindLabel(deviceKind),
        kind: deviceKind,
        status: "active",
        lastSync: todaySyncLabel(),
        protocol: protocolVersion,
        notes: "",
        image: undefined,
        extraFields,
        registers: rows
          .filter((row) => row.name.trim() || row.description.trim())
          .map((row) => ({
            id: row.id,
            name: row.name.trim(),
            description: row.description.trim(),
            dataType: row.dataType,
            multiplier: row.multiplier,
          })),
      });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "";
      setError(
        message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("uq_devices_serial")
          ? "Serial này đã được dùng cho loại thiết bị khác."
          : "Không lưu được loại thiết bị. Hãy thử lại.",
      );
      return;
    }

    router.push("/thiet-bi");
  }

  return (
    <form
      className="mx-auto flex max-w-[1100px] flex-col gap-5 p-6 pb-28 lg:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <div className="flex items-start gap-3">
        <Link
          href="/thiet-bi"
          className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-white hover:text-emerald-600 transition-colors"
          aria-label="Quay lại danh sách thiết bị"
        >
          <BackIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isEdit ? "Cập nhật loại đồng hồ" : "Thêm loại đồng hồ"}
          </h1>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
            <InfoIcon className="h-4 w-4 text-emerald-600" />
            Thông số chung
          </h2>
          <button
            type="button"
            onClick={addExtraField}
            className="text-xs font-bold tracking-wide text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            + THÊM TRƯỜNG THÔNG TIN
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
          Category &amp; Serial được cấu hình tại{" "}
          <Link href="/mau-dong-ho" className="font-semibold text-emerald-700 hover:underline">
            Category / Serial đồng hồ
          </Link>
          . Form này chỉ chọn từ danh sách sẵn.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="1. Category (meterModel gateway)">
            <select
              value={category}
              onChange={(e) => applyCategory(e.target.value)}
              className="input"
              required
            >
              <option value="">Chọn Category...</option>
              {categoryOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="2. Serial">
            <select
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              className="input"
              required
              disabled={!category}
            >
              <option value="">
                {category ? "Chọn serial..." : "Chọn Category trước"}
              </option>
              {serialOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {category && serialOptions.length === 0 ? (
              <p className="mt-1.5 text-[11px] text-amber-600">
                Category này chưa có serial. Thêm tại trang Category / Serial đồng hồ.
              </p>
            ) : null}
          </Field>
          <Field label="Thương hiệu / Nhà sản xuất">
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Thương hiệu trên đồng hồ thực tế"
              className="input"
            />
          </Field>
          <Field label="Tên Model">
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={category || "PM2230"}
              className="input"
            />
          </Field>
          <Field label="Loại thiết bị">
            <select
              value={deviceKind}
              onChange={(e) => setDeviceKind(e.target.value as DeviceKind)}
              className="input"
              required
            >
              {DEVICE_KIND_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Giao thức kết nối (protocol version)">
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              className="input"
              required
            >
              {PROTOCOL_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  v{item}
                </option>
              ))}
            </select>
          </Field>
          {extraFields.map((field) => (
            <div key={field.id} className="sm:col-span-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] items-end gap-2">
              <Field label="TÊN TRƯỜNG">
                <input
                  value={field.label}
                  onChange={(e) =>
                    setExtraFields((current) =>
                      current.map((item) =>
                        item.id === field.id ? { ...item, label: e.target.value } : item,
                      ),
                    )
                  }
                  placeholder="VD: Điện áp định mức"
                  className="input"
                />
              </Field>
              <Field label="GIÁ TRỊ">
                <input
                  value={field.value}
                  onChange={(e) =>
                    setExtraFields((current) =>
                      current.map((item) =>
                        item.id === field.id ? { ...item, value: e.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Nhập giá trị"
                  className="input"
                />
              </Field>
              <button
                type="button"
                className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                onClick={() =>
                  setExtraFields((current) => current.filter((item) => item.id !== field.id))
                }
                aria-label="Xóa trường"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
            <DocIcon className="h-4 w-4 text-emerald-600" />
            Hàm nhận dữ liệu từ gateway
          </h2>
          <button
            type="button"
            onClick={addRow}
            className="text-xs font-bold tracking-wide text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            + THÊM DÒNG
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Khai báo thanh ghi/điểm dữ liệu để hệ thống đọc từ gateway. Cấu hình này dùng chung cho mọi dự án gắn loại đồng hồ này.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wide text-slate-400">
                <th className="px-2 py-2">TÊN</th>
                <th className="px-2 py-2">MÔ TẢ</th>
                <th className="px-2 py-2">KIỂU DỮ LIỆU</th>
                <th className="px-2 py-2">HỆ SỐ NHÂN</th>
                <th className="w-12 px-2 py-2 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-2 py-2">
                    <input
                      value={row.name}
                      onChange={(e) => updateRow(row.id, "name", e.target.value)}
                      placeholder="Tên thông số"
                      className="input h-9"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={row.description}
                      onChange={(e) => updateRow(row.id, "description", e.target.value)}
                      placeholder="Mô tả"
                      className="input h-9"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={row.dataType}
                      onChange={(e) => updateRow(row.id, "dataType", e.target.value)}
                      className="input h-9"
                    >
                      {dataTypes.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={row.multiplier}
                      onChange={(e) => updateRow(row.id, "multiplier", e.target.value)}
                      className="input h-9"
                    />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
                      onClick={() =>
                        setRows((current) => current.filter((item) => item.id !== row.id))
                      }
                      aria-label="Xóa dòng"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-6 mt-1 flex items-center justify-between gap-3 border-t border-slate-200 bg-[#f3f5f8]/95 px-6 py-4 backdrop-blur lg:-mx-8 lg:px-8">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <ClockIcon className="h-4 w-4" />
          Chỉnh sửa lần cuối: {lastEdited}
        </p>
        <div className="flex items-center gap-3">
          {error ? <p className="text-sm font-medium text-red-500">{error}</p> : null}
          <Link
            href="/thiet-bi"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
          >
            Hủy bỏ
          </Link>
          <button
            type="submit"
            className="h-10 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
          >
            {isEdit ? "Cập nhật loại đồng hồ" : "Lưu loại đồng hồ"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(fieldToDelete)}
        title="Xác nhận xóa trường"
        description={`Bạn có chắc chắn muốn xóa trường "${fieldToDelete?.label || "này"}" không?`}
        confirmText="Xác nhận xóa"
        onConfirm={() => {
          if (fieldToDelete) {
            setExtraFields((current) => current.filter((item) => item.id !== fieldToDelete.id));
            setFieldToDelete(null);
          }
        }}
        onCancel={() => setFieldToDelete(null)}
      />

      <ConfirmDialog
        open={Boolean(rowToDelete)}
        title="Xác nhận xóa thanh ghi"
        description={`Bạn có chắc chắn muốn xóa thanh ghi "${rowToDelete?.name || "này"}" không?`}
        confirmText="Xác nhận xóa"
        onConfirm={() => {
          if (rowToDelete) {
            setRows((current) => current.filter((item) => item.id !== rowToDelete.id));
            setRowToDelete(null);
          }
        }}
        onCancel={() => setRowToDelete(null)}
      />
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5M12 8v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 3.5V9h5.5M8.5 13h7M8.5 16.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 7h14M10 7V5h4v2M8 7l.8 12h6.4L16 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4.5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
