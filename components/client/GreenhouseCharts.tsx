"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_TIME_FILTER,
  TimeFilterBar,
  getTimeFilterLabel,
  getTimeFilterScaleFactor,
  type TimeFilterValue,
} from "@/components/client/TimeFilterBar";
import {
  GHG_SCOPES,
  hydrateGhgSources,
  loadGhgSources,
  scopeColor,
  scopeLabel,
  withDemoTons,
  type GhgEmissionSource,
  type ScopeId,
} from "@/lib/ghg-sources";

function fmt(n: number, digits = 1) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function GreenhouseCharts({ projectId }: { projectId: string }) {
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>({
    ...DEFAULT_TIME_FILTER,
    mode: "year",
  });
  const [sources, setSources] = useState<GhgEmissionSource[]>([]);

  useEffect(() => {
    let active = true;
    void hydrateGhgSources(projectId).then((sources) => {
      if (active) setSources(withDemoTons(sources));
    }).catch(() => {
      if (active) setSources(withDemoTons(loadGhgSources()));
    });
    return () => {
      active = false;
    };
  }, [projectId]);

  const baseScale = 1 + (timeFilter.year - 2024) * 0.035;
  const timeScale = getTimeFilterScaleFactor(timeFilter);
  const scale = baseScale * (timeFilter.mode === "year" ? 1 : Math.max(0.005, timeScale));

  const rows = useMemo(() => {
    const scaled = sources.map((source) => {
      const rawTons = (source.tons ?? 0) * scale;
      const tons = Number(rawTons < 1 ? rawTons.toFixed(2) : rawTons.toFixed(1));
      return {
        ...source,
        tons,
      };
    });
    const totalTons = scaled.reduce((s, r) => s + r.tons, 0) || 1;
    return scaled
      .map((row) => ({
        ...row,
        share: Number(((row.tons / totalTons) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.tons - a.tons);
  }, [sources, scale]);

  const total = Number(rows.reduce((s, r) => s + r.tons, 0).toFixed(1));
  const goal = Math.max(62, Math.min(96, 85 - (timeFilter.year - 2024) * 4));

  const scopeShares = useMemo(() => {
    return GHG_SCOPES.map((scope) => {
      const tons = rows
        .filter((row) => row.scope === scope.id)
        .reduce((s, r) => s + r.tons, 0);
      const share = total > 0 ? Number(((tons / total) * 100).toFixed(1)) : 0;
      return { ...scope, tons, share };
    }).filter((item) => item.tons > 0 || sources.some((s) => s.scope === item.id));
  }, [rows, total, sources]);

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[#f4f6f9] p-4 lg:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-slate-800 sm:text-[22px]">
            Tổng quan phát thải khí nhà kính
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Theo dõi phát thải CO₂e theo phạm vi Scope 1, 2, 3 · Kỳ: <strong className="text-slate-800">{getTimeFilterLabel(timeFilter)}</strong>
          </p>
        </div>
        <TimeFilterBar value={timeFilter} onChange={setTimeFilter} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="TỔNG LƯỢNG PHÁT THẢI"
          value={`${fmt(total, total < 10 ? 2 : 1)}`}
          hint="tấn CO₂e"
          trend={-2.4}
        />
        <KpiCard
          label="CƯỜNG ĐỘ PHÁT THẢI"
          value={`${(0.12 * (timeFilter.mode === "year" ? 1 : 0.95)).toFixed(2)}`}
          hint="tấn/sản phẩm"
          trend={0.8}
        />
        <article className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400">
            MỤC TIÊU GIẢM THẢI · {timeFilter.year}
          </p>
          <p className="mt-2 text-[28px] font-bold leading-none text-slate-800">
            {goal}% <span className="text-[15px] font-medium text-slate-500">hoàn thành</span>
          </p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-600 transition-all duration-500" style={{ width: `${goal}%` }} />
          </div>
        </article>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h3 className="text-[13px] font-bold tracking-[0.06em] text-slate-700">
            PHÂN BỐ THEO PHẠM VI
          </h3>
          <ScopeDonut segments={scopeShares} />
          <div className="mt-2 flex flex-wrap justify-center gap-5 text-[13px] text-slate-600">
            {scopeShares.map((item) => (
              <span key={item.id} className="inline-flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-[2px]"
                  style={{ backgroundColor: item.color }}
                />
                {item.label} ({item.share}%)
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h3 className="text-[13px] font-bold tracking-[0.06em] text-slate-700">
            CHI TIẾT PHÁT THẢI (TẤN CO₂E)
          </h3>
          <p className="mt-1 text-[12px] text-slate-400">
            Nguồn phát thải lấy từ cấu hình Phạm vi 1 / 2 / 3
          </p>
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              Chưa có nguồn phát thải trong cấu hình
            </p>
          ) : (
            <>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wide text-slate-400">
                      <th className="py-2 font-semibold">HẠNG MỤC</th>
                      <th className="py-2 font-semibold">PHẠM VI</th>
                      <th className="py-2 text-right font-semibold">GIÁ TRỊ (TẤN)</th>
                      <th className="py-2 text-right font-semibold">TỶ TRỌNG</th>
                      <th className="py-2 text-right font-semibold">THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-slate-50">
                        <td className="py-2.5 font-medium text-slate-700">{row.name}</td>
                        <td className="py-2.5">
                          <ScopeBadge scope={row.scope} />
                        </td>
                        <td className="py-2.5 text-right text-slate-700">{fmt(row.tons)}</td>
                        <td className="py-2.5 text-right font-semibold text-slate-700">
                          {row.share.toFixed(1)}%
                        </td>
                        <td className="py-2.5 text-right">
                          <Link
                            href={`/chinh-sua-du-an/${encodeURIComponent(projectId)}/khi-nha-kinh?edit=${encodeURIComponent(row.id)}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                            aria-label={`Chỉnh sửa ${row.name}`}
                            title="Chỉnh sửa nguồn phát thải"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 className="mt-5 text-[12px] font-bold tracking-[0.06em] text-slate-500">
                BIỂU ĐỒ TỶ TRỌNG PHÁT THẢI
              </h4>
              <ul className="mt-3 space-y-3">
                {rows.map((row) => (
                  <li key={row.id}>
                    <div className="mb-1 flex items-center justify-between text-[12px] text-slate-600">
                      <span>
                        {row.name} ({scopeLabel(row.scope)})
                      </span>
                      <span className="font-semibold">{row.share.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${row.share}%`,
                          backgroundColor: scopeColor(row.scope),
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>
      </div>
    </div>
  );
}

function ScopeBadge({ scope }: { scope: ScopeId }) {
  const color = scopeColor(scope);
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        backgroundColor: `${color}18`,
        color,
      }}
    >
      {scopeLabel(scope)}
    </span>
  );
}

function ScopeDonut({
  segments,
}: {
  segments: { id: ScopeId; label: string; color: string; share: number; tons: number }[];
}) {
  const r = 68;
  const c = 2 * Math.PI * r;

  return (
    <div className="relative mx-auto mt-4 h-[220px] w-[220px]">
      <svg viewBox="0 0 180 180" className="h-full w-full">
        <circle cx="90" cy="90" r={r} fill="none" stroke="#e8eef4" strokeWidth="26" />
        {segments.map((item, index) => {
          const dash = (item.share / 100) * c;
          const offset = segments
            .slice(0, index)
            .reduce((sum, segment) => sum + (segment.share / 100) * c, 0);
          const el = (
            <circle
              key={item.id}
              cx="90"
              cy="90"
              r={r}
              fill="none"
              stroke={item.color}
              strokeWidth="26"
              strokeDasharray={`${dash} ${Math.max(c - dash, 0)}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 90 90)"
            />
          );
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[28px] font-bold leading-none text-slate-800">100%</p>
        <p className="mt-1 text-[11px] font-semibold tracking-[0.12em] text-slate-400">
          TỔNG CỘNG
        </p>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string;
  hint: string;
  trend: number;
}) {
  const down = trend < 0;
  return (
    <article className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400">{label}</p>
      <p className="mt-2 text-[28px] font-bold leading-none text-slate-800">
        {value}
        <span className="ml-1.5 text-[13px] font-medium text-slate-400">{hint}</span>
      </p>
      <p
        className={`mt-3 inline-flex items-center gap-1 text-[12px] font-medium ${
          down ? "text-emerald-600" : "text-red-500"
        }`}
      >
        <TrendArrow down={down} />
        {down ? "" : "+"}
        {trend}% so với kỳ trước
      </p>
    </article>
  );
}

function TrendArrow({ down }: { down: boolean }) {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
      <path
        d={down ? "M6 2.5v7M3.5 6.5 6 9.5 8.5 6.5" : "M6 9.5v-7M3.5 5.5 6 2.5 8.5 5.5"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 17.5V20h2.5L18 8.5 15.5 6 4 17.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="m14.5 7 2.5 2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
