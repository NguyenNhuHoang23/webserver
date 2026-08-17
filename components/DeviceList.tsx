"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { AlertConfig } from "@/components/AlertConfig";
import { GhgConfig } from "@/components/GhgConfig";

type Energy = "Điện" | "Nước" | "Nhiệt" | "Hơi";
type DeviceKind = "meter" | "inverter" | "thermo" | "water" | "wind" | "steam";
type Status = "connected" | "disconnected";

type MeterPoint = {
  id: string;
  name: string;
  sn: string; 
  type: string;
  energy: Energy;
  kind: DeviceKind;
  status: Status;
  value: number | null;
  unit: string;
  children?: MeterPoint[];
};

const ENERGY_OPTIONS: Energy[] = ["Điện", "Nước", "Nhiệt", "Hơi"];

const seeds: MeterPoint[] = [
  {
    id: "MP-001",
    name: "MP-001 - Trạm Biến Áp Chính",
    sn: "SN: 98721345601",
    type: "Industrial Smart Meter",
    energy: "Điện",
    kind: "meter",
    status: "connected",
    value: 12450.2,
    unit: "kWh",
    children: [
      {
        id: "MP-001-A",
        name: "MP-001-A - Inverter Dãy 1",
        sn: "SN: 98721345602",
        type: "PV Inverter Monitoring",
        energy: "Điện",
        kind: "inverter",
        status: "connected",
        value: 450.8,
        unit: "kW",
      },
      {
        id: "MP-001-T",
        name: "MP-001-T - Cảm biến nhiệt dàn",
        sn: "SN: 98721345603",
        type: "Temperature Sensor",
        energy: "Nhiệt",
        kind: "thermo",
        status: "disconnected",
        value: null,
        unit: "°C",
      },
    ],
  },
  {
    id: "MP-002",
    name: "MP-002 - Hệ thống làm mát",
    sn: "SN: 55190233410",
    type: "Ultrasonic Flow Meter",
    energy: "Nước",
    kind: "water",
    status: "connected",
    value: 84.2,
    unit: "m³/h",
  },
  {
    id: "MP-003",
    name: "MP-003 - Trạm quan trắc gió",
    sn: "SN: 22019888341",
    type: "Anemometer",
    energy: "Điện",
    kind: "wind",
    status: "connected",
    value: 5.4,
    unit: "m/s",
  },
  {
    id: "MP-004",
    name: "MP-004 - Nồi hơi công nghệ",
    sn: "SN: 77412009812",
    type: "Steam Flow Computer",
    energy: "Hơi",
    kind: "steam",
    status: "connected",
    value: 12.6,
    unit: "t/h",
  },
  {
    id: "MP-005",
    name: "MP-005 - Đồng hồ nước đầu nguồn",
    sn: "SN: 33002119844",
    type: "Water Smart Meter",
    energy: "Nước",
    kind: "water",
    status: "connected",
    value: 219.4,
    unit: "m³",
  },
];

const extraPoints: MeterPoint[] = Array.from({ length: 37 }, (_, i) => {
  const n = i + 6;
  const cycle: Array<Pick<MeterPoint, "energy" | "kind" | "type" | "unit" | "status" | "value">> = [
    {
      energy: "Điện",
      kind: "meter",
      type: "Industrial Smart Meter",
      unit: "kWh",
      status: i % 9 === 0 ? "disconnected" : "connected",
      value: i % 9 === 0 ? null : 1800 + i * 37.4,
    },
    {
      energy: "Nước",
      kind: "water",
      type: "Water Smart Meter",
      unit: "m³/h",
      status: "connected",
      value: 20 + (i % 15) * 1.7,
    },
    {
      energy: "Nhiệt",
      kind: "thermo",
      type: "Temperature Sensor",
      unit: "°C",
      status: i % 8 === 0 ? "disconnected" : "connected",
      value: i % 8 === 0 ? null : 42 + (i % 12),
    },
    {
      energy: "Hơi",
      kind: "steam",
      type: "Steam Flow Computer",
      unit: "t/h",
      status: "connected",
      value: 3.2 + (i % 6) * 0.8,
    },
  ];
  const item = cycle[i % cycle.length];
  return {
    id: `MP-${String(n).padStart(3, "0")}`,
    name: `MP-${String(n).padStart(3, "0")} - Điểm đo khu ${n}`,
    sn: `SN: 88${String(100000000 + n).slice(1)}`,
    ...item,
  };
});

const allPoints: MeterPoint[] = [...seeds, ...extraPoints];
const PAGE_SIZE = 10;
const TABS = [
  { id: "points", label: "Cấu hình điểm đo" },
  { id: "ghg", label: "Cấu hình khí nhà kính" },
  { id: "alerts", label: "Cấu hình cảnh báo" },
] as const;

