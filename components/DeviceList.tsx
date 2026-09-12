"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  INITIAL_DEVICES,
  loadDevices,
  removeDevice as removeStoredDevice,
  type CatalogDevice,
  type DeviceKind,
} from "@/lib/devices";

const PAGE_SIZE = 10;

export function DeviceList() {
  const [brand, setBrand] = useState("all");
  const [type, setType] = useState("all");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [devices, setDevices] = useState<CatalogDevice[]>(INITIAL_DEVICES);

  useEffect(() => {
    setDevices(loadDevices());
  }, []);

  const brands = useMemo(
    () => Array.from(new Set(devices.map((d) => d.brand))).sort(),
    [devices],
  );

  const types = useMemo(
    () => Array.from(new Set(devices.map((d) => d.type).filter(Boolean))).sort(),
    [devices],
  );

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      const matchBrand = brand === "all" || d.brand === brand;
      const matchType = type === "all" || d.type === type;
      return matchBrand && matchType;
    });
  }, [brand, devices, type]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  const stats = useMemo(() => {
    const mapped = devices.filter((d) => (d.registers?.length ?? 0) > 0).length;
    const withImage = devices.filter((d) => Boolean(d.image)).length;
    const brandsCount = new Set(devices.map((d) => d.brand)).size;
    return { total: devices.length, mapped, withImage, brandsCount };
  }, [devices]);

  function removeDevice(id: string) {
    setDevices(removeStoredDevice(id));
  }

  return (
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8 font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Thư viện loại đồng hồ
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {devices.length} models
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Cấu hình danh mục loại đồng hồ, địa chỉ thanh ghi nhận dữ liệu từ gateway dùng chung cho toàn hệ thống.
          </p>
        </div>
        <Link
          href="/thiet-bi/them-moi"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
        >
          <span className="text-base leading-none font-bold">+</span>
          Thêm loại đồng hồ
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="TỔNG LOẠI ĐỒNG HỒ"
          value={String(stats.total)}
          hint="Catalog tiêu chuẩn"
          icon={<BoxIcon className="h-5 w-5 text-slate-700" />}
          iconWrap="bg-slate-100"
        />
        <StatCard
          label="ĐÃ CẤU HÌNH THANH GHI"
          value={String(stats.mapped)}
          valueClass="text-emerald-700"
          hint="Sẵn sàng đọc Modbus/MQTT"
          icon={<CheckIcon className="h-5 w-5 text-emerald-600" />}
          iconWrap="bg-emerald-50"
        />
        <StatCard
          label="CÓ ẢNH NHẬN DIỆN"
          value={String(stats.withImage)}
          valueClass="text-cyan-700"
          hint="Hỗ trợ hiển thị trực quan"
          icon={<CameraIcon className="h-5 w-5 text-cyan-600" />}
          iconWrap="bg-cyan-50"
        />
        <StatCard
          label="THƯƠNG HIỆU HỖ TRỢ"
          value={String(stats.brandsCount)}
          hint="Hãng sản xuất thiết bị"
          icon={<TagIcon className="h-5 w-5 text-slate-600" />}
          iconWrap="bg-slate-100"
        />
      </div>

      {/* Main Table / Grid Section */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 bg-slate-50/40">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
              <FilterIcon className="h-3.5 w-3.5" />
              Lọc theo:
            </span>
            <FilterSelect
              value={brand}
              onChange={(v) => {
                setBrand(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Tất cả thương hiệu" },
                ...brands.map((b) => ({ value: b, label: b })),
              ]}
            />
            <FilterSelect
              value={type}
              onChange={(v) => {
                setType(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Tất cả loại" },
                ...types.map((item) => ({ value: item, label: item })),
              ]}
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
            <ToolbarButton
              label="Dạng danh sách"
              active={view === "list"}
              onClick={() => setView("list")}
            >
              <ListIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Dạng lưới"
              active={view === "grid"}
              onClick={() => setView("grid")}
            >
              <GridIcon className="h-4 w-4" />
            </ToolbarButton>
          </div>
        </div>

        {view === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  <th className="px-5 py-3">Tên Model & Chủng loại</th>
                  <th className="px-5 py-3">Thương hiệu</th>
                  <th className="px-5 py-3">Phân loại</th>
                  <th className="px-5 py-3">Giao thức</th>
                  <th className="px-5 py-3">Hàm dữ liệu</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      Không tìm thấy loại đồng hồ nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  rows.map((device) => {
                    const Icon = getKindIcon(device.kind);
                    return (
                      <tr
                        key={device.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 overflow-hidden items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200/60">
                              {device.image ? (
                                <img src={device.image} alt="" className="h-9 w-9 object-cover" />
                              ) : (
                                <Icon className="h-4 w-4" />
                              )}
                            </span>
                            <div>
                              <span className="block font-semibold text-slate-900">
                                {device.name}
                              </span>
                              <span className="block font-mono text-[11px] text-slate-400">
                                {device.brandModel}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-700">
                          {device.brand}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200/60">
                            {device.type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px]">
                          {device.protocol || "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          {(device.registers?.length ?? 0) > 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {device.registers?.length} điểm đo
                            </span>
                          ) : (
                            <span className="text-slate-400">Chưa cấu hình</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1">
                            <Link
                              href={`/thiet-bi/them-moi?id=${device.id}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                              title="Sửa loại đồng hồ"
                            >
                              <EditIcon className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => removeDevice(device.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                              title="Xóa loại đồng hồ"
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((device) => {
              const Icon = getKindIcon(device.kind);
              return (
                <article
                  key={device.id}
                  className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 overflow-hidden items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200/60">
                      {device.image ? (
                        <img src={device.image} alt="" className="h-11 w-11 object-cover" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900 text-xs">
                        {device.name}
                      </p>
                      <p className="text-[11px] text-slate-400">{device.brand}</p>
                      <p className="mt-1 text-xs text-slate-600 font-mono">
                        {device.protocol || "Chưa chọn giao thức"}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px]">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                          {device.type}
                        </span>
                        <span className="text-slate-500 font-medium">
                          {(device.registers?.length ?? 0) > 0
                            ? `${device.registers?.length} điểm dữ liệu`
                            : "Chưa cấu hình"}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 text-xs text-slate-500 bg-white">
          <p>
            Hiển thị {filtered.length === 0 ? 0 : start + 1}-
            {Math.min(start + PAGE_SIZE, filtered.length)} trên tổng số {filtered.length} loại đồng hồ
          </p>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
          />
        </div>

        {/* Subtle Tip Banner */}
        <div className="flex items-start gap-2.5 border-t border-emerald-100 bg-emerald-50/40 px-5 py-3 text-xs text-emerald-800">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p>
            <strong className="font-semibold">Mẹo vận hành:</strong> Đây là danh mục loại thiết bị dùng chung cho toàn hệ thống.
            Khi thêm điểm đo trong từng dự án, bạn chỉ cần chọn loại đồng hồ tương ứng mà không cần khai báo lại thanh ghi Modbus.
          </p>
        </div>
      </section>
    </div>
  );
}

// ---------------- Helpers & Icons ----------------

function StatCard({
  label,
  value,
  hint,
  icon,
  iconWrap,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  iconWrap: string;
  valueClass?: string;
}) {
  return (
    <article className="flex items-start justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div>
        <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
          {label}
        </p>
        <p className={`mt-2 text-3xl font-bold tracking-tight ${valueClass}`}>
          {value}
        </p>
        {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      </div>
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconWrap}`}>
        {icon}
      </span>
    </article>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 appearance-none rounded-lg border border-slate-200 bg-white py-0 pr-8 pl-3 text-xs font-medium text-slate-700 outline-none hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 text-xs">
        ▾
      </span>
    </div>
  );
}

function ToolbarButton({
  children,
  label,
  active = false,
  onClick,
}: {
  children: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
        active ? "bg-slate-900 text-white shadow-xs" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const items: Array<number | "…"> = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) items.push(i);
  } else if (page <= 3) {
    items.push(1, 2, 3, "…", totalPages);
  } else if (page >= totalPages - 2) {
    items.push(1, "…", totalPages - 2, totalPages - 1, totalPages);
  } else {
    items.push(1, "…", page, "…", totalPages);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
      >
        ‹
      </button>
      {items.map((item, idx) =>
        item === "…" ? (
          <span key={`e-${idx}`} className="px-1 text-slate-400">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition-colors ${
              item === page
                ? "bg-emerald-600 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
      >
        ›
      </button>
    </div>
  );
}

function getKindIcon(kind?: string) {
  switch (kind) {
    case "power":
      return BoltIcon;
    case "flow":
      return DropletIcon;
    case "temp":
      return HeatIcon;
    case "steam":
      return FlameIcon;
    default:
      return BoxIcon;
  }
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function DropletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </svg>
  );
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function HeatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
    </svg>
  );
}
