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
  type Viewport,
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

const edgeStyle = { stroke: "#cbd5e1", strokeWidth: 2 };

const NODE_W = 248;
const H_GAP = 48;
const V_GAP = 120;

// ---------------- Persistence System ----------------

type SavedDiagramState = {
  positions: Record<string, { x: number; y: number }>;
  viewport?: { x: number; y: number; zoom: number };
};

function getStorageKey(projectId: string, energy: string) {
  return `ems-diagram-layout-${projectId}-${energy}`;
}

function loadDiagramState(projectId: string, energy: string): SavedDiagramState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getStorageKey(projectId, energy));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDiagramPositions(
  projectId: string,
  energy: string,
  patches: Record<string, { x: number; y: number }>,
) {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey(projectId, energy);
    const current = loadDiagramState(projectId, energy) ?? { positions: {} };
    const updated: SavedDiagramState = {
      ...current,
      positions: { ...current.positions, ...patches },
    };
    window.localStorage.setItem(key, JSON.stringify(updated));
  } catch {}
}

function saveDiagramViewport(
  projectId: string,
  energy: string,
  viewport: Viewport,
) {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey(projectId, energy);
    const current = loadDiagramState(projectId, energy) ?? { positions: {} };
    const updated: SavedDiagramState = {
      ...current,
      viewport: {
        x: Math.round(viewport.x),
        y: Math.round(viewport.y),
        zoom: Number(viewport.zoom.toFixed(3)),
      },
    };
    window.localStorage.setItem(key, JSON.stringify(updated));
  } catch {}
}

