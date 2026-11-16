"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useDiagramActions } from "./context";
import type { JunctionFlowNode, MeterFlowNode, MeterIcon, MeterStatus } from "./types";

const statusStroke: Record<MeterStatus, string> = {
  normal: "stroke-emerald-600 text-emerald-700",
  warning: "stroke-amber-500 text-amber-600",
  offline: "stroke-slate-400 text-slate-500",
};

const statusDot: Record<MeterStatus, string> = {
  normal: "bg-emerald-500",
  warning: "bg-amber-500",
  offline: "bg-slate-400",
};

const statusChip: Record<MeterStatus, string> = {
  normal: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  offline: "bg-slate-100 text-slate-500 border-slate-200",
};

/** Node kiểu single-line diagram: ký hiệu thiết bị + nhãn + số liệu gọn. */
export function MeterNode({ id, data, selected }: NodeProps<MeterFlowNode>) {
  const { openSettings, refreshLive } = useDiagramActions();

  return (
    <div
      className={`diagram-sld-node relative w-[152px] ${selected ? "z-10" : ""}`}
      title={data.sampleAt ? `Cập nhật ${data.sampleAt}` : data.statusLabel}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="parent"
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-700"
        title="Nối từ điểm cha"
      />

      {/* Thanh góp dọc (bus stub) */}
      <div className="mx-auto h-3 w-0.5 bg-slate-700" />

      <div
        className={`rounded-lg border bg-[#fcfcfd] px-2 pb-2 pt-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ${
          selected ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-300"
        }`}
      >
        <div className="mb-1 flex items-center justify-between gap-1">
          <button
            type="button"
            className="rounded p-0.5 text-slate-300 hover:bg-slate-100 hover:text-emerald-600"
            aria-label="Làm mới số liệu"
            title="Làm mới số liệu"
            onClick={(event) => {
              event.stopPropagation();
              refreshLive();
            }}
          >
            <RefreshIcon className="h-3 w-3" />
          </button>
          <span className={`h-1.5 w-1.5 rounded-full ${statusDot[data.status]}`} />
          <button
            type="button"
            className="rounded p-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cài đặt điểm đo"
            onClick={(event) => {
              event.stopPropagation();
              openSettings(id);
            }}
          >
            <GearIcon className="h-3 w-3" />
          </button>
        </div>

        {/* Ký hiệu SLD */}
        <div className={`mx-auto flex h-12 w-12 items-center justify-center ${statusStroke[data.status]}`}>
          {data.iconImage ? (
            <img src={data.iconImage} alt="" className="h-10 w-10 rounded object-cover" />
          ) : (
            <SldGlyph type={data.icon} className="h-11 w-11" />
          )}
        </div>

        <div className="mt-1.5 text-center">
          <p className="truncate text-[11px] font-bold leading-tight text-slate-800">{data.title}</p>
          {data.subtitle ? (
            <p className="truncate font-mono text-[9px] text-slate-400">{data.subtitle}</p>
          ) : null}
          {data.statusLabel ? (
            <span
              className={`mt-1 inline-flex max-w-full truncate rounded border px-1.5 py-0.5 text-[8px] font-bold tracking-wide ${statusChip[data.status]}`}
            >
              {data.statusLabel}
            </span>
          ) : null}
        </div>

        {data.metrics.length ? (
          <div className="mt-1.5 space-y-0.5 border-t border-slate-200/80 pt-1.5">
            {data.metrics.slice(0, 4).map((metric) => (
              <div
                key={metric.key ?? metric.label}
                className="flex items-baseline justify-between gap-1 text-[9px] leading-tight"
              >
                <span className="truncate text-slate-400">{metric.label}</span>
                <span className="shrink-0 font-semibold tabular-nums text-slate-800">{metric.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mx-auto h-3 w-0.5 bg-slate-700" />

      <Handle
        type="source"
        position={Position.Bottom}
        id="child"
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-700"
        title="Kéo xuống để gắn điểm con"
      />
    </div>
  );
}

export function JunctionNode({ selected }: NodeProps<JunctionFlowNode>) {
  return (
    <div
      className={`relative flex h-5 w-5 items-center justify-center ${
        selected ? "ring-2 ring-emerald-500/30 ring-offset-1" : ""
      }`}
      title="Điểm nhánh"
    >
      <span className="h-2.5 w-2.5 rotate-45 border-2 border-slate-700 bg-white" />
      <Handle
        id="in"
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border !border-white !bg-slate-700"
      />
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        className="!h-2 !w-2 !border !border-white !bg-slate-700"
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border !border-white !bg-slate-700"
      />
      <Handle
        id="out"
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border !border-white !bg-slate-700"
      />
    </div>
  );
}

/** Ký hiệu gần với single-line: vòng đo, tủ, máy biến áp kiểu nhà máy… */
function SldGlyph({ type, className }: { type: MeterIcon; className?: string }) {
  if (type === "cabinet") {
    return (
      <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
        <rect x="12" y="8" width="24" height="32" rx="1" stroke="currentColor" strokeWidth="2" />
        <path d="M12 16h24M12 28h24M20 22h8M20 34h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "meter") {
    return (
      <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
        <circle cx="24" cy="24" r="12" stroke="currentColor" strokeWidth="2.2" />
        <path d="M24 16v8l5 3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 8v4M24 36v4M8 24h4M36 24h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "fan") {
    return (
      <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
        <circle cx="24" cy="24" r="4" stroke="currentColor" strokeWidth="2" />
        <path
          d="M24 20c6-7 13 0 8 6M24 28c-6 7-13 0-8-6M28 24c7 6 0 13-6 8M20 24c-7-6 0-13 6-8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (type === "pump") {
    return (
      <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
        <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="2.2" />
        <path d="M24 14V8M24 40v-6M34 24h6M8 24h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "valve") {
    return (
      <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
        <path d="M8 24h32M16 14l8 10-8 10M32 14l-8 10 8 10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "solar") {
    return (
      <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
        <rect x="10" y="16" width="28" height="16" rx="1" stroke="currentColor" strokeWidth="2" />
        <path d="M17 32v6M24 32v6M31 32v6M24 10v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "boiler") {
    return (
      <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
        <rect x="12" y="18" width="24" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M18 18V14h12v4M16 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  // plant — trạm / nguồn
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M10 38V22l8-4v4l8-5v5l8-3v19H10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M30 20h6v18h-6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="24" cy="30" r="2.5" fill="currentColor" />
    </svg>
  );
}

/** Giữ export cũ cho panel cài đặt chọn icon. */
export function NodeGlyph({ type, className }: { type: MeterIcon; className?: string }) {
  return <SldGlyph type={type} className={className} />;
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 12a8 8 0 1 1-2.3-5.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M20 5v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 5v1.5M12 17.5V19M19 12h-1.5M6.5 12H5M16.8 7.2l-1 1M8.2 15.8l-1 1M16.8 16.8l-1-1M8.2 8.2l-1-1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