function flatten(points: MeterPoint[]): MeterPoint[] {
  return points.flatMap((p) => [p, ...(p.children ?? [])]);
}

export function DeviceList() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("points");
  const [energies, setEnergies] = useState<Energy[]>(["Điện", "Nước", "Nhiệt", "Hơi"]);
  const [query, setQuery] = useState("");
  const [deviceType, setDeviceType] = useState("all");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["MP-001"]));

  const deviceTypes = useMemo(
    () => Array.from(new Set(flatten(allPoints).map((p) => p.type))).sort(),
    [],
  );

  const filteredRoots = useMemo(() => {
    const q = query.trim().toLowerCase();

    function match(point: MeterPoint): boolean {
      const energyOk = energies.length === 0 || energies.includes(point.energy);
      const typeOk = deviceType === "all" || point.type === deviceType;
      const textOk =
        !q ||
        point.name.toLowerCase().includes(q) ||
        point.id.toLowerCase().includes(q) ||
        point.sn.toLowerCase().includes(q);
      return energyOk && typeOk && textOk;
    }

    const next: MeterPoint[] = [];
    for (const root of allPoints) {
      const children = (root.children ?? []).filter(match);
      if (match(root)) {
        next.push(root.children ? { ...root, children } : root);
      } else if (children.length) {
        next.push({ ...root, children });
      }
    }
    return next;
  }, [deviceType, energies, query]);

  const totalPages = Math.max(1, Math.ceil(filteredRoots.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filteredRoots.slice(start, start + PAGE_SIZE);

  function toggleEnergy(energy: Energy) {
    setPage(1);
    setEnergies((current) =>
      current.includes(energy)
        ? current.filter((item) => item !== energy)
        : [...current, energy],
    );
  }

  function toggleExpand(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
        <div className="flex gap-6">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`relative pb-3 text-sm font-semibold ${
                  active ? "text-[#1a73e8]" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#1a73e8]" />
                )}
              </button>
            );
          })}
        </div>
        <Link
          href="/thiet-bi/them-moi"
          className="mb-2 inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#1a73e8] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#1666d0]"
        >
          <span className="text-lg leading-none">+</span>
          Thêm mới điểm đo
        </Link>
      </div>

      {tab === "ghg" ? (
        <GhgConfig />
      ) : tab === "alerts" ? (
        <AlertConfig />
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="TỔNG ĐIỂM ĐO"
              value="42"
              hint={<span className="text-emerald-600">+3 thiết bị mới</span>}
            />
            <StatCard
              label="KẾT NỐI"
              value="39 / 42"
              hint={<span className="text-slate-500">active</span>}
            />
            <StatCard
              label="CẢNH BÁO HỆ THỐNG"
              value="02"
              valueClass="text-red-500"
              hint={<span className="text-red-500">Cần xử lý ngay</span>}
            />
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <p className="text-[11px] font-semibold tracking-wide text-slate-400">
                BÁO CÁO MỚI NHẤT
              </p>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#1a73e8] hover:underline"
              >
                <DownloadIcon className="h-4 w-4" />
                Tải về báo cáo tháng 10
              </button>
            </article>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {ENERGY_OPTIONS.map((energy) => {
              const active = energies.includes(energy);
              return (
                <div
                  key={energy}
                  className={`inline-flex h-8 items-center rounded-full pl-3 text-sm font-medium ${
                    active
                      ? "bg-[#1a73e8] text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  <button type="button" onClick={() => toggleEnergy(energy)} className="pr-1">
                    {energy}
                  </button>
                  <button
                    type="button"
                    aria-label={`Bỏ lọc ${energy}`}
                    className={`px-2 text-base leading-none ${active ? "text-white/80" : "text-slate-400"}`}
                    onClick={() => {
                      setEnergies((current) => current.filter((item) => item !== energy));
                      setPage(1);
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
              aria-label="Thêm loại năng lượng"
            >
              +
            </button>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="relative min-w-[240px] flex-1">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
                <SearchIcon className="h-4 w-4" />
              </span>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm kiếm điểm đo, ID..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-[#1a73e8]"
              />
            </label>
            <select
              value={deviceType}
              onChange={(e) => {
                setDeviceType(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-[#1a73e8]"
            >
              <option value="all">Tất cả loại thiết bị</option>
              {deviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wide text-slate-400">
                    <th className="px-5 py-3">TÊN / ID ĐIỂM ĐO</th>
                    <th className="px-5 py-3">LOẠI THIẾT BỊ</th>
                    <th className="px-5 py-3">TRẠNG THÁI</th>
                    <th className="px-5 py-3">GIÁ TRỊ HIỆN TẠI</th>
                    <th className="px-5 py-3 text-right">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((point) => {
                    const hasChildren = Boolean(point.children?.length);
                    const isOpen = expanded.has(point.id);
                    return (
                      <DeviceRows
                        key={point.id}
                        point={point}
                        depth={0}
                        hasChildren={hasChildren}
                        isOpen={isOpen}
                        onToggle={() => toggleExpand(point.id)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm text-slate-500">
              <p>
                Đang hiển thị {filteredRoots.length === 0 ? 0 : start + 1}-
                {Math.min(start + PAGE_SIZE, filteredRoots.length)} trên tổng số{" "}
                {filteredRoots.length} điểm đo
              </p>
              <div className="flex items-center gap-1">
                <PageBtn disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                  ‹
                </PageBtn>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n <= 3 || n === totalPages)
                  .map((n, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <span key={n} className="contents">
                        {prev && n - prev > 1 && (
                          <span className="px-1 text-slate-400">…</span>
                        )}
                        <PageBtn active={n === currentPage} onClick={() => setPage(n)}>
                          {n}
                        </PageBtn>
                      </span>
                    );
                  })}
                <PageBtn
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  ›
                </PageBtn>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function DeviceRows({
  point,
  depth,
  hasChildren,
  isOpen,
  onToggle,
}: {
  point: MeterPoint;
  depth: number;
  hasChildren: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = kindIcons[point.kind];

  return (
    <>
      <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80">
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-2" style={{ paddingLeft: depth * 22 }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={onToggle}
                className="flex h-5 w-5 items-center justify-center text-slate-400"
                aria-label={isOpen ? "Thu gọn" : "Mở rộng"}
              >
                <ChevronIcon className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e8f1fd] text-[#1a73e8]">
              <Icon className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-semibold text-slate-800">{point.name}</span>
              <span className="block text-xs text-slate-400">{point.sn}</span>
            </span>
          </div>
        </td>
        <td className="px-5 py-3.5 text-slate-600">{point.type}</td>
        <td className="px-5 py-3.5">
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <span
              className={`h-2 w-2 rounded-full ${
                point.status === "connected" ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            <span className={point.status === "connected" ? "text-slate-700" : "text-red-500"}>
              {point.status === "connected" ? "Connected" : "Disconnected"}
            </span>
          </span>
        </td>
        <td className="px-5 py-3.5">
          {point.value == null ? (
            <span className="font-semibold text-slate-400">
              --.- <span className="text-xs font-medium">{point.unit}</span>
            </span>
          ) : (
            <span className="text-base font-bold text-[#1a73e8]">
              {formatValue(point.value, point.unit)}{" "}
              <span className="text-xs font-semibold text-[#5b9cf0]">{point.unit}</span>
            </span>
          )}
        </td>
        <td className="px-5 py-3.5">
          <div className="flex justify-end">
            <Link
              href="/thiet-bi/them-moi"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-[#1a73e8]"
              aria-label="Chỉnh sửa điểm đo"
            >
              <EditIcon className="h-4 w-4" />
            </Link>
          </div>
        </td>
      </tr>
      {hasChildren &&
        isOpen &&
        point.children?.map((child) => (
          <DeviceRows
            key={child.id}
            point={child}
            depth={depth + 1}
            hasChildren={Boolean(child.children?.length)}
            isOpen={false}
            onToggle={() => undefined}
          />
        ))}
    </>
  );
}

function formatValue(value: number, unit: string) {
  const digits = unit === "kWh" || unit === "kW" || unit === "m³" ? 1 : 1;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function StatCard({
  label,
  value,
  hint,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string;
  hint: ReactNode;
  valueClass?: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <p className="text-[11px] font-semibold tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${valueClass}`}>{value}</p>
      <p className="mt-1.5 text-xs font-medium">{hint}</p>
    </article>
  );
}

function PageBtn({
  children,
  onClick,
  active = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium disabled:opacity-40 ${
        active ? "bg-[#1a73e8] text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

const kindIcons: Record<DeviceKind, (props: { className?: string }) => ReactNode> = {
  meter: RadioIcon,
  inverter: BoltIcon,
  thermo: ThermoIcon,
  water: DropIcon,
  wind: WindIcon,
  steam: SteamIcon,
};

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4v10M8 10l4 4 4-4M5 18h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RadioIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="14" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.2 10.8a5.5 5.5 0 0 1 7.6 0M6 8.2a8.5 8.5 0 0 1 12 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

function ThermoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10 13.5V6.5a2 2 0 1 1 4 0v7a3.5 3.5 0 1 1-4 0Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 9v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DropIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function WindIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 9h11a2.5 2.5 0 1 0-2.5-2.5M4 13h13a2.5 2.5 0 1 1-2.5 2.5M4 17h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SteamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 18h14M8 18V9l4-4 4 4v9M9.5 12h5M9.5 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 17.5V20h2.5L18 8.5 15.5 6 4 17.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13.8 7.7 16.3 10.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
