"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { hydrateAlertEvents, type AlertEvent } from "@/lib/alert-events";
import { hydrateClientMeters } from "@/lib/client-meters";

type YesNo = "Có" | "Không";
type Format = ".pdf" | ".xlsx" | ".csv";
type Period = "Ngày" | "Tuần" | "Tháng" | "Năm";

const TEMPLATES = ["Mẫu báo cáo", "Mẫu tiêu chuẩn", "Mẫu tùy chỉnh"];

const REPORTS = [
  { id: "energy", name: "Điện năng tiêu thụ", title: "ĐIỆN NĂNG TIÊU THỤ" },
  { id: "quality", name: "Chất lượng điện", title: "CHẤT LƯỢNG ĐIỆN" },
  { id: "cost", name: "Chi phí", title: "CHI PHÍ" },
  { id: "ghg", name: "Khí nhà kính", title: "KHÍ NHÀ KÍNH" },
  { id: "alerts", name: "Cảnh báo", title: "CẢNH BÁO" },
] as const;

const POINTS = [
  { id: "off1", name: "(DB-OFF1) Tủ điện văn phòng" },
  { id: "prd1", name: "(DB-PRD1) Tủ điện sản xuất" },
  { id: "cmp1", name: "(DB-CMP1) Máy nén khí 1" },
  { id: "hvac", name: "(DB-HVAC) Điều hòa trung tâm" },
  { id: "main", name: "(DB-MAIN) Tủ điện tổng" },
];

type ReportAlert = { time: string; point: string; param: string; value: string; level: string };

const ALERT_ROWS: ReportAlert[] = [
  { time: "2026-07-19 07:38:48", point: "Tủ điện văn phòng", param: "F_avg", value: "49.79", level: "Cảnh báo" },
  { time: "2026-07-19 07:38:38", point: "Tủ điện văn phòng", param: "F_avg", value: "50.42", level: "Cảnh báo" },
  { time: "2026-07-19 07:22:11", point: "Tủ điện sản xuất", param: "U_unb", value: "2.14", level: "Nghiêm trọng" },
  { time: "2026-07-19 06:51:03", point: "Máy nén khí 1", param: "I_rms", value: "612.4", level: "Cảnh báo" },
  { time: "2026-07-19 06:18:40", point: "Tủ điện tổng", param: "P_sum", value: "186.2", level: "Thông tin" },
];

