"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Project } from "@/lib/projects";

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertStatus = "active" | "acknowledged" | "resolved";
export type AlertCategory = "frequency" | "voltage" | "current" | "unbalance" | "harmonics" | "connectivity" | "power";

export interface AlertItem {
  id: string;
  code: string;
  timestamp: string;
  pointCode: string;
  pointName: string;
  location: string;
  parameter: string;
  paramName: string;
  actualValue: string;
  thresholdValue: string;
  unit: string;
  severity: AlertSeverity;
  category: AlertCategory;
  status: AlertStatus;
  message: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  notes?: string;
}

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: "ALT-2026-0891",
    code: "F_OVER_MAX",
    timestamp: "2026-09-12 16:28:44",
    pointCode: "DB-OFF1",
    pointName: "Tủ điện văn phòng",
    location: "Tầng 2 - Tòa nhà điều hành",
    parameter: "F_avg",
    paramName: "Tần số trung bình",
    actualValue: "50.48",
    thresholdValue: "50.20",
    unit: "Hz",
    severity: "warning",
    category: "frequency",
    status: "active",
    message: "Tần số lưới vượt ngưỡng cảnh báo trên (+0.48 Hz so với chuẩn 50 Hz)",
  },
  {
    id: "ALT-2026-0890",
    code: "U_UNB_CRITICAL",
    timestamp: "2026-09-12 16:15:10",
    pointCode: "DB-PROD",
    pointName: "Dây chuyền sản xuất A",
    location: "Xưởng gia công cơ khí 1",
    parameter: "U_unb",
    paramName: "Độ mất cân bằng điện áp",
    actualValue: "3.42",
    thresholdValue: "2.00",
    unit: "%",
    severity: "critical",
    category: "unbalance",
    status: "active",
    message: "Lệch pha điện áp 3 pha vượt mức nguy hiểm >3%, nguy cơ làm nóng động cơ",
  },
  {
    id: "ALT-2026-0889",
    code: "I_OVERLOAD_WARN",
    timestamp: "2026-09-12 15:42:01",
    pointCode: "AIR-01",
    pointName: "Máy nén khí trạm 1",
    location: "Khu vực phụ trợ trung tâm",
    parameter: "I_rms_max",
    paramName: "Dòng điện hiệu dụng pha A",
    actualValue: "348.5",
    thresholdValue: "320.0",
    unit: "A",
    severity: "warning",
    category: "current",
    status: "acknowledged",
    acknowledgedBy: "Trần Kỹ Thuật",
    acknowledgedAt: "2026-09-12 15:50:22",
    notes: "Đang kiểm tra van xả áp suất máy nén",
    message: "Dòng điện định mức vượt quá 108% liên tục trong 5 phút",
  },
  {
    id: "ALT-2026-0888",
    code: "THD_VOLT_WARN",
    timestamp: "2026-09-12 14:10:35",
    pointCode: "DB-MAIN",
    pointName: "Nguồn tổng nhà máy",
    location: "Trạm biến áp 110kV / 22kV",
    parameter: "THD_U",
    paramName: "Độ méo sóng hài điện áp",
    actualValue: "5.8",
    thresholdValue: "5.0",
    unit: "%",
    severity: "warning",
    category: "harmonics",
    status: "resolved",
    acknowledgedBy: "Lê Vận Hành",
    acknowledgedAt: "2026-09-12 14:25:00",
    notes: "Đã bật dàn tụ bù chủ động AHF lọc sóng hài bậc 5",
    message: "Sóng hài điện áp tổng THD_u vượt quy chuẩn kỹ thuật điện lực",
  },
  {
    id: "ALT-2026-0887",
    code: "COMM_GATEWAY_TIMEOUT",
    timestamp: "2026-09-12 13:05:18",
    pointCode: "DB-HVAC",
    pointName: "Hệ thống HVAC",
    location: "Phòng kỹ thuật Chiller",
    parameter: "Ping_RTU",
    paramName: "Độ trễ Modbus RTU",
    actualValue: "Offline",
    thresholdValue: "3000 ms",
    unit: "ms",
    severity: "critical",
    category: "connectivity",
    status: "resolved",
    acknowledgedBy: "Nguyễn SCADA",
    acknowledgedAt: "2026-09-12 13:12:00",
    notes: "Đứt cáp RS485 converter tầng 3, đã bấm lại giắc",
    message: "Mất tín hiệu kết nối thiết bị đo quá 10 chu kỳ đo liên tiếp",
  },
  {
    id: "ALT-2026-0886",
    code: "PEAK_CONSUMPTION",
    timestamp: "2026-09-12 11:30:00",
    pointCode: "DB-MAIN",
    pointName: "Nguồn tổng nhà máy",
    location: "Trạm biến áp 110kV / 22kV",
    parameter: "P_active",
    paramName: "Công suất tác dụng",
    actualValue: "2420",
    thresholdValue: "2200",
    unit: "kW",
    severity: "info",
    category: "power",
    status: "resolved",
    acknowledgedBy: "Hệ thống tự động",
    acknowledgedAt: "2026-09-12 11:31:00",
    notes: "Tự động phân bổ chuyển tải lò hơi sang máy phát dầu dự phòng",
    message: "Vượt công suất cam kết vào khung giờ cao điểm EVN",
  },
  {
    id: "ALT-2026-0885",
    code: "VOLT_SAG_DETECTED",
    timestamp: "2026-09-12 09:14:02",
    pointCode: "DB-PROD",
    pointName: "Dây chuyền sản xuất A",
    location: "Xưởng gia công cơ khí 1",
    parameter: "U_sag",
    paramName: "Sụt áp tức thời pha B",
    actualValue: "182",
    thresholdValue: "200",
    unit: "V",
    severity: "critical",
    category: "voltage",
    status: "resolved",
    acknowledgedBy: "Nguyễn SCADA",
    acknowledgedAt: "2026-09-12 09:20:15",
    notes: "Sụt áp thoáng qua 120ms do khởi động động cơ công suất lớn trạm bơm",
    message: "Sụt áp tức thời < 85% Un kéo dài 14 chu kỳ",
  },
];

