"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Background,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  loadClientMeters,
  type ClientMeter,
} from "@/lib/client-meters";
import { loadProjects, resolveMeterTypes, type MeterType } from "@/lib/projects";
import { DiagramActionsContext } from "./diagram/context";
import { MeterNode, NodeGlyph } from "./diagram/nodes";
import type {
  DiagramEdge,
  DiagramNode,
  EnergyKind,
  MeterIcon,
  MeterNodeData,
  MeterStatus,
} from "./diagram/types";

const ICON_OPTIONS: { id: MeterIcon; label: string }[] = [
  { id: "plant", label: "Nhà máy" },
  { id: "cabinet", label: "Tủ điện" },
  { id: "fan", label: "Quạt/Máy nén" },
  { id: "meter", label: "Đồng hồ" },
  { id: "pump", label: "Bơm" },
  { id: "valve", label: "Van" },
  { id: "solar", label: "Pin mặt trời" },
  { id: "boiler", label: "Lò hơi" },
];

const nodeTypes: NodeTypes = {
  meter: MeterNode,
};

const edgeStyle = { stroke: "#c5cdd6", strokeWidth: 2 };

const NODE_W = 248;
const H_GAP = 48;
const V_GAP = 120;

function iconForUtility(utility: string): MeterIcon {
  if (utility === "Nước") return "pump";
  if (utility === "Hơi") return "boiler";
  if (utility === "Nhiệt") return "boiler";
  return "meter";
}

function demoMetrics(meter: ClientMeter, status: MeterStatus): MeterNodeData["metrics"] {
  if (meter.utility !== "Điện") {
    if (status === "offline") {
      return [
        { label: "Giá trị", value: "--" },
        { label: "Trạng thái", value: "Mất kết nối" },
      ];
    }
    return [
      { label: "Giá trị", value: "—" },
      { label: "Mã", value: meter.code },
    ];
  }
  if (status === "offline") {
    return [
      { label: "Điện áp (U)", value: "0.0 V" },
      { label: "Hệ số tải", value: "0 %" },
      { label: "Dòng điện (I)", value: "0.0 A" },
      { label: "Tần số (f)", value: "-- Hz" },
    ];
  }
  if (meter.parentId === null) {
    return [
      { label: "U (V)", value: "400.2" },
      { label: "P (kW)", value: "8.2" },
    ];
  }
  return [
    { label: "Điện áp (U)", value: "398.5 V" },
    { label: "Hệ số tải", value: "15 %" },
    { label: "Dòng điện (I)", value: "4.2 A" },
    { label: "Tần số (f)", value: "50.0 Hz" },
  ];
}

function statusForMeter(meter: ClientMeter): { status: MeterStatus; statusLabel?: string } {
  if (!meter.deviceId) {
    return { status: "offline", statusLabel: "MẤT KẾT NỐI" };
  }
  if (meter.name.toLowerCase().includes("văn phòng") || meter.code.includes("OFF")) {
    return { status: "warning", statusLabel: "CẢNH BÁO" };
  }
  return { status: "normal" };
}

function buildFlowFromMeters(meters: ClientMeter[]): {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
} {
  const byParent = new Map<string | null, ClientMeter[]>();
  for (const meter of meters) {
    const key = meter.parentId && meters.some((m) => m.id === meter.parentId) ? meter.parentId : null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(meter);
  }

  function subtreeWidth(id: string): number {
    const kids = byParent.get(id) ?? [];
    if (!kids.length) return NODE_W;
    return kids.reduce((sum, child) => sum + subtreeWidth(child.id), 0) + (kids.length - 1) * H_GAP;
  }

  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];

  function place(meter: ClientMeter, centerX: number, y: number) {
    const { status, statusLabel } = statusForMeter(meter);
    nodes.push({
      id: meter.id,
      type: "meter",
      position: { x: centerX - NODE_W / 2, y },
      data: {
        title: meter.name,
        subtitle: meter.code,
        status,
        statusLabel,
        icon: meter.parentId === null && meter.utility === "Điện" ? "plant" : iconForUtility(meter.utility),
        energy: meter.utility,
        listed: true,
        metrics: demoMetrics(meter, status),
      },
    });

    const kids = byParent.get(meter.id) ?? [];
    if (!kids.length) return;

    const totalW =
      kids.reduce((sum, child) => sum + subtreeWidth(child.id), 0) + (kids.length - 1) * H_GAP;
    let cursor = centerX - totalW / 2;
    for (const child of kids) {
      const w = subtreeWidth(child.id);
      const childCenter = cursor + w / 2;
      place(child, childCenter, y + V_GAP);
      edges.push({
        id: `e-${meter.id}-${child.id}`,
        source: meter.id,
        sourceHandle: "child",
        target: child.id,
        targetHandle: "parent",
        type: "smoothstep",
        style: edgeStyle,
      });
      cursor += w + H_GAP;
    }
  }

  const roots = byParent.get(null) ?? [];
  if (roots.length) {
    const totalW =
      roots.reduce((sum, root) => sum + subtreeWidth(root.id), 0) + (roots.length - 1) * H_GAP;
    let cursor = 80;
    for (const root of roots) {
      const w = subtreeWidth(root.id);
      place(root, cursor + w / 2, 24);
      cursor += w + H_GAP;
    }
  }

  return { nodes, edges };
}

