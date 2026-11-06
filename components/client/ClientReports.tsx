"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { hydrateAlertEvents, type AlertEvent } from "@/lib/alert-events";
import { hydrateClientMeters } from "@/lib/client-meters";
import { hydrateGhgSources } from "@/lib/ghg-sources";
import { hydrateProjects } from "@/lib/projects";
import {
  REPORT_TEMPLATE_NOTE,
  REPORTS,
  reportById,
  type ReportFormat,
  type ReportId,
} from "@/lib/report-defs";
import {
  formatCivilDate,
  formatStoredVietnam,
  vietnamNow,
} from "@/lib/vietnam-time";

type Period = "Ngày" | "Tuần" | "Tháng" | "Năm";

type ReportAlert = {
  time: string;
  point: string;
  pointId?: string;
  param: string;
  value: string;
  level: string;
};

type PreviewModel = {
  title: string;
  reportName: string;
  projectName: string;
  periodLabel: string;
  compareLabel?: string;
  pointsLabel: string;
  fields: { id: string; label: string }[];
  rows: { label: string; value: string }[];
  tableHeaders: string[];
  tableRows: string[][];
  includeChart: boolean;
  note: string;
};

export function ClientReports({ initialId = "consumption" }: { initialId?: ReportId }) {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "default";
  const [projectName, setProjectName] = useState(projectId);
  const [reportId, setReportId] = useState<ReportId>(
    REPORTS.some((item) => item.id === initialId) ? initialId : "consumption",
  );
  const report = reportById(reportId);

  const [title, setTitle] = useState(report.title);
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [period, setPeriod] = useState<Period>("Tháng");
  const [date, setDate] = useState(() => vietnamNow().date);
  const [compareDate, setCompareDate] = useState(() => {
    const now = vietnamNow();
    const [y, m] = now.date.split("-").map(Number);
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;
    return `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
  });
  const [selectedFields, setSelectedFields] = useState<string[]>(report.defaultFields);
  const [selectedPoints, setSelectedPoints] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [points, setPoints] = useState<{ id: string; name: string; code: string }[]>([]);
  const [alertRows, setAlertRows] = useState<ReportAlert[]>([]);
  const [ghgTons, setGhgTons] = useState(0);
  const [ghgSources, setGhgSources] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      hydrateClientMeters(projectId),
      hydrateAlertEvents(projectId),
      hydrateGhgSources(projectId),
      hydrateProjects(),
    ])
      .then(([meters, events, sources, projects]) => {
        if (!active) return;
        const project = projects.find((item) => item.id === projectId);
        setProjectName(project?.name ?? project?.customer ?? projectId);
        const nextPoints = meters.map((meter) => ({
          id: meter.id,
          code: meter.code,
          name: `(${meter.code}) ${meter.name}`,
        }));
        setPoints(nextPoints);
        setSelectedPoints((current) => {
          const valid = current.filter((id) => nextPoints.some((point) => point.id === id));
          if (valid.length) return valid;
          return nextPoints[0] ? [nextPoints[0].id] : [];
        });
        setAlertRows(
          events.map((event: AlertEvent) => ({
            time: formatStoredVietnam(event.occurredAt) ?? event.occurredAt,
            point: event.pointName ?? event.meterPointId ?? "--",
            pointId: event.meterPointId,
            param: event.parameter,
            value: `${event.value}${event.unit ? ` ${event.unit}` : ""}`,
            level:
              event.severity === "critical"
                ? "Nghiêm trọng"
                : event.severity === "warning"
                  ? "Cảnh báo"
                  : "Thông tin",
          })),
        );
        setGhgSources(sources.length);
        setGhgTons(sources.reduce((sum, source) => sum + (source.tons ?? 0), 0));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [projectId]);

  const dateLabel = useMemo(() => formatCivilDate(date), [date]);
  const compareLabel = useMemo(() => formatCivilDate(compareDate), [compareDate]);
  const periodLabel = `${period} · ${dateLabel}`;

  const pickReport = (id: ReportId) => {
    const next = reportById(id);
    setReportId(next.id);
    setTitle(next.title);
    setSelectedFields(next.defaultFields);
    setPreviewOpen(false);
  };

  const toggleField = (id: string) => {
    setSelectedFields((list) => {
      if (list.includes(id)) {
        return list.length === 1 ? list : list.filter((item) => item !== id);
      }
      return [...list, id];
    });
  };

  const togglePoint = (id: string) => {
    setSelectedPoints((list) => {
      if (list.includes(id)) return list.length === 1 ? list : list.filter((item) => item !== id);
      return [...list, id];
    });
  };

  const selectedPointNames = points
    .filter((point) => selectedPoints.includes(point.id))
    .map((point) => point.name);

  const preview = useMemo((): PreviewModel => {
    const fieldDefs = report.fields.filter((field) => selectedFields.includes(field.id));
    const rows: { label: string; value: string }[] = [];
    const tableHeaders: string[] = [];
    const tableRows: string[][] = [];
    const pointsLabel = report.needsMeterPoints
      ? selectedPointNames.join("; ") || "Chưa chọn điểm đo"
      : "Toàn dự án";

    if (report.id === "alerts") {
      const filtered = alertRows.filter(
        (row) =>
          !report.needsMeterPoints ||
          !selectedPoints.length ||
          !row.pointId ||
          selectedPoints.includes(row.pointId),
      );
      if (selectedFields.includes("by_severity")) {
        const critical = filtered.filter((row) => row.level === "Nghiêm trọng").length;
        const warning = filtered.filter((row) => row.level === "Cảnh báo").length;
        const info = filtered.filter((row) => row.level === "Thông tin").length;
        rows.push(
          { label: "Nghiêm trọng", value: String(critical) },
          { label: "Cảnh báo", value: String(warning) },
          { label: "Thông tin", value: String(info) },
        );
      }
      rows.push({ label: "Tổng sự kiện trong kỳ (lọc điểm đo)", value: String(filtered.length) });
      if (selectedFields.includes("alert_list") || selectedFields.includes("detail_table") || selectedFields.includes("summary_table")) {
        tableHeaders.push("Thời điểm", "Điểm đo", "Tham số", "Giá trị", "Mức");
        for (const row of filtered.slice(0, 50)) {
          tableRows.push([row.time, row.point, row.param, row.value, row.level]);
        }
      }
    } else if (report.id === "ghg") {
      if (selectedFields.includes("ghg_total")) {
        rows.push({
          label: "Tổng phát thải",
          value: `${ghgTons.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tấn CO₂e`,
        });
      }
      if (selectedFields.includes("by_source")) {
        rows.push({ label: "Số nguồn cấu hình", value: String(ghgSources) });
      }
      if (selectedFields.includes("by_scope") || selectedFields.includes("summary_table")) {
        tableHeaders.push("Hạng mục", "Giá trị");
        tableRows.push(["Tổng CO₂e", `${ghgTons.toFixed(2)} tấn`], ["Số nguồn", String(ghgSources)]);
      }
    } else if (report.id === "compare") {
      rows.push(
        { label: "Kỳ chính", value: periodLabel },
        { label: "Kỳ so sánh", value: `${period} · ${compareLabel}` },
      );
      if (selectedFields.includes("energy_delta")) rows.push({ label: "Δ Điện năng", value: "— (chờ mẫu dữ liệu kỳ)" });
      if (selectedFields.includes("cost_delta")) rows.push({ label: "Δ Chi phí", value: "— (chờ mẫu dữ liệu kỳ)" });
      if (selectedFields.includes("ghg_delta")) {
        rows.push({ label: "Δ GHG", value: `${ghgTons.toFixed(2)} tấn (kỳ hiện tại)` });
      }
      if (selectedFields.includes("alert_delta")) {
        rows.push({ label: "Cảnh báo kỳ hiện tại", value: String(alertRows.length) });
      }
      if (selectedFields.includes("summary_table")) {
        tableHeaders.push("Chỉ tiêu", "Kỳ chính", "Kỳ so sánh", "Chênh lệch");
        tableRows.push(["Điện năng (kWh)", "—", "—", "—"], ["Chi phí (VND)", "—", "—", "—"]);
      }
    } else {
      // summary / consumption / cost — khung sẵn, gắn số GHG/alert có sẵn
      if (selectedFields.includes("energy_total") || selectedFields.includes("kwh_total")) {
        rows.push({ label: "Tổng điện năng", value: "— (lấy từ bản tin gateway khi xuất mẫu chính thức)" });
      }
      if (selectedFields.includes("cost_total")) {
        rows.push({ label: "Tổng chi phí", value: "— (theo cấu hình biểu giá TOU)" });
      }
      if (selectedFields.includes("ghg_total")) {
        rows.push({
          label: "Tổng GHG",
          value: `${ghgTons.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tấn CO₂e`,
        });
      }
      if (selectedFields.includes("alert_count")) {
        rows.push({ label: "Số cảnh báo", value: String(alertRows.length) });
      }
      if (selectedFields.includes("kwh_by_point") || selectedFields.includes("cost_by_point")) {
        tableHeaders.push("Điểm đo", "Giá trị");
        for (const point of points.filter((item) => selectedPoints.includes(item.id))) {
          tableRows.push([point.name, "—"]);
        }
      } else if (selectedFields.includes("summary_table") || selectedFields.includes("detail_table")) {
        tableHeaders.push("Chỉ tiêu", "Giá trị");
        for (const row of rows) tableRows.push([row.label, row.value]);
      }
    }

    return {
      title,
      reportName: report.name,
      projectName,
      periodLabel,
      compareLabel: report.needsComparePeriod ? `${period} · ${compareLabel}` : undefined,
      pointsLabel,
      fields: fieldDefs.map((field) => ({ id: field.id, label: field.label })),
      rows,
      tableHeaders,
      tableRows,
      includeChart: selectedFields.includes("chart"),
      note: REPORT_TEMPLATE_NOTE,
    };
  }, [
    report,
    selectedFields,
    selectedPointNames,
    selectedPoints,
    alertRows,
    ghgTons,
    ghgSources,
    periodLabel,
    compareLabel,
    period,
    title,
    projectName,
    points,
  ]);

  const buildHtml = (model: PreviewModel) => {
    const fieldList = model.fields.map((field) => `<li>${field.label}</li>`).join("");
    const kpi = model.rows
      .map(
        (row) =>
          `<div class="kpi"><div class="k">${row.label}</div><div class="v">${row.value}</div></div>`,
      )
      .join("");
    const table =
      model.tableHeaders.length && model.tableRows.length
        ? `<table><thead><tr>${model.tableHeaders.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${model.tableRows
            .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`
        : "";
    const chartBlock = model.includeChart
      ? `<div class="chart">[Vùng biểu đồ — gắn theo mẫu PDF/Excel chính thức]</div>`
      : "";

    return `<!doctype html><html><head><meta charset="utf-8"><title>${model.title}</title>
<style>
  body{font-family:Segoe UI,Arial,sans-serif;color:#0f172a;margin:0;background:#fff}
  .page{max-width:900px;margin:0 auto;padding:28px 32px 40px}
  .header{border-bottom:2px solid #059669;padding-bottom:12px;margin-bottom:18px}
  .header .brand{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#059669;font-weight:700}
  .header h1{margin:6px 0 0;font-size:22px}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin:14px 0 18px;font-size:13px;color:#475569}
  .kpi-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0 18px}
  .kpi{border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;background:#f8fafc}
  .kpi .k{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em}
  .kpi .v{margin-top:4px;font-size:16px;font-weight:700}
  .chart{height:160px;border:1px dashed #94a3b8;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:13px;margin:12px 0 18px;background:#f8fafc}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
  th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}
  th{background:#f1f5f9;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#64748b}
  .fields{font-size:12px;color:#475569}
  .footer{margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;display:flex;justify-content:space-between;gap:12px}
  .note{margin-top:14px;font-size:11px;color:#94a3b8}
</style></head><body><div class="page">
  <header class="header">
    <div class="brand">EMS · Báo cáo năng lượng</div>
    <h1>${model.title}</h1>
  </header>
  <div class="meta">
    <div><strong>Dự án:</strong> ${model.projectName}</div>
    <div><strong>Loại:</strong> ${model.reportName}</div>
    <div><strong>Kỳ báo cáo:</strong> ${model.periodLabel}</div>
    ${model.compareLabel ? `<div><strong>Kỳ so sánh:</strong> ${model.compareLabel}</div>` : ""}
    <div style="grid-column:1/-1"><strong>Phạm vi:</strong> ${model.pointsLabel}</div>
  </div>
  <div class="fields"><strong>Trường xuất:</strong><ul>${fieldList}</ul></div>
  <div class="kpi-grid">${kpi}</div>
  ${chartBlock}
  ${table}
  <p class="note">${model.note}</p>
  <footer class="footer">
    <span>Header/Footer mẫu — chờ chốt với a Phi</span>
    <span>Xuất lúc ${formatStoredVietnam(new Date().toISOString().slice(0, 19)) ?? ""}</span>
  </footer>
</div></body></html>`;
  };

  const exportReport = () => {
    const html = buildHtml(preview);
    if (format === "pdf") {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
      }
      return;
    }

    // Excel tạm thời: CSV UTF-8 (khi nhận file mẫu .xlsx sẽ thay bằng template)
    const lines: string[] = [
      preview.title,
      `Dự án,${preview.projectName}`,
      `Loại,${preview.reportName}`,
      `Kỳ,${preview.periodLabel}`,
      preview.compareLabel ? `Kỳ so sánh,${preview.compareLabel}` : "",
      `Phạm vi,"${preview.pointsLabel}"`,
      "",
      "Chỉ tiêu,Giá trị",
      ...preview.rows.map((row) => `"${row.label}","${row.value}"`),
    ].filter(Boolean);
    if (preview.tableHeaders.length) {
      lines.push("", preview.tableHeaders.join(","));
      for (const row of preview.tableRows) {
        lines.push(row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","));
      }
    }
    lines.push("", `Ghi chú,"${preview.note}"`);
    downloadBlob(
      "\uFEFF" + lines.join("\n"),
      `${report.id}-${date}.csv`,
      "text/csv;charset=utf-8",
    );
  };

  return (
    <div className="flex h-full min-h-0 bg-[#f4f6f9]">
      <aside className="flex w-[248px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h1 className="text-[16px] font-bold text-slate-800">Danh sách báo cáo</h1>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Chọn loại → trường dữ liệu → xem trước → xuất PDF/Excel
          </p>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {REPORTS.map((item, index) => {
            const active = item.id === reportId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => pickReport(item.id)}
                className={`mb-1 flex min-h-10 w-full items-center rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                  active ? "bg-emerald-600 text-white shadow-xs" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {index + 1}. {item.name}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <section className="rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="relative mb-1">
            <h2 className="text-center text-[20px] font-semibold text-slate-800">{report.name}</h2>
            <div className="absolute top-0 right-0 flex items-center gap-1">
              <IconBtn label="Xem trước" onClick={() => setPreviewOpen(true)}>
                <EyeIcon />
              </IconBtn>
              <IconBtn label="Xuất báo cáo" onClick={exportReport}>
                <DownloadIcon />
              </IconBtn>
            </div>
          </div>
          <p className="mb-4 text-center text-[12px] text-slate-400">{report.description}</p>

          {report.needsMeterPoints ? (
            <div className="relative mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setPickerOpen((value) => !value)}
                className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[12px] text-slate-600 hover:bg-slate-50"
              >
                {selectedPoints.length} điểm đo đã chọn
                <Chevron />
              </button>
              {pickerOpen ? (
                <div className="absolute top-9 right-0 z-20 max-h-64 w-72 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-md">
                  {points.length === 0 ? (
                    <p className="px-3 py-2 text-[12px] text-slate-400">Chưa có điểm đo</p>
                  ) : (
                    points.map((item) => (
                      <label
                        key={item.id}
                        className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] text-slate-600 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPoints.includes(item.id)}
                          onChange={() => togglePoint(item.id)}
                          className="accent-emerald-600"
                        />
                        {item.name}
                      </label>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <ol className="divide-y divide-slate-100">
            <SettingRow index={1} label="Tiêu đề:">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 w-full max-w-[420px] rounded-md border border-slate-200 px-3 text-sm font-semibold tracking-wide text-slate-800 outline-none focus:border-emerald-500"
              />
            </SettingRow>

            <SettingRow index={2} label="Trường dữ liệu xuất:">
              <div className="w-full max-w-[520px] rounded-xl border border-slate-200 bg-slate-50/70 p-2">
                <div className="flex flex-wrap gap-1.5">
                  {report.fields.map((field) => {
                    const active = selectedFields.includes(field.id);
                    return (
                      <button
                        key={field.id}
                        type="button"
                        title={field.hint}
                        onClick={() => toggleField(field.id)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          active
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {field.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </SettingRow>

            <SettingRow index={3} label="Định dạng mẫu:">
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as ReportFormat)}
                className="h-9 min-w-[160px] rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500"
              >
                <option value="pdf">PDF (.pdf)</option>
                <option value="xlsx">Excel (.xlsx)</option>
              </select>
            </SettingRow>

            <SettingRow index={4} label="Kỳ thời gian:">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as Period)}
                  className="h-9 min-w-[120px] rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500"
                >
                  <option>Ngày</option>
                  <option>Tuần</option>
                  <option>Tháng</option>
                  <option>Năm</option>
                </select>
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-700">
                  <CalendarIcon />
                  {dateLabel}
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="sr-only"
                  />
                </label>
              </div>
            </SettingRow>

            {report.needsComparePeriod ? (
              <SettingRow index={5} label="Kỳ so sánh:">
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-700">
                  <CalendarIcon />
                  {compareLabel}
                  <input
                    type="date"
                    value={compareDate}
                    onChange={(e) => setCompareDate(e.target.value)}
                    className="sr-only"
                  />
                </label>
              </SettingRow>
            ) : null}
          </ol>

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-[12px] leading-relaxed text-amber-900">
            {REPORT_TEMPLATE_NOTE} Hiện tại xem trước dùng khung tạm; xuất PDF mở hộp thoại in, Excel tải CSV tương thích.
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <EyeIcon />
              Xem trước
            </button>
            <button
              type="button"
              onClick={exportReport}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700"
            >
              <DownloadIcon />
              Xuất {format === "pdf" ? "PDF" : "Excel"}
            </button>
          </div>
        </section>
      </div>

      {previewOpen ? (
        <PreviewModal
          html={buildHtml(preview)}
          onClose={() => setPreviewOpen(false)}
          onExport={() => {
            exportReport();
          }}
        />
      ) : null}
    </div>
  );
}

function PreviewModal({
  html,
  onClose,
  onExport,
}: {
  html: string;
  onClose: () => void;
  onExport: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="flex h-[min(90vh,880px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Xem trước báo cáo</h3>
            <p className="text-[11px] text-slate-400">Header / footer tạm — sẽ thay bằng mẫu chốt với a Phi</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExport}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Xuất từ bản xem trước
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              ✕
            </button>
          </div>
        </div>
        <iframe title="Xem trước báo cáo" srcDoc={html} className="min-h-0 flex-1 w-full bg-white" />
      </div>
    </div>
  );
}

function SettingRow({
  index,
  label,
  children,
}: {
  index: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3.5">
      <p className="pt-2 text-[14px] text-slate-700">
        {index}. {label}
      </p>
      {children}
    </li>
  );
}

function IconBtn({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-700"
    >
      {children}
    </button>
  );
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M12 4v11M7.5 11.5 12 16l4.5-4.5M5 19h14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5V7M16 3.5V7M4 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
