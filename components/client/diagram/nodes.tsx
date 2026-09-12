"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useDiagramActions } from "./context";
import type { JunctionFlowNode, MeterFlowNode, MeterIcon, MeterStatus } from "./types";

const statusBorder: Record<MeterStatus, string> = {
  normal: "border-emerald-500",
  warning: "border-[#f59e0b]",
  offline: "border-slate-300",
};

const statusText: Record<MeterStatus, string> = {
  normal: "text-emerald-600",
  warning: "text-[#ea8c12]",
  offline: "text-slate-400",
};

const iconWrap: Record<MeterStatus, string> = {
  normal: "bg-emerald-50 text-emerald-600",
  warning: "bg-orange-50 text-[#ea8c12]",
  offline: "bg-slate-100 text-slate-400",
};

export function MeterNode({ id, data, selected }: NodeProps<MeterFlowNode>) {
  const { openSettings } = useDiagramActions();

  return (
    <div
      className={`diagram-card w-[248px] rounded-xl border-2 bg-white px-3.5 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.06)] ${statusBorder[data.status]} ${
        selected ? "ring-2 ring-emerald-500/25" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="parent"
        className="!-top-1.5 !h-3 !w-3 !border-2 !border-white !bg-emerald-600"
        title="Nối từ điểm cha"
      />

      <div className="mb-2 flex items-start justify-between text-slate-300">
        <RefreshIcon className="h-3.5 w-3.5" />
        <button
          type="button"
          className="rounded p-0.5 hover:bg-slate-100 hover:text-slate-500"
          aria-label="Cài đặt điểm đo"
          onClick={(event) => {
            event.stopPropagation();
            openSettings(id);
          }}
        >
          <GearIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-start gap-2.5">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ${iconWrap[data.status]}`}
        >
          {data.iconImage ? (
            <img src={data.iconImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <NodeGlyph type={data.icon} className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="truncate text-[13.5px] font-bold text-slate-800">{data.title}</p>
          {data.subtitle ? (
            <p className="text-[12px] text-slate-400">{data.subtitle}</p>
          ) : null}
          {data.statusLabel ? (
            <p className={`mt-0.5 text-[11px] font-bold tracking-wide ${statusText[data.status]}`}>
              {data.statusLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={`mt-3 grid gap-x-4 gap-y-1.5 ${
          data.metrics.length > 2 ? "grid-cols-2" : "grid-cols-2"
        }`}
      >
        {data.metrics.map((metric) => (
          <div key={metric.label}>
            <p className="text-[10.5px] text-slate-400">{metric.label}</p>
            <p className="text-[12.5px] font-semibold text-slate-700">{metric.value}</p>
          </div>
        ))}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="child"
        className="!-bottom-1.5 !h-3 !w-3 !border-2 !border-white !bg-emerald-600"
        title="Kéo xuống để gắn điểm con"
      />
    </div>
  );
}

export function JunctionNode({ selected }: NodeProps<JunctionFlowNode>) {
  return (
    <div
      className={`relative flex h-8 w-8 items-center justify-center rounded-md border-2 bg-white shadow-sm ${
        selected ? "border-emerald-600 ring-2 ring-emerald-500/25" : "border-slate-300"
      }`}
      title="Điểm nhánh — kéo để chỉnh cây cha-con"
    >
      <span className="h-2 w-2 rounded-full bg-slate-400" />
      <Handle
        id="in"
        type="target"
        position={Position.Top}
        className="!-top-1.5 !h-3 !w-3 !border-2 !border-white !bg-[#64748b]"
      />
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        className="!-left-1.5 !h-3 !w-3 !border-2 !border-white !bg-[#64748b]"
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="!-right-1.5 !h-3 !w-3 !border-2 !border-white !bg-[#64748b]"
      />
      <Handle
        id="out"
        type="source"
        position={Position.Bottom}
        className="!-bottom-1.5 !h-3 !w-3 !border-2 !border-white !bg-[#64748b]"
      />
    </div>
  );
}

function NodeGlyph({ type, className }: { type: MeterIcon; className?: string }) {
  if (type === "cabinet") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="6" y="4" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9 8h6M9 12h6M9 16h3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "fan") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 9.5c3-3.8 7 0 4.2 3.2M12 14.5c-3 3.8-7 0-4.2-3.2M14.5 12c3.8 3 0 7-3.2 4.2M9.5 12C5.7 9 9.8 5 12.9 8.8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (type === "meter") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8 15V9M12 15v-4M16 15v-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "pump") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 7.5V4M12 20v-3.5M16.5 12H20M4 12h3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "valve") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 12h16M8 8l4 4-4 4M16 8l-4 4 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "solar") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="8" width="16" height="10" rx="1" stroke="currentColor" strokeWidth="1.7" />
        <path d="M7 18v3M12 18v3M17 18v3M12 4v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "boiler") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="5" y="10" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8 10V7h8v3M9 6h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 20V10l4-2v3l4-3v4l4-2v10H5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M15 11h4v9h-4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
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

export { NodeGlyph };
