"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Background,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { DiagramActionsContext } from "./diagram/context";
import { JunctionNode, MeterNode, NodeGlyph } from "./diagram/nodes";
import type {
  DiagramEdge,
  DiagramNode,
  EnergyKind,
  MeterIcon,
  MeterNodeData,
} from "./diagram/types";

const ENERGY_FILTERS: EnergyKind[] = ["Điện", "Nhiệt", "Khí nén", "Nước"];

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
  junction: JunctionNode,
};

const edgeStyle = { stroke: "#c5cdd6", strokeWidth: 2 };

const initialNodes: DiagramNode[] = [
  {
    id: "source",
    type: "meter",
    position: { x: 336, y: 24 },
    data: {
      title: "Nguồn Tổng",
      subtitle: "Main Feed",
      status: "normal",
      icon: "plant",
      energy: "Điện",
      listed: false,
      metrics: [
        { label: "U (V)", value: "400.2" },
        { label: "P (kW)", value: "8.2" },
      ],
    },
  },
  {
    id: "junction",
    type: "junction",
    position: { x: 452, y: 250 },
    draggable: false,
    selectable: false,
    data: {},
  },
  {
    id: "office",
    type: "meter",
    position: { x: 88, y: 330 },
    selected: true,
    data: {
      title: "Tủ điện văn phòng",
      status: "warning",
      statusLabel: "CẢNH BÁO",
      icon: "cabinet",
      energy: "Điện",
      listed: true,
      metrics: [
        { label: "Điện áp (U)", value: "398.5 V" },
        { label: "Hệ số tải", value: "15 %" },
        { label: "Dòng điện (I)", value: "4.2 A" },
        { label: "Tần số (f)", value: "50.0 Hz" },
      ],
    },
  },
  {
    id: "compressor",
    type: "meter",
    position: { x: 560, y: 330 },
    data: {
      title: "Động cơ Máy nén 1",
      status: "offline",
      statusLabel: "MẤT KẾT NỐI",
      icon: "fan",
      energy: "Điện",
      listed: false,
      metrics: [
        { label: "Điện áp (U)", value: "0.0 V" },
        { label: "Hệ số tải", value: "0 %" },
        { label: "Dòng điện (I)", value: "0.0 A" },
        { label: "Tần số (f)", value: "-- Hz" },
      ],
    },
  },
];

const initialEdges: DiagramEdge[] = [
  {
    id: "e-source-j",
    source: "source",
    target: "junction",
    targetHandle: "in",
    type: "smoothstep",
    style: edgeStyle,
  },
  {
    id: "e-j-office",
    source: "junction",
    sourceHandle: "left",
    target: "office",
    type: "smoothstep",
    style: edgeStyle,
  },
  {
    id: "e-j-compressor",
    source: "junction",
    sourceHandle: "right",
    target: "compressor",
    type: "smoothstep",
    style: edgeStyle,
  },
];

const extraPoints = [
  { id: "new-point-432", name: "New Point432", status: "offline" as const },
];

export function SystemDiagram() {
  return (
    <ReactFlowProvider>
      <SystemDiagramInner />
    </ReactFlowProvider>
  );
}