export function SystemDiagram() {
  return (
    <ReactFlowProvider>
      <SystemDiagramInner />
    </ReactFlowProvider>
  );
}

function SystemDiagramInner() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "default";
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [energyFilters, setEnergyFilters] = useState<MeterType[]>(() => resolveMeterTypes(null));
  const [energy, setEnergy] = useState<EnergyKind>("Điện");
  const [meters, setMeters] = useState<ClientMeter[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [displayOverrides, setDisplayOverrides] = useState<
    Record<string, Partial<MeterNodeData>>
  >({});
  const [nodes, setNodes, onNodesChange] = useNodesState<DiagramNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<DiagramEdge>([]);
  const { fitView, setCenter, getNode } = useReactFlow();

  const reloadMeters = useCallback(() => {
    const rows = loadClientMeters(projectId);
    setMeters(rows);
  }, [projectId]);

  useEffect(() => {
    const project = loadProjects().find((item) => item.id === projectId);
    const types = resolveMeterTypes(project);
    setEnergyFilters(types);
    setEnergy((current) => (types.includes(current) ? current : types[0] ?? "Điện"));
    reloadMeters();
  }, [projectId, reloadMeters]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "ems-client-meters") reloadMeters();
    };
    const onCustom = () => reloadMeters();
    window.addEventListener("storage", onStorage);
    window.addEventListener("ems-client-meters-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ems-client-meters-changed", onCustom);
    };
  }, [reloadMeters]);

  useEffect(() => {
    const filtered = meters.filter((meter) => meter.utility === energy);
    const built = buildFlowFromMeters(filtered);
    setNodes(
      built.nodes.map((node) => {
        const patch = displayOverrides[node.id];
        const data = patch
          ? { ...(node.data as MeterNodeData), ...patch }
          : (node.data as MeterNodeData);
        return {
          ...node,
          type: "meter" as const,
          data,
          selected: node.id === selectedId,
        };
      }),
    );
    setEdges(built.edges);

    const ids = new Set(filtered.map((meter) => meter.id));
    if (selectedId && !ids.has(selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
      setSettingsOpen(false);
    } else if (!selectedId && filtered[0]) {
      setSelectedId(filtered[0].id);
    }

    const frame = requestAnimationFrame(() => fitView({ padding: 0.28, duration: 200 }));
    return () => cancelAnimationFrame(frame);
    // selectedId only used for highlight when rebuilding; selection-only updates handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meters, energy, displayOverrides, setNodes, setEdges, fitView]);

  useEffect(() => {
    setNodes((current) =>
      current.map((item) => ({ ...item, selected: item.id === selectedId })),
    );
  }, [selectedId, setNodes]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedId && node.type === "meter") ?? null,
    [nodes, selectedId],
  );

  const selectedData = selectedNode?.data as MeterNodeData | undefined;

  const diagramActions = useMemo(
    () => ({
      openSettings: (nodeId: string) => {
        setSelectedId(nodeId);
        setSettingsOpen(true);
        setNodes((current) =>
          current.map((item) => ({ ...item, selected: item.id === nodeId })),
        );
      },
    }),
    [setNodes],
  );

  const updateSelectedDisplay = useCallback(
    (patch: Partial<MeterNodeData>) => {
      if (!selectedId) return;
      setDisplayOverrides((current) => ({
        ...current,
        [selectedId]: { ...current[selectedId], ...patch },
      }));
    },
    [selectedId],
  );

  const listedPoints = useMemo(() => {
    return meters
      .filter((meter) => meter.utility === energy)
      .map((meter) => {
        const override = displayOverrides[meter.id];
        const { status } = statusForMeter(meter);
        return {
          id: meter.id,
          name: override?.title ?? meter.name,
          status: override?.status ?? status,
          energy: meter.utility,
          code: meter.code,
          deviceId: meter.deviceId,
        };
      });
  }, [meters, energy, displayOverrides]);

  const selectPoint = (id: string) => {
    setSelectedId(id);
    setSettingsOpen(false);
    setNodes((current) =>
      current.map((item) => ({ ...item, selected: item.id === id })),
    );
    const node = getNode(id);
    if (!node) return;
    const width = node.measured?.width ?? NODE_W;
    const height = node.measured?.height ?? 160;
    setCenter(node.position.x + width / 2, node.position.y + height / 2, {
      zoom: 1,
      duration: 280,
    });
  };

  const configHref = `/du-an/${projectId}/cau-hinh`;

  return (
    <DiagramActionsContext.Provider value={diagramActions}>
      <div className="flex h-full min-h-0 bg-white">
        <aside className="flex w-[270px] shrink-0 flex-col border-r border-slate-200 bg-[#f7f9fc]">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <h2 className="text-[12px] font-bold tracking-[0.08em] text-slate-500">
              DANH SÁCH ĐIỂM ĐO
            </h2>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 disabled:opacity-40"
              aria-label="Cài đặt điểm đo"
              disabled={!selectedNode}
              onClick={() => selectedNode && setSettingsOpen(true)}
            >
              <GearIcon className="h-4 w-4" />
            </button>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {listedPoints.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-400">
                Chưa có điểm đo. Thêm tại Cấu hình.
              </li>
            ) : (
              listedPoints.map((point, index) => {
                const active = selectedId === point.id;
                return (
                  <li key={point.id}>
                    <button
                      type="button"
                      onClick={() => selectPoint(point.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13px] ${
                        active
                          ? "bg-[#1a73e8] font-medium text-white"
                          : "text-slate-600 hover:bg-slate-200/70"
                      }`}
                    >
                      <span className="min-w-0 truncate">
                        <span className="block truncate">
                          {index + 1}. {point.name}
                        </span>
                        <span
                          className={`block text-[10px] ${
                            active ? "text-white/75" : "text-slate-400"
                          }`}
                        >
                          {point.code}
                          {!point.deviceId ? " · Chưa gán TB" : ""}
                        </span>
                      </span>
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          point.status === "warning"
                            ? "bg-[#f59e0b]"
                            : point.status === "normal"
                              ? "bg-emerald-500"
                              : "bg-slate-300"
                        } ${active && point.status === "warning" ? "ring-2 ring-white/70" : ""}`}
                      />
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <div>
              <h1 className="text-lg font-bold text-slate-800">Sơ đồ Hệ thống</h1>
              <p className="text-[12px] text-slate-400">
                Cây cha–con lấy từ Cấu hình → Cụm điểm đo
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {energyFilters.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setEnergy(item)}
                    className={`rounded-full px-3.5 py-1 text-[12px] font-medium ${
                      energy === item
                        ? "bg-[#1a73e8] text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <Link
              href={configHref}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#1a73e8] px-3 text-[12px] font-semibold tracking-wide text-white hover:bg-[#1666d0]"
            >
              Cấu hình điểm đo
            </Link>
          </div>

          <div ref={wrapperRef} className="relative flex min-h-0 flex-1">
            <div className="relative min-h-0 min-w-0 flex-1">
              <ReactFlow
                className="diagram-flow"
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(_, node) => {
                  if (node.type === "meter") {
                    setSelectedId(node.id);
                    setSettingsOpen(true);
                  }
                }}
                onPaneClick={() => setSettingsOpen(false)}
                nodesConnectable={false}
                edgesFocusable={false}
                elementsSelectable
                nodesDraggable
                fitView
                fitViewOptions={{ padding: 0.28 }}
                minZoom={0.4}
                maxZoom={1.8}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={22} size={1} color="#e8edf3" />
                <Panel
                  position="top-left"
                  className="m-3 max-w-[300px] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-[11px] leading-relaxed text-slate-500 shadow-sm"
                >
                  <p className="font-semibold text-slate-700">Cây cha–con</p>
                  <p>
                    Thêm điểm đo và gán ID thiết bị tại{" "}
                    <Link href={configHref} className="font-medium text-[#1a73e8] hover:underline">
                      Cấu hình → Cụm điểm đo
                    </Link>
                    . Kéo thả dòng trong cấu hình để đặt quan hệ cha–con.
                  </p>
                </Panel>
                <CanvasControls
                  onFit={() => fitView({ padding: 0.28, duration: 220 })}
                  onFullscreen={() => {
                    const el = wrapperRef.current;
                    if (!el) return;
                    if (document.fullscreenElement) {
                      void document.exitFullscreen();
                    } else {
                      void el.requestFullscreen();
                    }
                  }}
                />
              </ReactFlow>
              {listedPoints.length === 0 ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="rounded-lg bg-white/90 px-5 py-4 text-center">
                    <CloudIcon className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-400">
                      Chưa có điểm đo loại {energy} — thêm tại Cấu hình
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {settingsOpen && selectedData ? (
              <NodeSettingsPanel
                data={selectedData}
                onClose={() => setSettingsOpen(false)}
                onChange={updateSelectedDisplay}
              />
            ) : null}
          </div>
        </section>
      </div>
    </DiagramActionsContext.Provider>
  );
}

function NodeSettingsPanel({
  data,
  onClose,
  onChange,
}: {
  data: MeterNodeData;
  onClose: () => void;
  onChange: (patch: Partial<MeterNodeData>) => void;
}) {
  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold text-slate-800">Hiển thị điểm đo</h2>
          <p className="text-[11px] text-slate-400">Chỉ tùy chỉnh biểu tượng trên sơ đồ</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Đóng cài đặt"
        >
          ×
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <SettingsField label="TÊN HIỂN THỊ">
          <input
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="input"
          />
        </SettingsField>

        <SettingsField label="BIỂU TƯỢNG">
          <div className="grid grid-cols-4 gap-2">
            {ICON_OPTIONS.map((option) => {
              const active = data.icon === option.id && !data.iconImage;
              return (
                <button
                  key={option.id}
                  type="button"
                  title={option.label}
                  onClick={() => onChange({ icon: option.id, iconImage: undefined })}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-[10px] ${
                    active
                      ? "border-[#1a73e8] bg-[#eef5ff] text-[#1a73e8]"
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                    <NodeGlyph type={option.id} className="h-4 w-4" />
                  </span>
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </SettingsField>

        <SettingsField label="ẢNH TÙY CHỈNH">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center hover:border-[#1a73e8] hover:bg-[#f4f8ff]">
            {data.iconImage ? (
              <img
                src={data.iconImage}
                alt="Biểu tượng tùy chỉnh"
                className="mb-2 h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <ImageIcon className="mb-2 h-7 w-7 text-slate-400" />
            )}
            <span className="text-[11px] font-medium text-slate-600">
              {data.iconImage ? "Chọn ảnh khác" : "Tải ảnh lên"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                onChange({ iconImage: URL.createObjectURL(file) });
              }}
            />
          </label>
          {data.iconImage ? (
            <button
              type="button"
              onClick={() => onChange({ iconImage: undefined })}
              className="mt-2 text-[11px] font-medium text-red-500 hover:underline"
            >
              Xóa ảnh, dùng biểu tượng mặc định
            </button>
          ) : null}
        </SettingsField>
      </div>
    </aside>
  );
}

function SettingsField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function CanvasControls({
  onFit,
  onFullscreen,
}: {
  onFit: () => void;
  onFullscreen: () => void;
}) {
  const { zoomIn, zoomOut } = useReactFlow();

  return (
    <Panel position="bottom-right" className="m-4 flex flex-col gap-2">
      <ControlButton label="Phóng to" onClick={() => zoomIn({ duration: 160 })}>
        +
      </ControlButton>
      <ControlButton label="Thu nhỏ" onClick={() => zoomOut({ duration: 160 })}>
        −
      </ControlButton>
      <ControlButton label="Vừa khung hình" onClick={onFit}>
        <FitIcon className="h-4 w-4" />
      </ControlButton>
      <ControlButton label="Toàn màn hình" onClick={onFullscreen}>
        <ExpandIcon className="h-4 w-4" />
      </ControlButton>
    </Panel>
  );
}

function ControlButton({
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
      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-500 shadow-sm hover:text-slate-800"
    >
      {children}
    </button>
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

function FitIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 4H4v5M15 4h5v5M9 20H4v-5M20 15v5h-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 5h5v5M10 19H5v-5M19 9l-6 6M5 15l6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path
        d="m4 16 4.5-4.5 3 3L15 11l5 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7.5 18h10a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.7-1.5A3.5 3.5 0 0 0 7.5 18Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
