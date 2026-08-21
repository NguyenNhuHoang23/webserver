"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

type DeviceKind = "power" | "flow" | "temp" | "steam";
type DeviceStatus = "active" | "maintenance" | "offline";

type CatalogDevice = {
  id: string;
  name: string;
  sn: string;
  brandModel: string;
  brand: string;
  type: string;
  kind: DeviceKind;
  status: DeviceStatus;
  lastSync: string;
};

const PAGE_SIZE = 10;

const seeds: CatalogDevice[] = [
  {
    id: "dev-1",
    name: "Power Meter Main-01",
    sn: "SN: EM-992834-A",
    brandModel: "Schneider iEM3000",
    brand: "Schneider",
    type: "Power Meter",
    kind: "power",
    status: "active",
    lastSync: "10:45:22 24/05/2024",
  },
  {
    id: "dev-2",
    name: "Water Flow Sensor-B2",
    sn: "SN: WF-112093-X",
    brandModel: "Siemens SITRANS F",
    brand: "Siemens",
    type: "Flow Meter",
    kind: "flow",
    status: "active",
    lastSync: "10:42:15 24/05/2024",
  },
  {
    id: "dev-3",
    name: "Temp Probe Line-C",
    sn: "SN: TP-445021-Z",
    brandModel: "ABB SensyTemp",
    brand: "ABB",
    type: "Temperature",
    kind: "temp",
    status: "maintenance",
    lastSync: "09:12:01 24/05/2024",
  },
  {
    id: "dev-4",
    name: "Steam Gauge High-P",
    sn: "SN: SG-778120-K",
    brandModel: "Yokogawa EJX",
    brand: "Yokogawa",
    type: "Steam Meter",
    kind: "steam",
    status: "active",
    lastSync: "Vừa xong",
  },
  {
    id: "dev-5",
    name: "Power Meter Sub-02",
    sn: "SN: EM-883401-B",
    brandModel: "Schneider PM5100",
    brand: "Schneider",
    type: "Power Meter",
    kind: "power",
    status: "offline",
    lastSync: "18:20:44 23/05/2024",
  },
  {
    id: "dev-6",
    name: "Cooling Water Meter-01",
    sn: "SN: WF-220184-Y",
    brandModel: "Siemens MAG 5100",
    brand: "Siemens",
    type: "Flow Meter",
    kind: "flow",
    status: "active",
    lastSync: "10:44:02 24/05/2024",
  },
];

const extra: CatalogDevice[] = Array.from({ length: 122 }, (_, i) => {
  const n = i + 7;
  const cycle: Array<
    Pick<CatalogDevice, "brand" | "brandModel" | "type" | "kind" | "status">
  > = [
    {
      brand: "Schneider",
      brandModel: "Schneider iEM3000",
      type: "Power Meter",
      kind: "power",
      status: i % 31 === 0 ? "offline" : i % 17 === 0 ? "maintenance" : "active",
    },
    {
      brand: "Siemens",
      brandModel: "Siemens SITRANS F",
      type: "Flow Meter",
      kind: "flow",
      status: i % 19 === 0 ? "maintenance" : "active",
    },
    {
      brand: "ABB",
      brandModel: "ABB SensyTemp",
      type: "Temperature",
      kind: "temp",
      status: i % 23 === 0 ? "offline" : "active",
    },
    {
      brand: "Yokogawa",
      brandModel: "Yokogawa EJX",
      type: "Steam Meter",
      kind: "steam",
      status: "active",
    },
  ];
  const item = cycle[i % cycle.length];
  const hour = String(8 + (i % 10)).padStart(2, "0");
  const min = String((i * 3) % 60).padStart(2, "0");
  const sec = String((i * 7) % 60).padStart(2, "0");
  return {
    id: `dev-${n}`,
    name: `${item.type.split(" ")[0]} Unit-${String(n).padStart(2, "0")}`,
    sn: `SN: XX-${String(100000 + n)}-${String.fromCharCode(65 + (i % 26))}`,
    ...item,
    lastSync:
      i % 11 === 0 ? "Vừa xong" : `${hour}:${min}:${sec} 24/05/2024`,
  };
});

