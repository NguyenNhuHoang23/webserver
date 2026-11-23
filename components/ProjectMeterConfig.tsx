"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ProjectConfigHeader } from "@/components/ProjectConfigHeader";
import {
  EXTRA_METER_TYPE_SUGGESTIONS,
  METER_TYPES,
  resolveMeterTypes,
  upsertProject,
  type MeterType,
  type Project,
} from "@/lib/projects";
import { upsertMeterTypeDef } from "@/lib/meter-types";
import { projectConfigPath } from "@/lib/project-config";
import { hydrateClientMeters, orderMetersByTree, type ClientMeter } from "@/lib/client-meters";
import { hydrateDevices, type CatalogDevice } from "@/lib/devices";
import { hydrateAlertEvents } from "@/lib/alert-events";
import {
  isGatewaySampleOnline,
  loadProjectGatewayLatest,
  type ProjectGatewaySample,
} from "@/lib/gateway-series";
import { registerToKwh } from "@/lib/meter-parameters";

type Energy = string;
type DeviceKind = "meter" | "inverter" | "thermo" | "water" | "wind" | "steam" | "air";
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

const PAGE_SIZE = 10;

function flatten(points: MeterPoint[]): MeterPoint[] {
  return points.flatMap((p) => [p, ...(p.children ?? [])]);
}

function meterKind(meter: ClientMeter): DeviceKind {
  if (meter.utility === "Nước") return "water";
  if (meter.utility === "Nhiệt") return "thermo";
  if (meter.utility === "Hơi") return "steam";
  if (meter.utility === "Khí nén") return "air";
  return meter.type.toLowerCase().includes("inverter") ? "inverter" : "meter";
}

function meterUnit(utility: string) {
  if (utility === "Nước") return "m³/h";
  if (utility === "Nhiệt") return "°C";
  if (utility === "Hơi") return "t/h";
  if (utility === "Khí nén") return "Nm³/h";
  return "kWh";
}

function liveValueFromSample(utility: string, sample: ProjectGatewaySample | undefined): number | null {
  if (!sample) return null;
  const values = sample.values;
  if (utility === "Điện") {
    if (Number.isFinite(values.EPaed)) return registerToKwh(values.EPaed);
    if (Number.isFinite(values.Papt)) return values.Papt;
    return null;
  }
  if (utility === "Nước" || utility === "Hơi" || utility === "Khí nén") {
    const flow = values.Flow ?? values.flow ?? values.Q;
    return Number.isFinite(flow) ? flow : null;
  }
  if (utility === "Nhiệt") {
    const temp = values.Temp ?? values.temp ?? values.T;
    return Number.isFinite(temp) ? temp : null;
  }
  return null;
}

function fromDbMeters(
  meters: ClientMeter[],
  devices: CatalogDevice[],
  samples: ProjectGatewaySample[],
) {
  const sampleByMeter = new Map(samples.map((sample) => [sample.meterPointId, sample]));
  return orderMetersByTree(meters).map((meter) => {
    const device = devices.find((item) => item.id === meter.deviceId);
    const sample = sampleByMeter.get(meter.id);
    const linked = Boolean(device || meter.serialNumber?.trim());
    const online = linked && isGatewaySampleOnline(sample?.at);
    const unit = meterUnit(meter.utility);
    const displayUnit =
      meter.utility === "Điện" && sample && Number.isFinite(sample.values.EPaed) ? "kWh" : unit;
    return {
      id: meter.id,
      name: meter.name,
      sn: device?.sn ?? meter.serialNumber ?? "Chưa gán thiết bị",
      type: meter.type,
      energy: meter.utility,
      kind: meterKind(meter),
      status: online ? "connected" : "disconnected",
      value: liveValueFromSample(meter.utility, sample),
      unit: displayUnit,
      ...(meter.parentId ? { parentId: meter.parentId } : {}),
    } satisfies MeterPoint;
  });
}