export function ClientAlerts({ project }: { project: Project }) {
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [search, setSearch] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPoint, setSelectedPoint] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [selectedAlertIds, setSelectedAlertIds] = useState<string[]>([]);
  const [liveMode, setLiveMode] = useState(true);
  const [inspectAlert, setInspectAlert] = useState<AlertItem | null>(null);
  const [inspectNote, setInspectNote] = useState("");

  // Điểm đo unique
  const points = useMemo(() => {
    const map = new Map<string, string>();
    alerts.forEach((a) => map.set(a.pointCode, a.pointName));
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [alerts]);

  // Bộ lọc
  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      if (selectedSeverity !== "all" && item.severity !== selectedSeverity) return false;
      if (selectedStatus !== "all" && item.status !== selectedStatus) return false;
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
  }, [alerts, selectedSeverity, selectedStatus, selectedCategory, selectedPoint, search]);

  // KPIs
  const stats = useMemo(() => {
    const total = alerts.length;
    const critical = alerts.filter((a) => a.severity === "critical" && a.status !== "resolved").length;
    const warning = alerts.filter((a) => a.severity === "warning" && a.status !== "resolved").length;
    const active = alerts.filter((a) => a.status === "active").length;
    const resolved = alerts.filter((a) => a.status === "resolved").length;
    return { total, critical, warning, active, resolved };
  }, [alerts]);

  // Toggle chọn 1 alert
  const toggleSelectOne = (id: string) => {
    setSelectedAlertIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle chọn tất cả
  const toggleSelectAll = () => {
    if (selectedAlertIds.length === filteredAlerts.length) {
      setSelectedAlertIds([]);
    } else {
      setSelectedAlertIds(filteredAlerts.map((a) => a.id));
    }
  };

  // Xác nhận hàng loạt
  const batchAcknowledge = () => {
    if (selectedAlertIds.length === 0) return;
    setAlerts((prev) =>
      prev.map((item) => {
        if (selectedAlertIds.includes(item.id) && item.status === "active") {
          return {
            ...item,
            status: "acknowledged",
            acknowledgedBy: "Người vận hành",
            acknowledgedAt: new Date().toISOString().replace("T", " ").substring(0, 19),
          };
        }
        return item;
      })
    );
    setSelectedAlertIds([]);
  };

  // Đóng / giải quyết hàng loạt
  const batchResolve = () => {
    if (selectedAlertIds.length === 0) return;
    setAlerts((prev) =>
      prev.map((item) => {
        if (selectedAlertIds.includes(item.id)) {
          return {
            ...item,
            status: "resolved",
            acknowledgedBy: item.acknowledgedBy || "Người vận hành",
            acknowledgedAt: item.acknowledgedAt || new Date().toISOString().replace("T", " ").substring(0, 19),
          };
        }
        return item;
      })
    );
    setSelectedAlertIds([]);
  };

  // Lưu ghi chú chi tiết
  const saveInspectNote = () => {
    if (!inspectAlert) return;
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === inspectAlert.id
          ? {
              ...a,
              notes: inspectNote,
              status: a.status === "active" ? "acknowledged" : a.status,
              acknowledgedBy: a.acknowledgedBy || "Kỹ sư ca trực",
              acknowledgedAt: a.acknowledgedAt || new Date().toISOString().replace("T", " ").substring(0, 19),
            }
          : a
      )
    );
    setInspectAlert(null);
  };

  // Xuất file CSV nhật ký cảnh báo
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
      "Trạng thái",
      "Nội dung",
      "Người xác nhận",
      "Ghi chú",
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
      a.severity === "critical" ? "Nghiêm trọng" : a.severity === "warning" ? "Cảnh báo" : "Thông tin",
      a.status === "active" ? "Đang xảy ra" : a.status === "acknowledged" ? "Đã xác nhận" : "Đã xử lý",
      `"${a.message}"`,
      `"${a.acknowledgedBy || ""}"`,
      `"${a.notes || ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nhat-ky-canh-bao-${project.id}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
      {/* Top Banner Header */}
      <div className="shrink-0 border-b border-slate-200/80 bg-white px-5 py-4 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <AlertBellIcon className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Trung Tâm Giám Sát & Xử Lý Cảnh Báo
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Theo dõi sự cố, ngưỡng cảnh báo điện năng & an toàn phụ tải dự án {project.name}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Mode Toggle */}
            <button
              type="button"
              onClick={() => setLiveMode(!liveMode)}
              className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-all ${
                liveMode
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-800 shadow-xs"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${liveMode ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {liveMode ? "Trực tiếp (Live 5s)" : "Tạm dừng đồng bộ"}
            </button>

            {/* Nút Cấu hình ngưỡng */}
            <Link
              href={`/du-an/${project.id}/cau-hinh`}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <GearIcon className="h-3.5 w-3.5 text-slate-500" />
              Cấu hình ngưỡng
            </Link>

            {/* Nút Xuất CSV */}
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Xuất nhật ký CSV
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tổng sự kiện</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
              <span className="text-[11px] text-slate-400">bản ghi</span>
            </div>
          </div>

          <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 p-3">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
              Nghiêm trọng (Active)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-600">{stats.critical}</span>
              <span className="text-[11px] text-rose-500">cần can thiệp</span>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
              Cảnh báo (Chưa xử lý)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-600">{stats.warning}</span>
              <span className="text-[11px] text-amber-500">vượt ngưỡng</span>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-3">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Đang chờ xử lý</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">{stats.active}</span>
              <span className="text-[11px] text-slate-500">chưa xác nhận</span>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Đã hoàn tất xử lý</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600">{stats.resolved}</span>
              <span className="text-[11px] text-emerald-600 font-medium">bình thường</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Ô tìm kiếm & các dropdown lọc */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative min-w-[220px] max-w-[320px] flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã lỗi, điểm đo, thông số..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 transition-all"
              />
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            {/* Mức độ */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Tất cả mức độ</option>
              <option value="critical">🔴 Nghiêm trọng</option>
              <option value="warning">🟠 Cảnh báo</option>
              <option value="info">🔵 Thông tin</option>
            </select>

            {/* Trạng thái */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Chưa xử lý</option>
              <option value="acknowledged">Đã xác nhận</option>
              <option value="resolved">Đã khắc phục</option>
            </select>

            {/* Nhóm lỗi */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Tất cả danh mục lỗi</option>
              <option value="frequency">Tần số (Frequency)</option>
              <option value="voltage">Điện áp & Sụt áp</option>
              <option value="current">Quá dòng (Overcurrent)</option>
              <option value="unbalance">Lệch pha (Unbalance)</option>
              <option value="harmonics">Sóng hài (THD)</option>
              <option value="power">Công suất giờ cao điểm</option>
              <option value="connectivity">Mất kết nối RTU/Gateway</option>
            </select>

            {/* Điểm đo */}
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

            {/* Khoảng thời gian */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="today">Hôm nay</option>
              <option value="24h">24 giờ qua</option>
              <option value="7d">7 ngày gần nhất</option>
              <option value="30d">30 ngày gần nhất</option>
            </select>
          </div>

          {/* Nút hành động hàng loạt khi tick chọn */}
          {selectedAlertIds.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-xl">
              <span className="text-xs font-semibold text-slate-700">
                Đã chọn {selectedAlertIds.length} mục
              </span>
              <button
                type="button"
                onClick={batchAcknowledge}
                className="rounded-lg bg-white border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Xác nhận đã xem
              </button>
              <button
                type="button"
                onClick={batchResolve}
                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                Đánh dấu đã giải quyết
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  <th className="w-10 px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={
                        filteredAlerts.length > 0 &&
                        selectedAlertIds.length === filteredAlerts.length
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                    />
                  </th>
                  <th className="px-3 py-3.5">Mã & Mức độ</th>
                  <th className="px-3 py-3.5">Thời gian phát hiện</th>
                  <th className="px-3 py-3.5">Điểm đo & Vị trí</th>
                  <th className="px-3 py-3.5">Thông số vi phạm</th>
                  <th className="px-3 py-3.5">Thực tế / Ngưỡng</th>
                  <th className="px-3 py-3.5">Nội dung cảnh báo</th>
                  <th className="px-3 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <CheckCircleIcon className="h-10 w-10 text-emerald-500 mb-2 opacity-80" />
                        <p className="text-sm font-semibold text-slate-700">
                          Hệ thống hoạt động an toàn, không có cảnh báo nào phù hợp bộ lọc
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Thử thay đổi bộ lọc tìm kiếm hoặc xem lại tất cả các mức độ
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((item) => {
                    const isChecked = selectedAlertIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors hover:bg-slate-50/80 ${
                          isChecked ? "bg-emerald-50/40" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectOne(item.id)}
                            className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                          />
                        </td>

                        {/* Mã & Mức độ */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                item.severity === "critical"
                                  ? "bg-rose-100 text-rose-700 border border-rose-200"
                                  : item.severity === "warning"
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {item.severity === "critical"
                                ? "Nghiêm trọng"
                                : item.severity === "warning"
                                  ? "Cảnh báo"
                                  : "Thông tin"}
                            </span>
                          </div>
                          <span className="block font-mono text-[10.5px] text-slate-400 mt-0.5">
                            {item.id}
                          </span>
                        </td>

                        {/* Thời gian */}
                        <td className="px-3 py-3.5 whitespace-nowrap text-slate-600 font-mono text-[11.5px]">
                          {item.timestamp}
                        </td>

                        {/* Điểm đo */}
                        <td className="px-3 py-3.5">
                          <p className="font-semibold text-slate-800">{item.pointName}</p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <span className="font-mono font-medium text-emerald-700">
                              {item.pointCode}
                            </span>
                            <span>• {item.location}</span>
                          </div>
                        </td>

                        {/* Thông số vi phạm */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.parameter}
                          </span>
                          <span className="block text-[11px] text-slate-500 mt-0.5">
                            {item.paramName}
                          </span>
                        </td>

                        {/* Giá trị thực tế / Ngưỡng */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="flex items-baseline gap-1">
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
                            <span className="text-[10.5px] text-slate-400">/ {item.thresholdValue}</span>
                            <span className="text-[10px] text-slate-500 font-medium">{item.unit}</span>
                          </div>
                        </td>

                        {/* Nội dung */}
                        <td className="px-3 py-3.5 max-w-[280px]">
                          <p className="line-clamp-2 text-slate-700 leading-relaxed">
                            {item.message}
                          </p>
                          {item.notes && (
                            <p className="mt-1 text-[11px] text-emerald-700 font-medium italic truncate">
                              Ghi chú: {item.notes}
                            </p>
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          {item.status === "active" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-100">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                              Đang xảy ra
                            </span>
                          ) : item.status === "acknowledged" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-100">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Đã tiếp nhận
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-100">
                              <CheckIcon className="h-3 w-3 text-emerald-600" />
                              Đã giải quyết
                            </span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setInspectAlert(item);
                              setInspectNote(item.notes || "");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
                          >
                            Chi tiết & Xử lý
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal / Drawer chi tiết sự kiện cảnh báo */}
      {inspectAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    inspectAlert.severity === "critical"
                      ? "bg-rose-100 text-rose-700"
                      : inspectAlert.severity === "warning"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {inspectAlert.severity === "critical"
                    ? "Sự cố nghiêm trọng"
                    : inspectAlert.severity === "warning"
                      ? "Cảnh báo vượt ngưỡng"
                      : "Thông tin hệ thống"}
                </span>
                <h3 className="mt-1.5 text-lg font-bold text-slate-900">
                  {inspectAlert.pointName} ({inspectAlert.pointCode})
                </h3>
                <p className="text-xs text-slate-400 font-mono">{inspectAlert.id} · {inspectAlert.timestamp}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectAlert(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-600">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-[11px] text-slate-400">Tham số vi phạm:</span>
                  <p className="font-bold text-slate-800">{inspectAlert.paramName} ({inspectAlert.parameter})</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Vị trí lắp đặt:</span>
                  <p className="font-semibold text-slate-800">{inspectAlert.location}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Giá trị đo được:</span>
                  <p className="text-base font-bold text-rose-600">
                    {inspectAlert.actualValue} {inspectAlert.unit}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Ngưỡng cho phép:</span>
                  <p className="text-base font-bold text-slate-700">
                    {inspectAlert.thresholdValue} {inspectAlert.unit}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Mô tả chi tiết sự kiện
                </span>
                <p className="mt-1 rounded-xl border border-slate-200 bg-white p-3 text-slate-800 leading-relaxed font-medium">
                  {inspectAlert.message}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Nhật ký & Phương án khắc phục
                </label>
                <textarea
                  rows={3}
                  value={inspectNote}
                  onChange={(e) => setInspectNote(e.target.value)}
                  placeholder="Nhập nội dung xử lý, người thực hiện, kiểm tra hiện trường..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="text-[11px] text-slate-400">
                {inspectAlert.acknowledgedBy ? (
                  <span>Đã tiếp nhận bởi: <strong className="text-slate-700">{inspectAlert.acknowledgedBy}</strong></span>
                ) : (
                  <span>Trạng thái: <strong className="text-rose-600">Chưa tiếp nhận</strong></span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInspectAlert(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={saveInspectNote}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs"
                >
                  Lưu & Cập nhật trạng thái
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function AlertBellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      <path d="M4 2C2.8 3.7 2 5.7 2 8" strokeWidth="1.5" />
      <path d="M22 8c0-2.3-.8-4.3-2-6" strokeWidth="1.5" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
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
