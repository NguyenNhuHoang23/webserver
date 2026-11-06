"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Project } from "@/lib/projects";
import {
  normalizeAlertConfig,
  resolveConfiguredSeverity,
  type AlertConfig,
  type AlertSeverityLevel,
} from "@/lib/alert-config";
import {
  alertCategory,
  hydrateAlertEvents,
  loadAlertEvents,
  type AlertEvent,
} from "@/lib/alert-events";
import { hydrateProjectSettings } from "@/lib/project-settings";
import { formatStoredVietnam, vietnamFromStored } from "@/lib/vietnam-time";

export type AlertCategory =
  | "frequency"
  | "voltage"
  | "current"
  | "unbalance"
  | "harmonics"
  | "connectivity"
  | "power";

export interface AlertItem {
  id: string;
  code: string;
  timestamp: string;
  occurredAt: string;
  pointCode: string;
  pointName: string;
  location: string;
  parameter: string;
  paramName: string;
  actualValue: string;
  thresholdValue: string;
  unit: string;
  severity: AlertSeverityLevel;
  category: AlertCategory;
  message: string;
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEAR_OPTIONS = [2024, 2025, 2026, 2027];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function dbAlertToItem(event: AlertEvent, config: AlertConfig): AlertItem {
  const parameterNames: Record<string, string> = {
    F_avg: "Tần số trung bình",
    U_unb: "Độ mất cân bằng điện áp",
    I_rms: "Dòng điện hiệu dụng",
    P_sum: "Công suất hữu công",
  };
  const category = alertCategory(event.parameter, event.category) as AlertCategory;
  const storedSeverity =
    event.severity === "critical" || event.severity === "info" || event.severity === "warning"
      ? event.severity
      : "warning";
  return {
    id: event.id,
    code: event.parameter,
    timestamp: formatStoredVietnam(event.occurredAt) ?? event.occurredAt,
    occurredAt: event.occurredAt,
    pointCode: event.pointCode ?? event.meterPointId ?? "--",
    pointName: event.pointName ?? "Điểm đo chưa gán",
    location: event.utility ?? "EMS",
    parameter: event.parameter,
    paramName: parameterNames[event.parameter] ?? event.parameter,
    actualValue: String(event.value),
    thresholdValue: event.thresholdValue == null ? "--" : String(event.thresholdValue),
    unit: event.unit ?? "",
    severity: resolveConfiguredSeverity(category, storedSeverity, config),
    category,
    message: event.message ?? `Sự kiện ${event.parameter} tại ${event.pointName ?? "điểm đo"}`,
  };
}

function inMonth(occurredAt: string, year: number, month: number) {
  const parts = vietnamFromStored(occurredAt);
  if (parts) return parts.year === year && parts.month === month;
  const match = occurredAt.match(/^(\d{4})-(\d{2})/);
  if (!match) return false;
  return Number(match[1]) === year && Number(match[2]) === month;
}

function severityLabel(severity: AlertSeverityLevel) {
  if (severity === "critical") return "Nghiêm trọng";
  if (severity === "info") return "Thông tin";
  return "Cảnh báo";
}

export function ClientAlerts({ project }: { project: Project }) {
  const now = new Date();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>(() => normalizeAlertConfig(null));
  const [search, setSearch] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPoint, setSelectedPoint] = useState<string>("all");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [liveMode, setLiveMode] = useState(true);
  const [inspectAlert, setInspectAlert] = useState<AlertItem | null>(null);

  const reload = () => {
    void Promise.all([
      hydrateAlertEvents(project.id),
      hydrateProjectSettings(project.id, { force: true }),
    ])
      .then(([events, settings]) => {
        const config = normalizeAlertConfig(settings.alertConfig);
        setAlertConfig(config);
        const rows = (events.length ? events : loadAlertEvents(project.id)).map((event) =>
          dbAlertToItem(event, config),
        );
        setAlerts(rows);
      })
      .catch(() => setAlerts([]));
  };

  useEffect(() => {
    reload();
  }, [project.id]);

  useEffect(() => {
    if (!liveMode) return;
    const timer = window.setInterval(reload, 5000);
    return () => window.clearInterval(timer);
  }, [liveMode, project.id]);