export function ProjectMeterConfig({ project }: { project: Project }) {
  const [energies, setEnergies] = useState<MeterType[]>(() => resolveMeterTypes(project));
  const [energyFilter, setEnergyFilter] = useState<"all" | MeterType>("all");
  const [addingType, setAddingType] = useState(false);
  const [newType, setNewType] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [allPoints, setAllPoints] = useState<MeterPoint[]>([]);
  const [meterDataReady, setMeterDataReady] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    setEnergies(resolveMeterTypes(project));
  }, [project]);

  function persistEnergies(next: MeterType[]) {
    setEnergies(next);
    void upsertProject({ ...project, meterTypes: next }).catch(() => undefined);
  }

  const suggestions = useMemo(
    () =>
      [...METER_TYPES, ...EXTRA_METER_TYPE_SUGGESTIONS].filter(
        (item) => !energies.includes(item),
      ),
    [energies],
  );

  function addEnergyType(raw: string) {
    const label = raw.trim();
    if (!label || energies.includes(label)) return;
    const next = [...energies, label];
    persistEnergies(next);
    void upsertMeterTypeDef({ name: label, description: "" }).catch(() => undefined);
    setEnergyFilter(label);
    setPage(1);
    setNewType("");
    setAddingType(false);
  }

  useEffect(() => {
    let active = true;
    void Promise.all([
      hydrateClientMeters(project.id),
      hydrateDevices(),
      loadProjectGatewayLatest(project.id),
      hydrateAlertEvents(project.id),
    ]).then(([meters, devices, samples, alerts]) => {
      if (!active) return;
      setAllPoints(fromDbMeters(meters, devices, samples));
      setMeterDataReady(true);
      setAlertCount(alerts.filter((event) => event.status !== "resolved").length);
    }).catch(() => {
      if (!active) return;
      setAllPoints([]);
      setMeterDataReady(true);
    });
    return () => {
      active = false;
    };
  }, [project.id]);

  const flatPoints = useMemo(
    () => (meterDataReady ? flatten(allPoints) : []),
    [allPoints, meterDataReady],
  );
  const connectedPoints = useMemo(
    () => flatPoints.filter((item) => item.status === "connected").length,
    [flatPoints],
  );
  const disconnectedPoints = useMemo(
    () => flatPoints.filter((item) => item.status !== "connected").length,
    [flatPoints],
  );

  const filterOptions = useMemo(() => {
    const fromPoints = flatPoints.map((point) => point.energy).filter(Boolean);
    return Array.from(new Set([...energies, ...fromPoints]));
  }, [energies, flatPoints]);

  const filteredRoots = useMemo(() => {
    const q = query.trim().toLowerCase();

    function match(point: MeterPoint): boolean {
      const energyOk = energyFilter === "all" || point.energy === energyFilter;
      const textOk =
        !q ||
        point.name.toLowerCase().includes(q) ||
        point.id.toLowerCase().includes(q) ||
        point.sn.toLowerCase().includes(q) ||
        point.type.toLowerCase().includes(q);
      return energyOk && textOk;
    }

    const next: MeterPoint[] = [];
    for (const root of meterDataReady ? allPoints : []) {
      const children = (root.children ?? []).filter(match);
      if (match(root)) {
        next.push(root.children ? { ...root, children } : root);
      } else if (children.length) {
        next.push({ ...root, children });
      }
    }
    return next;
  }, [allPoints, energyFilter, meterDataReady, query]);

  const totalPages = Math.max(1, Math.ceil(filteredRoots.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filteredRoots.slice(start, start + PAGE_SIZE);

  function toggleExpand(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <ProjectConfigHeader
        project={project}
        actions={
          <Link
            href={projectConfigPath(project.id, "add-meter")}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Thêm mới điểm đo
          </Link>
        }
      />
          <div className="mb-5 grid gap-3.5 sm:gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="TỔNG ĐIỂM ĐO"
              value={String(flatPoints.length)}
            />
            <StatCard
              label="ĐANG KẾT NỐI"
              value={String(connectedPoints)}
              valueClass="text-emerald-600"
            />
            <StatCard
              label="KHÔNG KẾT NỐI"
              value={String(disconnectedPoints)}
              valueClass={disconnectedPoints > 0 ? "text-amber-500" : "text-slate-900"}
            />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEnergyFilter("all");
                setPage(1);
              }}
              className={`inline-flex h-8 items-center rounded-full px-3 text-sm font-semibold transition-colors ${
                energyFilter === "all"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              Tất cả
            </button>
            {filterOptions.map((energy) => {
              const active = energyFilter === energy;
              return (
                <button
                  key={energy}
                  type="button"
                  onClick={() => {
                    setEnergyFilter(energy);
                    setPage(1);
                  }}
                  className={`inline-flex h-8 items-center rounded-full px-3 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {energy}
                </button>
              );
            })}
            {addingType ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEnergyType(newType);
                    }
                    if (e.key === "Escape") {
                      setAddingType(false);
                      setNewType("");
                    }
                  }}
                  placeholder="VD: Nước, Khí nén"
                  list="meter-type-suggestions"
                  className="h-8 w-40 rounded-full border border-emerald-500 bg-white px-3 text-sm outline-none"
                />
                <datalist id="meter-type-suggestions">
                  {suggestions.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={() => addEnergyType(newType)}
                  className="h-8 rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs"
                >
                  Thêm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingType(false);
                    setNewType("");
                  }}
                  className="h-8 rounded-full px-2 text-xs text-slate-500 hover:bg-slate-100"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingType(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg text-emerald-600 ring-1 ring-slate-200 hover:bg-emerald-50 transition-colors"
                aria-label="Thêm loại điểm đo"
                title="Thêm loại điểm đo vào dự án"
              >
                +
              </button>
            )}
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
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 transition-colors"
              />
            </label>
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
                  {!meterDataReady ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                        Đang tải điểm đo của dự án...
                      </td>
                    </tr>
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                        Chưa có điểm đo nào được cấu hình cho dự án.
                      </td>
                    </tr>
                  ) : null}
                  {meterDataReady && pageRows.map((point) => {
                    const hasChildren = Boolean(point.children?.length);
                    const isOpen = expanded.has(point.id);
                    return (
                      <DeviceRows
                        key={point.id}
                        projectId={project.id}
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

    </div>
  );
}

function DeviceRows({
  projectId,
  point,
  depth,
  hasChildren,
  isOpen,
  onToggle,
}: {
  projectId: string;
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
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
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
              {point.status === "connected"
                ? "Online"
                : point.sn === "Chưa gán thiết bị"
                  ? "Chưa gắn đồng hồ"
                  : "Offline"}
            </span>
          </span>
        </td>
        <td className="px-5 py-3.5">
          {point.value == null ? (
            <span className="font-semibold text-slate-400">
              --.- <span className="text-xs font-medium">{point.unit}</span>
            </span>
          ) : (
            <span className="text-base font-bold text-emerald-700">
              {formatValue(point.value, point.unit)}{" "}
              <span className="text-xs font-semibold text-emerald-600">{point.unit}</span>
            </span>
          )}
        </td>
        <td className="px-5 py-3.5">
          <div className="flex justify-end">
            <Link
              href={`/chinh-sua-du-an/${encodeURIComponent(projectId)}/diem-do/${encodeURIComponent(point.id)}`}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-emerald-600"
              aria-label="Chỉnh sửa điểm đo"
              title="Chỉnh sửa điểm đo"
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
            projectId={projectId}
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
  hint?: ReactNode;
  valueClass?: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <p className="text-[11px] font-semibold tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${valueClass}`}>{value}</p>
      {hint ? <p className="mt-1.5 text-xs font-medium">{hint}</p> : null}
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
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold disabled:opacity-40 transition-colors ${
        active ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
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
  air: WindIcon,
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
