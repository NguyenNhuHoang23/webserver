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
export type EnergyKind = string;

export type MeterMetric = {
  key?: string;
  label: string;
  value: string;
};

export type DiagramNodeDisplay = {
  title?: string;
  icon?: MeterIcon;
  metricKeys?: string[];
};

export type MeterNodeData = {
  title: string;
  subtitle?: string;
  status: MeterStatus;
  statusLabel?: string;
  icon: MeterIcon;
  iconImage?: string;
  metrics: MeterMetric[];
  metricKeys: string[];
  sampleAt?: string;
  energy: EnergyKind;
  listed?: boolean;
};

export type MeterFlowNode = Node<MeterNodeData, "meter">;
export type JunctionFlowNode = Node<Record<string, never>, "junction">;
export type DiagramNode = MeterFlowNode | JunctionFlowNode;
export type DiagramEdge = Edge;