export function ClientReports({ initialId = "energy" }: { initialId?: (typeof REPORTS)[number]["id"] }) {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "default";
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [reportId, setReportId] = useState<(typeof REPORTS)[number]["id"]>(initialId);
  const report = REPORTS.find((item) => item.id === reportId) ?? REPORTS[0];
  const [title, setTitle] = useState<string>(report.title);
  const [chart, setChart] = useState<YesNo>("Có");
  const [summary, setSummary] = useState<YesNo>("Có");
  const [detail, setDetail] = useState<YesNo>(reportId === "alerts" ? "Có" : "Không");
  const [format, setFormat] = useState<Format>(".pdf");
  const [period, setPeriod] = useState<Period>("Ngày");
  const [date, setDate] = useState("2026-07-19");
  const [selected, setSelected] = useState<string[]>(["off1"]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [points, setPoints] = useState(POINTS);
  const [alertRows, setAlertRows] = useState<ReportAlert[]>(ALERT_ROWS);

  useEffect(() => {
    let active = true;
    void Promise.all([hydrateClientMeters(projectId), hydrateAlertEvents(projectId)]).then(([meters, events]) => {
      if (!active) return;
      const nextPoints = meters.map((meter) => ({
        id: meter.id,
        name: `(${meter.code}) ${meter.name}`,
      }));
      if (nextPoints.length) {
        setPoints(nextPoints);
        setSelected((current) => {
          const valid = current.filter((id) => nextPoints.some((point) => point.id === id));
          return valid.length ? valid : [nextPoints[0].id];
        });
      }
      if (events.length) setAlertRows(events.map((event: AlertEvent) => ({
        time: event.occurredAt,
        point: event.pointName ?? event.meterPointId ?? "--",
        param: event.parameter,
        value: `${event.value}${event.unit ? ` ${event.unit}` : ""}`,
        level: event.severity === "critical" ? "Nghiêm trọng" : event.severity === "warning" ? "Cảnh báo" : "Thông tin",
      })));
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [projectId]);

  const dateLabel = useMemo(() => {
    const [y, m, d] = date.split("-");
    return `${m}/${d}/${y}`;
  }, [date]);

  const pickReport = (id: (typeof REPORTS)[number]["id"]) => {
    const next = REPORTS.find((item) => item.id === id) ?? REPORTS[0];
    setReportId(next.id);
    setTitle(next.title);
    setDetail(next.id === "alerts" ? "Có" : "Không");
  };

  const togglePoint = (id: string) => {
    setSelected((list) => {
      if (list.includes(id)) return list.length === 1 ? list : list.filter((item) => item !== id);
      return [...list, id];
    });
  };

  const exportReport = () => {
    const selectedPoints = points.filter((p) => selected.includes(p.id))
      .map((p) => p.name)
      .join("; ");
    const body = [
      title,
      `Loại: ${report.name}`,
      `Điểm đo: ${selectedPoints}`,
      `Biểu đồ: ${chart}`,
      `Bảng tổng hợp: ${summary}`,
      `Bảng chi tiết: ${detail}`,
      `Kỳ: ${period} ${dateLabel}`,
      "",
      report.id === "alerts"
        ? alertRows.map((row) => `${row.time}\t${row.point}\t${row.param}\t${row.value}\t${row.level}`).join("\n")
        : "Dữ liệu mẫu theo cấu hình báo cáo.",
    ].join("\n");

    if (format === ".csv") {
      const csv =
        report.id === "alerts"
          ? ["Thời điểm,Điểm đo,Tham số,Giá trị,Mức", ...alertRows.map((r) => `${r.time},${r.point},${r.param},${r.value},${r.level}`)].join("\n")
          : body;
      download(csv, `${report.id}${format}`, "text/csv;charset=utf-8");
      return;
    }

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>body{font-family:Inter,Arial,sans-serif;padding:32px;color:#1e293b}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #e2e8f0;padding:8px;text-align:left;font-size:13px}</style></head>
      <body><h1>${title}</h1><pre>${body}</pre>
      ${
        report.id === "alerts"
          ? `<table><thead><tr><th>Thời điểm</th><th>Điểm đo</th><th>Tham số</th><th>Giá trị</th><th>Mức</th></tr></thead><tbody>${alertRows.map(
              (r) => `<tr><td>${r.time}</td><td>${r.point}</td><td>${r.param}</td><td>${r.value}</td><td>${r.level}</td></tr>`,
            ).join("")}</tbody></table>`
          : ""
      }
      </body></html>`;
    download(html, `${report.id}.html`, "text/html;charset=utf-8");
    if (format === ".pdf") {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
      }
    }
  };

  return (
    <div className="flex h-full min-h-0 bg-[#f4f6f9]">
      <aside className="flex w-[248px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h1 className="text-[16px] font-bold text-slate-800">Danh Sách Báo Cáo</h1>
        </div>
        <div className="px-4 py-3">
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500"
          >
            {TEMPLATES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {REPORTS.map((item, index) => {
            const active = item.id === reportId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => pickReport(item.id)}
                className={`mb-1 flex h-10 w-full items-center rounded-md px-3 text-left text-[13px] font-medium transition-colors ${
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
          <div className="relative mb-2">
            <h2 className="text-center text-[20px] font-semibold text-slate-800">{report.name}</h2>
            <div className="absolute top-0 right-0 flex items-center gap-1">
              <IconBtn label="Tải xuống" onClick={exportReport}>
                <DownloadIcon />
              </IconBtn>
              <IconBtn label="Xuất PDF" onClick={exportReport}>
                <FileIcon />
              </IconBtn>
            </div>
          </div>
          <div className="relative mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[12px] text-slate-600 hover:bg-slate-50"
            >
              {selected.length} đã chọn
              <Chevron />
            </button>
            {pickerOpen ? (
              <div className="absolute right-0 top-9 z-20 w-64 rounded-md border border-slate-200 bg-white py-1 shadow-md">
                {points.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] text-slate-600 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => togglePoint(item.id)}
                      className="accent-emerald-600"
                    />
                    {item.name}
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <ol className="divide-y divide-slate-100">
            <SettingRow index={1} label="Tiêu đề:">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 w-full max-w-[420px] rounded-md border border-slate-200 px-3 text-sm font-semibold tracking-wide text-slate-800 outline-none focus:border-emerald-500"
              />
            </SettingRow>
            <SettingRow index={2} label="Biểu đồ:">
              <YesNoSelect value={chart} onChange={setChart} />
            </SettingRow>
            <SettingRow index={3} label="Bảng dữ liệu tổng hợp:">
              <YesNoSelect value={summary} onChange={setSummary} />
            </SettingRow>
            <SettingRow index={4} label="Bảng dữ liệu chi tiết:">
              <YesNoSelect value={detail} onChange={setDetail} />
            </SettingRow>
            <SettingRow index={5} label="Định dạng:">
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as Format)}
                className="h-9 min-w-[140px] rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500"
              >
                <option>.pdf</option>
                <option>.xlsx</option>
                <option>.csv</option>
              </select>
            </SettingRow>
          </ol>

          {report.id === "alerts" ? (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wide text-slate-400">
                    <th className="py-2">THỜI ĐIỂM</th>
                    <th className="py-2">ĐIỂM ĐO</th>
                    <th className="py-2">THAM SỐ</th>
                    <th className="py-2">GIÁ TRỊ</th>
                    <th className="py-2">MỨC</th>
                  </tr>
                </thead>
                <tbody>
                  {alertRows.map((row) => (
                    <tr key={row.time} className="border-b border-slate-50 text-slate-700">
                      <td className="py-2.5">{row.time}</td>
                      <td className="py-2.5">{row.point}</td>
                      <td className="py-2.5 font-medium">{row.param}</td>
                      <td className="py-2.5">{row.value}</td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            row.level === "Nghiêm trọng"
                              ? "bg-red-50 text-red-600"
                              : row.level === "Cảnh báo"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {row.level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
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
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sr-only" />
            </label>
          </div>
        </section>
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
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3.5">
      <p className="text-[14px] text-slate-700">
        {index}. {label}
      </p>
      {children}
    </li>
  );
}

function YesNoSelect({ value, onChange }: { value: YesNo; onChange: (value: YesNo) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as YesNo)}
      className="h-9 min-w-[140px] rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500"
    >
      <option>Có</option>
      <option>Không</option>
    </select>
  );
}

function IconBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
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

function download(content: string, filename: string, type: string) {
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
      <path d="M12 4v11M7.5 11.5 12 16l4.5-4.5M5 19h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M7 3.5h7l5 5V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14 3.5V9h5.5M9 13h6M9 16.5h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
