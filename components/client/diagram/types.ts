import type { Edge, Node } from "@xyflow/react";

export type MeterStatus = "normal" | "warning" | "offline";
export type MeterIcon =
  | "plant"
  | "cabinet"
  | "fan"
  | "meter"
  | "pump"
  | "valve"
  | "solar"
  | "boiler";
export type EnergyKind = "Điện" | "Nhiệt" | "Khí nén" | "Nước";

export type MeterMetric = {
  label: string;
  value: string;
};

export type MeterNodeData = {
  title: string;
  subtitle?: string;
  status: MeterStatus;
  statusLabel?: string;
  icon: MeterIcon;
  iconImage?: string;
  metrics: MeterMetric[];
  energy: EnergyKind;
  listed?: boolean;
};

export type MeterFlowNode = Node<MeterNodeData, "meter">;
export type JunctionFlowNode = Node<Record<string, never>, "junction">;
export type DiagramNode = MeterFlowNode | JunctionFlowNode;
export type DiagramEdge = Edge;