function SystemDiagramInner() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [group, setGroup] = useState("group-1");
  const [energy, setEnergy] = useState<EnergyKind>("Điện");
  const [selectedId, setSelectedId] = useState("office");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView, setCenter, getNode } = useReactFlow();

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

  const updateSelectedNode = useCallback(
    (patch: Partial<MeterNodeData>) => {
      if (!selectedId) return;
      setNodes((current) =>
        current.map((node) =>
          node.id === selectedId && node.type === "meter"
            ? { ...node, data: { ...(node.data as MeterNodeData), ...patch } }
            : node,
        ),
      );
    },
    [selectedId, setNodes],
  );

  const listedPoints = useMemo(() => {
    const flowPoints = nodes
      .filter((node) => node.type === "meter" && node.data.listed)
      .map((node) => ({
        id: node.id,
        name: (node.data as MeterNodeData).title,
        status: (node.data as MeterNodeData).status,
      }));
    return [...flowPoints, ...extraPoints];
  }, [nodes]);

  const visibleNodes = useMemo(() => {
    if (energy === "Điện") return nodes;
    return nodes.filter(
      (node) => node.type === "junction" || (node.data as MeterNodeData).energy === energy,
    );
  }, [energy, nodes]);

  const visibleIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes],
  );

  const visibleEdges = useMemo(
    () => edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
    [edges, visibleIds],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) =>
        addEdge({ ...connection, type: "smoothstep", style: edgeStyle }, current),
      );
    },
    [setEdges],
  );

  const selectPoint = (id: string) => {
    setSelectedId(id);
    setSettingsOpen(false);
    const node = getNode(id);
    if (!node) return;
    setNodes((current) =>
      current.map((item) => ({ ...item, selected: item.id === id })),
    );
    const width = node.measured?.width ?? 248;
    const height = node.measured?.height ?? 160;
    setCenter(node.position.x + width / 2, node.position.y + height / 2, {
      zoom: 1,
      duration: 280,
    });
  };

  const addPoint = () => {
    const index = nodes.filter((node) => node.type === "meter").length;
    const id = `point-${Date.now()}`;
    const offset = (index % 3) * 40;
    setNodes((current) => [
      ...current,
      {
        id,
        type: "meter",
        position: { x: 320 + offset, y: 560 + offset },
        selected: true,
        data: {
          title: `Điểm đo ${index}`,
          status: "offline",
          statusLabel: "MẤT KẾT NỐI",
          icon: "cabinet",
          energy,
          listed: true,
          metrics: [
            { label: "Điện áp (U)", value: "0.0 V" },
            { label: "Hệ số tải", value: "0 %" },
            { label: "Dòng điện (I)", value: "0.0 A" },
            { label: "Tần số (f)", value: "-- Hz" },
          ],
        },
      },
    ]);
    setEdges((current) => [
      ...current,
      {
        id: `e-j-${id}`,
        source: "junction",
        sourceHandle: index % 2 === 0 ? "left" : "right",
        target: id,
        type: "smoothstep",
        style: edgeStyle,
      },
    ]);
    setSelectedId(id);
  };

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
        <div className="px-4 pb-3">
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-[#1a73e8]"
          >
            <option value="group-1">Nhóm 1</option>
            <option value="group-2">Nhóm 2</option>
          </select>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {group === "group-2" ? (
            <li className="px-3 py-6 text-center text-sm text-slate-400">
              Chưa có điểm đo trong nhóm này
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
                    <span className="truncate">
                      {index + 1}. {point.name}
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
              Tùy chỉnh Biểu tượng & Thông số Hiển thị
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {ENERGY_FILTERS.map((item) => (
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
          <div className="flex items-center gap-2">
            {savedAt ? (
              <span className="text-[11px] text-emerald-600">Đã lưu {savedAt}</span>
            ) : null}
            <button
              type="button"
              onClick={() =>
                setSavedAt(
                  new Date().toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                )
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-semibold tracking-wide text-slate-600 hover:bg-slate-50"
            >
              <SaveIcon className="h-3.5 w-3.5" />
              LƯU SƠ ĐỒ
            </button>
            <button
              type="button"
              onClick={addPoint}
              className="inline-flex h-9 items-center gap-1 rounded-md bg-[#1a73e8] px-3 text-[12px] font-semibold tracking-wide text-white hover:bg-[#1666d0]"
            >
              + THÊM ĐIỂM
            </button>
          </div>
        </div>

        <div ref={wrapperRef} className="relative flex min-h-0 flex-1">
          <div className="relative min-h-0 min-w-0 flex-1">
            <ReactFlow
              className="diagram-flow"
              nodes={visibleNodes}
              edges={visibleEdges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => {
                if (node.type === "meter") {
                  setSelectedId(node.id);
                  setSettingsOpen(true);
                }
              }}
              onPaneClick={() => setSettingsOpen(false)}
              nodesConnectable
              fitView
              fitViewOptions={{ padding: 0.28 }}
              minZoom={0.4}
              maxZoom={1.8}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={22} size={1} color="#e8edf3" />
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
            {energy !== "Điện" && visibleNodes.filter((n) => n.type === "meter").length === 0 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <p className="rounded-lg bg-white/90 px-4 py-2 text-sm text-slate-400">
                  Chưa có điểm đo loại {energy} trên sơ đồ
                </p>
              </div>
            ) : null}
          </div>

          {settingsOpen && selectedData ? (
            <NodeSettingsPanel
              data={selectedData}
              onClose={() => setSettingsOpen(false)}
              onChange={updateSelectedNode}
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
          <h2 className="text-[13px] font-semibold text-slate-800">Cài đặt điểm đo</h2>
          <p className="text-[11px] text-slate-400">Tùy chỉnh tên và biểu tượng</p>
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
        <SettingsField label="TÊN ĐIỂM ĐO">
          <input
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Nhập tên điểm đo"
            className="input"
          />
        </SettingsField>

        <SettingsField label="MÔ TẢ PHỤ">
          <input
            value={data.subtitle ?? ""}
            onChange={(e) => onChange({ subtitle: e.target.value || undefined })}
            placeholder="VD: Main Feed, Line A..."
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

        <SettingsField label="HIỂN THỊ">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={data.listed ?? false}
              onChange={(e) => onChange({ listed: e.target.checked })}
              className="accent-[#1a73e8]"
            />
            Hiển thị trong danh sách điểm đo
          </label>
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

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 5h11l3 3v11H5V5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M8 5v5h8V5M8 19v-5h8v5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function FitIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M20 15v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 5h5v5M10 19H5v-5M19 9l-6 6M5 15l6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path d="m4 16 4.5-4.5 3 3L15 11l5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
