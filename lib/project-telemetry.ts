import { dbFetch } from "@/lib/db-client";

export type ProjectTelemetry = {
  projectId: string;
  /** Tổng công suất tác dụng (Papt) từ bản tin gateway mới nhất, kW. */
  loadKw: number;
  /** Tổng phát thải từ cấu hình GHG của dự án (tCO₂e). */
  co2Day: number;
  /** Số điểm đo trên sơ đồ / cấu hình. */
  meterCount: number;
  /** Số điểm đo còn nhận bản tin gần đây. */
  onlineCount: number;
  hasGatewayData: boolean;
};

export async function loadProjectsTelemetry(): Promise<Record<string, ProjectTelemetry>> {
  try {
    const rows = await dbFetch<ProjectTelemetry[]>("project-telemetry");
    const map: Record<string, ProjectTelemetry> = {};
    for (const row of rows) map[row.projectId] = row;
    return map;
  } catch {
    return {};
  }
}

export function emptyTelemetry(projectId: string): ProjectTelemetry {
  return {
    projectId,
    loadKw: 0,
    co2Day: 0,
    meterCount: 0,
    onlineCount: 0,
    hasGatewayData: false,
  };
}
