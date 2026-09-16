"use client";

import { useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/projects";
import { hydrateAlertEvents, type AlertEvent } from "@/lib/alert-events";
import { hydrateGhgSources } from "@/lib/ghg-sources";
import { hydrateMeterReadings } from "@/lib/meter-readings";
import { hydrateDevices } from "@/lib/devices";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

const YEAR_OPTIONS = [2024, 2025, 2026, 2027];

const ENERGY = [
  { day: "07-01", kwh: 198.4 },
  { day: "07-02", kwh: 186.2 },
  { day: "07-03", kwh: 172.8 },
  { day: "07-04", kwh: 96.5 },
  { day: "07-05", kwh: 210.6 },
  { day: "07-06", kwh: 148.3 },
  { day: "07-07", kwh: 88.1 },
  { day: "07-08", kwh: 205.9 },
  { day: "07-09", kwh: 168.4 },
  { day: "07-10", kwh: 46.4 },
  { day: "07-11", kwh: 194.7 },
  { day: "07-12", kwh: 221.5 },
  { day: "07-13", kwh: 158.2 },
  { day: "07-14", kwh: 74.6 },
  { day: "07-15", kwh: 236.8 },
  { day: "07-16", kwh: 182.3 },
  { day: "07-17", kwh: 129.7 },
  { day: "07-18", kwh: 214.1 },
  { day: "07-19", kwh: 216.9 },
];

const DEVICE_STATUS = [
  { label: "BÌNH THƯỜNG", value: 12, color: "#43a047" },
  { label: "CẢNH BÁO", value: 2, color: "#ef8d3a" },
  { label: "NGOẠI TUYẾN", value: 1, color: "#9aa3af" },
];

type DashboardAlert = { time: string; point: string; param: string; value: string };

const ALERTS: DashboardAlert[] = [
  { time: "2026-07-19 07:38:48", point: "Tủ điện văn phòng", param: "F_avg", value: "49.79" },
  { time: "2026-07-19 07:38:38", point: "Tủ điện văn phòng", param: "F_avg", value: "50.42" },
  { time: "2026-07-19 07:38:27", point: "Tủ điện văn phòng", param: "F_avg", value: "50.32" },
  { time: "2026-07-19 07:38:17", point: "Tủ điện văn phòng", param: "F_avg", value: "49.99" },
];

export function ClientDashboard({ project }: { project: Project }) {
  const [energy, setEnergy] = useState(ENERGY);
  const [deviceStatus, setDeviceStatus] = useState(DEVICE_STATUS);
  const [alerts, setAlerts] = useState<DashboardAlert[]>(ALERTS);
  const [co2, setCo2] = useState(2.21);

  useEffect(() => {
    let active = true;
    const reload = () => {
      void Promise.all([
        hydrateMeterReadings(project.id),
        hydrateAlertEvents(project.id),
        hydrateDevices(),
        hydrateGhgSources(project.id),
      ]).then(([readings, alertEvents, devices, sources]) => {
        if (!active) return;
        const energyRows = readings.filter((row) => row.metric === "energy");
        if (energyRows.length) {
          setEnergy(energyRows.map((row) => ({
            day: row.recordedAt.slice(5, 10),
            kwh: row.value,
          })));
        }
        if (devices.length) {
          const counts = devices.reduce((result, device) => {
            if (device.status === "offline") result.offline += 1;
            else if (device.status === "maintenance") result.warning += 1;
            else result.normal += 1;
            return result;
          }, { normal: 0, warning: 0, offline: 0 });
          setDeviceStatus([
            { label: "BÌNH THƯỜNG", value: counts.normal, color: "#43a047" },
            { label: "CẢNH BÁO", value: counts.warning, color: "#ef8d3a" },
            { label: "NGOẠI TUYẾN", value: counts.offline, color: "#9aa3af" },
          ]);
        }
        if (alertEvents.length) setAlerts(alertEvents.slice(0, 8).map((event: AlertEvent) => ({
          time: event.occurredAt,
          point: event.pointName ?? event.meterPointId ?? "--",
          param: event.parameter,
          value: `${event.value}${event.unit ? ` ${event.unit}` : ""}`,
        })));
        const totalCo2 = sources.reduce((sum, source) => sum + (source.tons ?? 0), 0);
        if (totalCo2 > 0) setCo2(totalCo2);
      }).catch(() => undefined);
    };
    reload();
    window.addEventListener("ems-alert-events-changed", reload);
    return () => {
      active = false;
      window.removeEventListener("ems-alert-events-changed", reload);
    };
  }, [project.id]);

  const energyMax = Math.max(...energy.map((item) => item.kwh), 0);
  const energyMin = Math.min(...energy.map((item) => item.kwh), 0);
  const energyTotal = energy.reduce((sum, item) => sum + item.kwh, 0);

  return (
    <div className="mx-auto h-full max-w-[1480px] overflow-y-auto px-5 py-5 lg:px-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-800">
            {project.customer}
          </h1>
        </div>
        <MonthPicker defaultMonth={7} defaultYear={2026} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardCard title="ĐIỆN NĂNG TIÊU THỤ" className="xl:col-span-2">
          <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <p>
              Lớn nhất:{" "}
              <span className="font-semibold text-emerald-700">{energyMax.toFixed(1)} kWh</span>
            </p>
            <p>
              Nhỏ nhất:{" "}
              <span className="font-semibold text-emerald-600">{energyMin.toFixed(1)} kWh</span>
            </p>
            <p>
              Tổng:{" "}
              <span className="font-semibold text-slate-800">{energyTotal.toFixed(1)} kWh</span>
            </p>
          </div>
          <EnergyChart data={energy} />
        </DashboardCard>

        <DashboardCard title="PHÁT THẢI CO2">
          <DonutChart
            color="#1e6b45"
            value={co2.toFixed(2)}
            unit="tấn CO2 tđ"
            caption={
              <span className="inline-flex items-center gap-1">
                Giảm thiểu 12% so với tháng trước
                <span className="text-emerald-600">↓</span>
              </span>
            }
          />
        </DashboardCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="CHI PHÍ">
          <DonutChart
            color="#1e5f8a"
            value={(energyTotal * 1.912).toFixed(2)}
            unit="nghìn VNĐ"
            caption="Tủ điện văn phòng: 100% chi phí hệ thống"
          />
        </DashboardCard>

        <DashboardCard title="TRẠNG THÁI THIẾT BỊ">
          <DeviceStatusChart items={deviceStatus} />
        </DashboardCard>

        <DashboardCard title="NHẬT KÝ CẢNH BÁO" className="lg:col-span-2">
          <AlertLogTable rows={alerts} />
        </DashboardCard>
      </div>
    </div>
  );
}

function MonthPicker({
  defaultMonth,
  defaultYear,
}: {
  defaultMonth: number;
  defaultYear: number;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const label = `Tháng ${String(month).padStart(2, "0")}/${year}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:bg-slate-50"
      >
        <CalendarIcon className="h-4 w-4 text-slate-400" />
        {label}
        <span className="text-[10px] text-slate-400">▾</span>
      </button>

      {open ? (
        <div className="absolute top-11 right-0 z-20 w-[220px] rounded-md border border-slate-200 bg-white p-3 shadow-md">
          <div className="mb-2 flex items-center gap-2">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              aria-label="Năm"
            >
              {YEAR_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <ul role="listbox" aria-label="Chọn tháng" className="grid grid-cols-3 gap-1.5">
            {MONTH_OPTIONS.map((value) => {
              const active = value === month;
              return (
                <li key={value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setMonth(value);
                      setOpen(false);
                    }}
                    className={`h-9 w-full rounded-md text-[12px] font-medium transition-colors ${
                      active
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {String(value).padStart(2, "0")}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function DashboardCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}
    >
      <div className="mb-2 flex items-start justify-between">
        <h2 className="text-[12px] font-semibold tracking-[0.08em] text-slate-400">
          {title}
        </h2>
        <button
          type="button"
          className="text-slate-300 hover:text-slate-500"
          aria-label="Phóng to"
        >
          <ExpandIcon className="h-4 w-4" />
        </button>
      </div>
      {children}
    </section>
  );
}

function EnergyChart({ data }: { data: { day: string; kwh: number }[] }) {
  const max = Math.max(...data.map((item) => item.kwh));

  return (
    <div className="flex h-[250px] items-end gap-1.5 pb-1">
      {data.map((item) => (
        <div key={item.day} className="flex min-w-0 flex-1 flex-col items-center">
          <div className="flex h-[220px] w-full items-end">
            <div
              className="mx-auto w-[78%] rounded-t-md bg-emerald-600 transition-all hover:bg-emerald-500"
              style={{ height: `${(item.kwh / max) * 100}%` }}
              title={`${item.day}: ${item.kwh} kWh`}
            />
          </div>
          <span className="mt-1.5 text-[10px] text-slate-400">{item.day}</span>
        </div>
      ))}
    </div>
  );
}

function DeviceStatusChart({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  const ticks = [15, 10, 5, 0];
  const yMax = 15;

  return (
    <div className="flex h-[280px] gap-2 pt-2">
      <div className="flex h-[230px] flex-col justify-between py-0.5 text-[11px] text-slate-400">
        {ticks.map((tick) => (
          <span key={tick} className="leading-none">
            {tick}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="absolute inset-x-0 top-0 h-[230px]">
          {ticks.map((tick, i) => (
            <div
              key={tick}
              className="absolute inset-x-0 border-t border-slate-100"
              style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
            />
          ))}
        </div>
        <div className="relative flex h-[230px] items-end justify-around px-4">
          {items.map((item) => (
            <div key={item.label} className="flex h-full w-[28%] flex-col items-center justify-end">
              <span className="mb-1 text-sm font-semibold text-slate-700">
                {item.value}
              </span>
              <div
                className="w-full rounded-t-md"
                style={{
                  height: `${(item.value / yMax) * 100}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-around px-4">
          {items.map((item) => (
            <p
              key={item.label}
              className="w-[28%] text-center text-[10px] font-medium tracking-wide text-slate-400"
            >
              {item.label}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function DonutChart({
  color,
  value,
  unit,
  caption,
}: {
  color: string;
  value: string;
  unit: string;
  caption: React.ReactNode;
}) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * 0.82;

  return (
    <div className="flex flex-col items-center pt-1">
      <div className="relative h-[210px] w-[210px]">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#edf0f3"
            strokeWidth="22"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="22"
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap="butt"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[26px] font-bold leading-none text-slate-800">{value}</p>
          <p className="mt-1.5 text-xs text-slate-400">{unit}</p>
        </div>
      </div>
      <p className="mt-1 text-center text-[12px] text-slate-400">{caption}</p>
    </div>
  );
}

function AlertLogTable({ rows: sourceRows }: { rows: DashboardAlert[] }) {
  const [time, setTime] = useState("");
  const [point, setPoint] = useState("all");
  const [param, setParam] = useState("");
  const [value, setValue] = useState("");

  const rows = sourceRows.filter((row) => {
    const matchTime = !time || row.time.includes(time);
    const matchPoint = point === "all" || row.point === point;
    const matchParam =
      !param || row.param.toLowerCase().includes(param.toLowerCase());
    const matchValue = !value || row.value.includes(value);
    return matchTime && matchPoint && matchParam && matchValue;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[13px]">
        <thead>
          <tr className="text-[12px] font-medium text-slate-500">
            <th className="pb-2 font-medium">
              Thời gian <span className="text-slate-300">↕</span>
            </th>
            <th className="pb-2 font-medium">
              Điểm đo <span className="text-slate-300">↕</span>
            </th>
            <th className="pb-2 font-medium">
              Thông số <span className="text-slate-300">↕</span>
            </th>
            <th className="pb-2 font-medium">
              Giá trị <span className="text-slate-300">↕</span>
            </th>
          </tr>
          <tr className="text-slate-400">
            <th className="pb-2 pr-2 font-normal">
              <span className="relative block">
                <input
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-8 w-full rounded border border-slate-200 pr-7 pl-2 text-xs outline-none focus:border-emerald-500"
                />
                <FilterMark />
              </span>
            </th>
            <th className="pb-2 pr-2 font-normal">
              <span className="relative block">
                <select
                  value={point}
                  onChange={(e) => setPoint(e.target.value)}
                  className="h-8 w-full appearance-none rounded border border-slate-200 pr-7 pl-2 text-xs outline-none focus:border-emerald-500"
                >
                  <option value="all" />
                  {Array.from(new Set(sourceRows.map((row) => row.point))).map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <FilterMark />
              </span>
            </th>
            <th className="pb-2 pr-2 font-normal">
              <span className="relative block">
                <input
                  value={param}
                  onChange={(e) => setParam(e.target.value)}
                  className="h-8 w-full rounded border border-slate-200 pr-7 pl-2 text-xs outline-none focus:border-emerald-500"
                />
                <FilterMark />
              </span>
            </th>
            <th className="pb-2 font-normal">
              <span className="relative block">
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-8 w-full rounded border border-slate-200 pr-7 pl-2 text-xs outline-none focus:border-emerald-500"
                />
                <FilterMark />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.time} className="border-t border-slate-100 text-slate-600">
              <td className="py-2.5 whitespace-nowrap">{row.time}</td>
              <td className="py-2.5">{row.point}</td>
              <td className="py-2.5">
                <button type="button" className="text-emerald-600 hover:underline">
                  {row.param}
                </button>
              </td>
              <td className="py-2.5">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FilterMark() {
  return (
    <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-slate-300">
      ▾
    </span>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M20 15v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5V7M16 3.5V7M4 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