  const monthAlerts = useMemo(
    () => alerts.filter((item) => inMonth(item.occurredAt, year, month)),
    [alerts, year, month],
  );

  const points = useMemo(() => {
    const map = new Map<string, string>();
    monthAlerts.forEach((a) => map.set(a.pointCode, a.pointName));
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [monthAlerts]);

  const filteredAlerts = useMemo(() => {
    return monthAlerts.filter((item) => {
      if (selectedSeverity !== "all" && item.severity !== selectedSeverity) return false;
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (selectedPoint !== "all" && item.pointCode !== selectedPoint) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          item.id.toLowerCase().includes(q) ||
          item.pointName.toLowerCase().includes(q) ||
          item.pointCode.toLowerCase().includes(q) ||
          item.parameter.toLowerCase().includes(q) ||
          item.message.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [monthAlerts, selectedSeverity, selectedCategory, selectedPoint, search]);

  const stats = useMemo(() => {
    const total = monthAlerts.length;
    const critical = monthAlerts.filter((a) => a.severity === "critical").length;
    const warning = monthAlerts.filter((a) => a.severity === "warning").length;
    const info = monthAlerts.filter((a) => a.severity === "info").length;
    return { total, critical, warning, info };
  }, [monthAlerts]);

  const exportCsv = () => {
    const headers = [
      "Mã cảnh báo",
      "Thời gian",
      "Mã điểm đo",
      "Tên điểm đo",
      "Tham số",
      "Giá trị",
      "Ngưỡng",
      "Đơn vị",
      "Mức độ",
      "Nội dung",
    ];
    const rows = filteredAlerts.map((a) => [
      a.id,
      a.timestamp,
      a.pointCode,
      `"${a.pointName}"`,
      a.parameter,
      a.actualValue,
      a.thresholdValue,
      a.unit,
      severityLabel(a.severity),
      `"${a.message}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `nhat-ky-canh-bao-${project.id}-${year}${pad2(month)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
      <div className="shrink-0 border-b border-slate-200/80 bg-white px-5 py-4 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <AlertBellIcon className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Nhật ký cảnh báo</h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Theo dõi thời điểm phát sinh cảnh báo trong tháng · {project.name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setLiveMode(!liveMode)}
              className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-all ${
                liveMode
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-800 shadow-xs"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${liveMode ? "animate-pulse bg-emerald-500" : "bg-slate-400"}`}
              />
              {liveMode ? "Trực tiếp (Live 5s)" : "Tạm dừng đồng bộ"}
            </button>

            <Link
              href={`/du-an/${project.id}/cau-hinh`}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50"
            >
              <GearIcon className="h-3.5 w-3.5 text-slate-500" />
              Cấu hình mức độ
            </Link>

            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Xuất nhật ký CSV
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Tổng tháng {pad2(month)}/{year}
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
              <span className="text-[11px] text-slate-400">cảnh báo</span>
            </div>
          </div>

          <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 p-3">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-rose-700">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Nghiêm trọng
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-600">{stats.critical}</span>
              <span className="text-[11px] text-rose-500">trong tháng</span>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              Cảnh báo
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-600">{stats.warning}</span>
              <span className="text-[11px] text-amber-500">trong tháng</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Thông tin
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">{stats.info}</span>
              <span className="text-[11px] text-slate-500">trong tháng</span>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] max-w-[320px] flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã lỗi, điểm đo, thông số..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 py-0 pr-3 pl-8 text-xs text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">Tất cả mức độ</option>
            <option value="critical">Nghiêm trọng</option>
            <option value="warning">Cảnh báo</option>
            <option value="info">Thông tin</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">Tất cả danh mục</option>
            <option value="frequency">Tần số</option>
            <option value="voltage">Điện áp</option>
            <option value="current">Dòng điện</option>
            <option value="unbalance">Mất cân bằng pha</option>
            <option value="harmonics">Sóng hài</option>
            <option value="power">Công suất</option>
            <option value="connectivity">Kết nối</option>
          </select>

          <select
            value={selectedPoint}
            onChange={(e) => setSelectedPoint(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">Tất cả điểm đo</option>
            {points.map((p) => (
              <option key={p.code} value={p.code}>
                ({p.code}) {p.name}
              </option>
            ))}
          </select>

          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            {MONTH_OPTIONS.map((value) => (
              <option key={value} value={value}>
                Tháng {pad2(value)}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            {YEAR_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  <th className="px-4 py-3.5">Mức độ</th>
                  <th className="px-3 py-3.5">Thời điểm</th>
                  <th className="px-3 py-3.5">Điểm đo</th>
                  <th className="px-3 py-3.5">Thông số</th>
                  <th className="px-3 py-3.5">Thực tế / Ngưỡng</th>
                  <th className="px-3 py-3.5">Nội dung</th>
                  <th className="px-4 py-3.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <CheckCircleIcon className="mb-2 h-10 w-10 text-emerald-500 opacity-80" />
                        <p className="text-sm font-semibold text-slate-700">
                          Không có cảnh báo trong tháng {pad2(month)}/{year}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Đổi tháng/năm hoặc bộ lọc để xem các sự kiện khác
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                            item.severity === "critical"
                              ? "border-rose-200 bg-rose-100 text-rose-700"
                              : item.severity === "warning"
                                ? "border-amber-200 bg-amber-100 text-amber-800"
                                : "border-slate-200 bg-slate-100 text-slate-700"
                          }`}
                        >
                          {severityLabel(item.severity)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-[11.5px] whitespace-nowrap text-slate-600">
                        {item.timestamp}
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="font-semibold text-slate-800">{item.pointName}</p>
                        <p className="text-[11px] text-slate-400">
                          <span className="font-mono font-medium text-emerald-700">{item.pointCode}</span>
                          <span> · {item.location}</span>
                        </p>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-slate-800">
                          {item.parameter}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-slate-500">{item.paramName}</span>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span
                          className={`text-sm font-bold ${
                            item.severity === "critical"
                              ? "text-rose-600"
                              : item.severity === "warning"
                                ? "text-amber-600"
                                : "text-slate-800"
                          }`}
                        >
                          {item.actualValue}
                        </span>
                        <span className="text-[10.5px] text-slate-400"> / {item.thresholdValue}</span>
                        <span className="ml-1 text-[10px] font-medium text-slate-500">{item.unit}</span>
                      </td>
                      <td className="max-w-[280px] px-3 py-3.5">
                        <p className="line-clamp-2 leading-relaxed text-slate-700">{item.message}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectAlert(item)}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50"
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          Mức độ nghiêm trọng theo danh mục cấu hình tại Cấu hình → Cảnh báo
          {Object.values(alertConfig.severityByCategory).includes("critical")
            ? " (đã gán loại nghiêm trọng)."
            : "."}
        </p>
      </div>

      {inspectAlert ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase ${
                    inspectAlert.severity === "critical"
                      ? "bg-rose-100 text-rose-700"
                      : inspectAlert.severity === "warning"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {severityLabel(inspectAlert.severity)}
                </span>
                <h3 className="mt-1.5 text-lg font-bold text-slate-900">
                  {inspectAlert.pointName} ({inspectAlert.pointCode})
                </h3>
                <p className="font-mono text-xs text-slate-400">
                  {inspectAlert.id} · {inspectAlert.timestamp}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectAlert(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <div>
                <span className="text-[11px] text-slate-400">Thông số</span>
                <p className="font-bold text-slate-800">
                  {inspectAlert.paramName} ({inspectAlert.parameter})
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Vị trí</span>
                <p className="font-semibold text-slate-800">{inspectAlert.location}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Giá trị đo</span>
                <p className="text-base font-bold text-rose-600">
                  {inspectAlert.actualValue} {inspectAlert.unit}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Ngưỡng</span>
                <p className="text-base font-bold text-slate-700">
                  {inspectAlert.thresholdValue} {inspectAlert.unit}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Nội dung
              </span>
              <p className="mt-1 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed font-medium text-slate-800">
                {inspectAlert.message}
              </p>
            </div>

            <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setInspectAlert(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AlertBellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