const allDevices: CatalogDevice[] = [...seeds, ...extra];

export function DeviceList() {
  const [brand, setBrand] = useState("all");
  const [status, setStatus] = useState<"all" | DeviceStatus>("all");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [devices, setDevices] = useState(allDevices);

  const brands = useMemo(
    () => Array.from(new Set(allDevices.map((d) => d.brand))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      const matchBrand = brand === "all" || d.brand === brand;
      const matchStatus = status === "all" || d.status === status;
      return matchBrand && matchStatus;
    });
  }, [brand, devices, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  const stats = useMemo(() => {
    const active = devices.filter((d) => d.status === "active").length;
    const maintenance = devices.filter((d) => d.status === "maintenance").length;
    const offline = devices.filter((d) => d.status === "offline").length;
    return { total: devices.length, active, maintenance, offline };
  }, [devices]);

  function removeDevice(id: string) {
    setDevices((current) => current.filter((d) => d.id !== id));
  }

  return (
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f2b5b]">
            Quản lý thiết bị đo
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Giám sát và quản lý danh mục thiết bị đo lường trong toàn hệ thống.
          </p>
        </div>
        <Link
          href="/thiet-bi/them-moi"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#1a73e8] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#1666d0]"
        >
          <span className="text-lg leading-none">+</span>
          Thêm thiết bị mới
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="TỔNG THIẾT BỊ"
          value={String(stats.total)}
          icon={<BoxIcon className="h-5 w-5" />}
          iconWrap="bg-[#e8f1fd] text-[#1a73e8]"
        />
        <StatCard
          label="ĐANG HOẠT ĐỘNG"
          value={String(stats.active)}
          valueClass="text-emerald-600"
          icon={<CheckIcon className="h-5 w-5" />}
          iconWrap="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="BẢO TRÌ"
          value={String(stats.maintenance)}
          valueClass="text-orange-500"
          icon={<WrenchIcon className="h-5 w-5" />}
          iconWrap="bg-orange-50 text-orange-500"
        />
        <StatCard
          label="NGOẠI TUYẾN"
          value={String(stats.offline)}
          valueClass="text-red-500"
          icon={<OfflineIcon className="h-5 w-5" />}
          iconWrap="bg-red-50 text-red-500"
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
              <FilterIcon className="h-4 w-4" />
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
              value={status}
              onChange={(v) => {
                setStatus(v as "all" | DeviceStatus);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Tất cả trạng thái" },
                { value: "active", label: "Đang hoạt động" },
                { value: "maintenance", label: "Bảo trì" },
                { value: "offline", label: "Ngoại tuyến" },
              ]}
            />
          </div>
          <div className="flex items-center gap-1">
            <ToolbarButton
              label="Dạng lưới"
              active={view === "grid"}
              onClick={() => setView("grid")}
            >
              <GridIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Dạng danh sách"
              active={view === "list"}
              onClick={() => setView("list")}
            >
              <ListIcon className="h-4 w-4" />
            </ToolbarButton>
          </div>
        </div>

        {view === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-[#f8fafc] text-[11px] font-semibold tracking-wide text-slate-400">
                  <th className="px-5 py-3">TÊN THIẾT BỊ</th>
                  <th className="px-5 py-3">THƯƠNG HIỆU / MODEL</th>
                  <th className="px-5 py-3">LOẠI</th>
                  <th className="px-5 py-3">ĐỒNG BỘ CUỐI</th>
                  <th className="px-5 py-3 text-right">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((device) => {
                  const Icon = kindIcons[device.kind];
                  return (
                    <tr
                      key={device.id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f1fd] text-[#1a73e8]">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block font-semibold text-slate-800">
                              {device.name}
                            </span>
                            <span className="block text-xs text-slate-400">
                              {device.sn}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {device.brandModel}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {device.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {device.lastSync}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/thiet-bi/them-moi?id=${device.id}`}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-[#1a73e8]"
                            aria-label="Sửa thiết bị"
                          >
                            <EditIcon className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeDevice(device.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
                            aria-label="Xóa thiết bị"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((device) => {
              const Icon = kindIcons[device.kind];
              return (
                <article
                  key={device.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f1fd] text-[#1a73e8]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-800">
                        {device.name}
                      </p>
                      <p className="text-xs text-slate-400">{device.sn}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        {device.brandModel}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {device.type}
                        </span>
                        <span className="text-xs text-slate-400">
                          {device.lastSync}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
          <p>
            Hiển thị {filtered.length === 0 ? 0 : start + 1}-
            {Math.min(start + PAGE_SIZE, filtered.length)} trên tổng số{" "}
            {filtered.length} thiết bị
          </p>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
          />
        </div>

        <div className="flex items-start gap-2.5 rounded-b-xl border-t border-[#d6e6fb] bg-[#eef5ff] px-5 py-3.5 text-sm text-[#1a5fbe]">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-semibold">Mẹo:</span> Bạn có thể nhấp đúp vào
            một hàng để xem biểu đồ dữ liệu thời gian thực của thiết bị đó.
          </p>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconWrap,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  iconWrap: string;
  valueClass?: string;
}) {
  return (
    <article className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div>
        <p className="text-[11px] font-semibold tracking-wide text-slate-400">
          {label}
        </p>
        <p className={`mt-2 text-3xl font-bold tracking-tight ${valueClass}`}>
          {value}
        </p>
      </div>
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full ${iconWrap}`}
      >
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
        className="h-9 appearance-none rounded-lg border border-slate-200 bg-white py-0 pr-8 pl-3 text-sm text-slate-600 outline-none focus:border-[#1a73e8]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400">
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
      className={`flex h-8 w-8 items-center justify-center rounded-md ${
        active
          ? "bg-[#e8f1fd] text-[#1a73e8]"
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40"
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
            className={`h-8 min-w-8 rounded-md px-2 text-sm font-medium ${
              item === page
                ? "bg-[#1a73e8] text-white"
                : "text-slate-600 hover:bg-slate-100"
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
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40"
      >
        ›
      </button>
    </div>
  );
}

const kindIcons: Record<
  DeviceKind,
  (props: { className?: string }) => ReactNode
> = {
  power: BoltIcon,
  flow: DropIcon,
  temp: ThermoIcon,
  steam: WaveIcon,
};

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8.5 12 4l8 4.5V16L12 20.5 4 16V8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 12v8.5M4 8.5l8 3.5 8-3.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m8.5 12.2 2.4 2.4 4.6-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14.5 6.5a3.5 3.5 0 0 0 4.7 4.7L15 15.4 8.6 9l4.2-4.2a3.5 3.5 0 0 0 1.7 1.7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m8.6 9-4.1 4.1a2 2 0 0 0 0 2.8l1.6 1.6a2 2 0 0 0 2.8 0L13 13.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OfflineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12.5a9 9 0 0 1 14 0M8 15.5a5 5 0 0 1 8 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" />
      <path d="m5 5 14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16l-6 7.5V18l-4 2v-6.5L4 6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 7h14M10 7V5h4v2M8 7l.8 12h6.4L16 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 11v5M12 8v.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 4.5 13.5h6.2L9.2 22 19.5 10h-6.2L13 2Z" />
    </svg>
  );
}

function DropIcon({ className }: { className?: string }) {
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

function ThermoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 13.5V6.5a2 2 0 1 1 4 0v7a3.5 3.5 0 1 1-4 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M12 9v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 14c2-3 4-3 6 0s4 3 6 0 4-3 6 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M3 9c2-3 4-3 6 0s4 3 6 0 4-3 6 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
