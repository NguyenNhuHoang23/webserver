"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

type ExtraField = { id: string; label: string; value: string };
type RegisterRow = {
  id: string;
  address: string;
  name: string;
  dataType: string;
  multiplier: string;
};

const deviceTypes = [
  "Đồng hồ điện (Power Meter)",
  "Đồng hồ nước (Water Meter)",
  "Cảm biến nhiệt",
  "Đồng hồ hơi",
  "Inverter PV",
];

const protocols = ["Modbus TCP", "Modbus RTU", "M-Bus", "BACnet", "MQTT"];
const dataTypes = ["UINT16", "UINT32", "INT32", "FLOAT32", "FLOAT64"];

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AddCustomDeviceForm() {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [deviceType, setDeviceType] = useState(deviceTypes[0]);
  const [protocol, setProtocol] = useState(protocols[0]);
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [extraFields, setExtraFields] = useState<ExtraField[]>([]);
  const [rows, setRows] = useState<RegisterRow[]>([
    {
      id: "r1",
      address: "3001",
      name: "Tổng năng lượng hữu công",
      dataType: "UINT32",
      multiplier: "0.1",
    },
    {
      id: "r2",
      address: "3005",
      name: "Điện áp pha L1-N",
      dataType: "FLOAT32",
      multiplier: "1.0",
    },
    {
      id: "r3",
      address: "3009",
      name: "Dòng điện pha A",
      dataType: "FLOAT32",
      multiplier: "0.001",
    },
  ]);

  const lastEdited = useMemo(() => "Vừa xong", []);

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
        address: "",
        name: "",
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

  return (
    <form
      className="mx-auto flex max-w-[1100px] flex-col gap-5 p-6 pb-28 lg:p-8"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="flex items-start gap-3">
        <Link
          href="/thiet-bi"
          className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-[#1a73e8]"
          aria-label="Quay lại danh sách thiết bị"
        >
          <BackIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Thêm mới Thiết bị Tùy chỉnh
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Cấu hình thông số kỹ thuật và bản đồ dữ liệu cho thiết bị mới.
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
            <InfoIcon className="h-4 w-4 text-[#1a73e8]" />
            Thông số chung
          </h2>
          <button
            type="button"
            onClick={addExtraField}
            className="text-xs font-bold tracking-wide text-[#1a73e8] hover:underline"
          >
            + THÊM TRƯỜNG THÔNG TIN
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Thương hiệu / Nhà sản xuất">
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="VD: Schneider Electric"
              className="input"
            />
          </Field>
          <Field label="Tên Model">
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="VD: PowerLogic PM5000"
              className="input"
            />
          </Field>
          <Field label="Loại thiết bị">
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              className="input"
            >
              {deviceTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </Field>
          <Field label="Giao thức kết nối">
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              className="input"
            >
              {protocols.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          {extraFields.map((field) => (
            <Field key={field.id} label={field.label}>
              <div className="flex gap-2">
                <input
                  value={field.value}
                  onChange={(e) =>
                    setExtraFields((current) =>
                      current.map((item) =>
                        item.id === field.id
                          ? { ...item, value: e.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="Nhập giá trị"
                  className="input"
                />
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                  onClick={() =>
                    setExtraFields((current) =>
                      current.filter((item) => item.id !== field.id),
                    )
                  }
                  aria-label="Xóa trường"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </Field>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
            <DocIcon className="h-4 w-4 text-[#1a73e8]" />
            Bản đồ thanh ghi / Điểm dữ liệu
          </h2>
          <button
            type="button"
            onClick={addRow}
            className="text-xs font-bold tracking-wide text-[#1a73e8] hover:underline"
          >
            + THÊM DÒNG
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wide text-slate-400">
                <th className="px-2 py-2">ĐỊA CHỈ (HEX/DEC)</th>
                <th className="px-2 py-2">TÊN THÔNG SỐ</th>
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
                      value={row.address}
                      onChange={(e) => updateRow(row.id, "address", e.target.value)}
                      className="input h-9"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={row.name}
                      onChange={(e) => updateRow(row.id, "name", e.target.value)}
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

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-[#1a73e8] hover:bg-[#f4f8ff]">
            {preview ? (
              <img
                src={preview}
                alt="Ảnh thiết bị"
                className="mb-3 h-24 w-24 rounded-lg object-cover"
              />
            ) : (
              <CameraIcon className="mb-3 h-8 w-8 text-slate-400" />
            )}
            <span className="text-xs font-bold tracking-wide text-slate-600">
              TẢI ẢNH LÊN
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = URL.createObjectURL(file);
                setPreview(url);
              }}
            />
          </label>
          <p className="mt-3 text-center text-xs leading-5 text-slate-400">
            Thêm ảnh thiết bị để nhân viên hiện trường dễ dàng nhận diện.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wide text-slate-700 uppercase">
            <DocIcon className="h-4 w-4 text-[#1a73e8]" />
            Ghi chú & mô tả
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={7}
            placeholder="Chỉ định các ràng buộc đấu nối hoặc yêu cầu lắp đặt..."
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/15"
          />
        </section>
      </div>

      <div className="sticky bottom-0 -mx-6 mt-1 flex items-center justify-between gap-3 border-t border-slate-200 bg-[#f3f5f8]/95 px-6 py-4 backdrop-blur lg:-mx-8 lg:px-8">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <ClockIcon className="h-4 w-4" />
          Chỉnh sửa lần cuối: {lastEdited}
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/thiet-bi"
            className="inline-flex h-10 items-center rounded-lg border border-[#1a73e8] bg-white px-4 text-sm font-medium text-[#1a73e8] hover:bg-blue-50"
          >
            Hủy bỏ
          </Link>
          <button
            type="submit"
            className="h-10 rounded-lg bg-[#1a73e8] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#1666d0]"
          >
            Lưu thiết bị
          </button>
        </div>
      </div>
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

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 8.5h3l1.5-2h7l1.5 2h3A1.5 1.5 0 0 1 21.5 10v8A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="14" r="3.2" stroke="currentColor" strokeWidth="1.8" />
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