function clearDiagramState(projectId: string, energy: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getStorageKey(projectId, energy));
}

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
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [energyFilters, setEnergyFilters] = useState<MeterType[]>(() => resolveMeterTypes(null));
  const [energy, setEnergy] = useState<EnergyKind>("Điện");
  const [meters, setMeters] = useState<ClientMeter[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [displayOverrides, setDisplayOverrides] = useState<
    Record<string, Partial<MeterNodeData>>
  >({});
  const [nodes, setNodes, onNodesChange] = useNodesState<DiagramNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<DiagramEdge>([]);
  const { fitView, setCenter, getNode, setViewport } = useReactFlow();

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

  // Load or build diagram nodes, restoring saved positions & viewport
  useEffect(() => {
    const filtered = meters.filter((meter) => meter.utility === energy);
    const built = buildFlowFromMeters(filtered);
    const savedState = loadDiagramState(projectId, energy);
    const savedPositions = savedState?.positions ?? {};

    const restoredNodes: DiagramNode[] = built.nodes.map((node) => {
      const patch = displayOverrides[node.id];
      const data = patch
        ? { ...(node.data as MeterNodeData), ...patch }
        : (node.data as MeterNodeData);
      // Restore previously dragged position if exists!
      const position = savedPositions[node.id] ? { ...savedPositions[node.id] } : node.position;
      return {
        ...node,
        type: "meter" as const,
        position,
        data,
        selected: node.id === selectedId,
      };
    });

    setNodes(restoredNodes);
    setEdges(built.edges);

    const ids = new Set(filtered.map((meter) => meter.id));
    if (selectedId && !ids.has(selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
      setSettingsOpen(false);
    } else if (!selectedId && filtered[0]) {
      setSelectedId(filtered[0].id);
    }

    // Restore viewport or auto-fit if first time
    if (savedState?.viewport) {
      const vp = savedState.viewport;
      const frame = requestAnimationFrame(() => {
        setViewport({ x: vp.x, y: vp.y, zoom: vp.zoom });
      });
      return () => cancelAnimationFrame(frame);
    } else {
      const frame = requestAnimationFrame(() => fitView({ padding: 0.28, duration: 200 }));
      return () => cancelAnimationFrame(frame);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meters, energy, displayOverrides, setNodes, setEdges, fitView, setViewport]);

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

  // Reset layout back to default tree calculation
  const handleResetLayout = useCallback(() => {
    clearDiagramState(projectId, energy);
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
    fitView({ padding: 0.28, duration: 250 });
    setSavedNotice(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSavedNotice(false), 2000);
  }, [projectId, energy, meters, displayOverrides, selectedId, setNodes, setEdges, fitView]);

  const configHref = `/du-an/${projectId}/cau-hinh`;

  return (
    <DiagramActionsContext.Provider value={diagramActions}>
      <div className="flex h-full min-h-0 bg-white font-sans">
        {/* Left Sidebar: Points List */}
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-slate-200/80 bg-slate-50/70">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-200/60 bg-white">
            <div>
              <h2 className="text-xs font-bold tracking-wider uppercase text-slate-700">
                Danh sách điểm đo
              </h2>
              <span className="text-[11px] text-slate-400">
                {listedPoints.length} điểm loại {energy}
              </span>
            </div>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 transition-colors"
              aria-label="Cài đặt điểm đo"
              disabled={!selectedNode}
              onClick={() => selectedNode && setSettingsOpen(true)}
              title="Tùy chỉnh biểu tượng hiển thị"
            >
              <GearIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1">
            {listedPoints.length === 0 ? (
              <li className="px-3 py-8 text-center text-xs text-slate-400">
                Chưa có điểm đo nào cho loại {energy}.
              </li>
            ) : (
              listedPoints.map((point, index) => {
                const active = selectedId === point.id;
                return (
                  <li key={point.id}>
                    <button
                      type="button"
                      onClick={() => selectPoint(point.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-colors ${
                        active
                          ? "bg-slate-900 font-semibold text-white shadow-xs"
                          : "text-slate-700 hover:bg-slate-200/60"
                      }`}
                    >
                      <span className="min-w-0 truncate pr-2">
                        <span className="block truncate font-medium">
                          {index + 1}. {point.name}
                        </span>
                        <span
                          className={`block font-mono text-[10px] ${
                            active ? "text-slate-300" : "text-slate-400"
                          }`}
                        >
                          {point.code}
                          {!point.deviceId ? " • Chưa gán TB" : ""}
                        </span>
                      </span>
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          point.status === "warning"
                            ? "bg-amber-500 ring-2 ring-amber-200"
                            : point.status === "normal"
                              ? "bg-emerald-500"
                              : "bg-slate-300"
                        }`}
                      />
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        {/* Center: SCADA Canvas */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Top Canvas Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 px-6 py-3 bg-white">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">Sơ đồ Phân phối Năng lượng</h1>
                <p className="text-[11px] text-slate-400">
                  Kéo thả node để sắp xếp vị trí • Vị trí được tự động lưu vĩnh viễn
                </p>
              </div>

              {/* Energy Utility Selector */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-1">
                {energyFilters.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setEnergy(item)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                      energy === item
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={configHref}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                Cấu hình điểm đo
              </Link>
            </div>
          </div>

          {/* React Flow Area */}
          <div ref={wrapperRef} className="relative flex min-h-0 flex-1">
            <div className="relative min-h-0 min-w-0 flex-1">
              <ReactFlow
                className="diagram-flow bg-[#f8fafc]"
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
                // Automatically save dragged positions on mouse release
                onNodeDragStop={(_, node, draggedNodes) => {
                  const patches: Record<string, { x: number; y: number }> = {};
                  const list = draggedNodes && draggedNodes.length > 0 ? draggedNodes : [node];
                  for (const n of list) {
                    patches[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y) };
                  }
                  saveDiagramPositions(projectId, energy, patches);
                  setSavedNotice(true);
                  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                  saveTimerRef.current = setTimeout(() => setSavedNotice(false), 2000);
                }}
                // Automatically save viewport pan/zoom on canvas move
                onMoveEnd={(_, viewport) => {
                  saveDiagramViewport(projectId, energy, viewport);
                }}
                nodesConnectable={false}
                edgesFocusable={false}
                elementsSelectable
                nodesDraggable
                minZoom={0.3}
                maxZoom={2.0}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={24} size={1} color="#cbd5e1" />

                {/* Status Notice on drag/save */}
                {savedNotice && (
                  <Panel position="top-right" className="m-3">
                    <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md animate-fadeIn">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Đã lưu vị trí sơ đồ tự động</span>
                    </div>
                  </Panel>
                )}

                {/* Floating Info Guide */}
                <Panel
                  position="top-left"
                  className="m-3 max-w-[280px] rounded-xl border border-slate-200/80 bg-white/95 p-3 text-[11px] leading-relaxed text-slate-500 shadow-xs backdrop-blur-sm"
                >
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Bố cục tự do & Tự động lưu
                  </p>
                  <p className="mt-1 text-slate-600">
                    Bạn có thể kéo thả bất kỳ điểm đo nào vào vị trí mong muốn. Hệ thống sẽ tự động lưu vị trí và giữ nguyên khi chuyển trang hoặc tắt trình duyệt.
                  </p>
                </Panel>

                {/* Floating Controls */}
                <CanvasControls
                  onFit={() => fitView({ padding: 0.28, duration: 220 })}
                  onResetLayout={handleResetLayout}
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
                  <div className="rounded-2xl border border-slate-200 bg-white/95 px-6 py-5 text-center shadow-xs">
                    <CloudIcon className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-xs font-medium text-slate-500">
                      Chưa có điểm đo nào cho loại {energy}.
                    </p>
                    <Link
                      href={configHref}
                      className="mt-3 inline-block rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white pointer-events-auto hover:bg-emerald-700"
                    >
                      Thêm điểm đo ngay
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Right Panel: Display Customization */}
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

// ---------------- Settings Panel ----------------

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
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-slate-200 bg-white font-sans shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Tùy chỉnh Điểm đo</h2>
          <p className="text-[11px] text-slate-400">Thay đổi icon và tên hiển thị sơ đồ</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Đóng cài đặt"
        >
          ×
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 text-xs">
        <SettingsField label="TÊN HIỂN THỊ">
          <input
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500"
          />
        </SettingsField>

        <SettingsField label="BIỂU TƯỢNG HỆ THỐNG">
          <div className="grid grid-cols-4 gap-2">
            {ICON_OPTIONS.map((option) => {
              const active = data.icon === option.id && !data.iconImage;
              return (
                <button
                  key={option.id}
                  type="button"
                  title={option.label}
                  onClick={() => onChange({ icon: option.id, iconImage: undefined })}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-1.5 py-2 text-[10px] transition-colors ${
                    active
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-700 font-semibold"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-xs">
                    <NodeGlyph type={option.id} className="h-4 w-4" />
                  </span>
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </SettingsField>

        <SettingsField label="ẢNH MINH HỌA TÙY CHỈNH">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center hover:border-emerald-500 hover:bg-emerald-50/30 transition-colors">
            {data.iconImage ? (
              <img
                src={data.iconImage}
                alt="Biểu tượng tùy chỉnh"
                className="mb-2 h-14 w-14 rounded-xl object-cover shadow-xs"
              />
            ) : (
              <ImageIcon className="mb-2 h-6 w-6 text-slate-400" />
            )}
            <span className="text-xs font-medium text-slate-600">
              {data.iconImage ? "Chọn ảnh khác" : "Tải ảnh thiết bị lên"}
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
              className="mt-2 text-xs font-medium text-rose-500 hover:underline"
            >
              Xóa ảnh, dùng icon mặc định
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
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

// ---------------- Canvas Controls ----------------

function CanvasControls({
  onFit,
  onResetLayout,
  onFullscreen,
}: {
  onFit: () => void;
  onResetLayout: () => void;
  onFullscreen: () => void;
}) {
  const { zoomIn, zoomOut } = useReactFlow();

  return (
    <Panel position="bottom-right" className="m-4 flex flex-col gap-2 font-sans">
      <ControlButton label="Phóng to (+)" onClick={() => zoomIn({ duration: 160 })}>
        +
      </ControlButton>
      <ControlButton label="Thu nhỏ (-)" onClick={() => zoomOut({ duration: 160 })}>
        −
      </ControlButton>
      <ControlButton label="Vừa khung hình" onClick={onFit}>
        <FitIcon className="h-4 w-4" />
      </ControlButton>
      <ControlButton label="Đặt lại vị trí mặc định" onClick={onResetLayout}>
        <ResetIcon className="h-4 w-4" />
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
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-base text-slate-600 shadow-md hover:bg-slate-50 hover:text-slate-900 transition-colors"
    >
      {children}
    </button>
  );
}

// ---------------- SVG Icons ----------------

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function FitIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M20 15v5h-5" />
    </svg>
  );
}

function ResetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 5h5v5M10 19H5v-5M19 9l-6 6M5 15l6-6" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

function CloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  );
}
