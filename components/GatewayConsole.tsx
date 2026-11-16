"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DISPOSITION_LABEL,
  INTERNET_LABEL,
  METER_TYPE_LABEL,
} from "@/lib/gateway-protocol";
import { formatStoredVietnam, vietnamInputToUtcIso, vietnamInputValue } from "@/lib/vietnam-time";

type GatewayDeviceView = {
  gatewayId: string;
  internet: string | null;
  temperature: string | null;
  humidity: string | null;
  meterType: string | null;
  meterModel: string | null;
  meterId: string | null;
  lastReadingTime: string | null;
  lastValues: Record<string, unknown> | null;
  lastDisposition: string | null;
  lastSeenAt: string | null;
  timeUpdate: number;
};

type GatewayPacketView = {
  id: number;
  receivedAt: string;
  disposition: string;
  internet: string;
  packetNumber: string;
  gatewayId: string;
  meterType: string;
  meterModel: string;
  meterId: string;
  readingTime: string;
  values: Record<string, unknown>;
};

type GatewayConsoleData = {
  gateways: GatewayDeviceView[];
  packets: GatewayPacketView[];
  packetCount: number;
};

type LoadState = {
  data: GatewayConsoleData | null;
  error: string;
  loading: boolean;
};

function isGatewayOnline(device: GatewayDeviceView) {
  if (!device.lastSeenAt) return false;
  const seen = Date.parse(device.lastSeenAt);
  if (!Number.isFinite(seen)) return false;
  const windowMs = Math.max(device.timeUpdate * 4, 180) * 1000;
  return Date.now() - seen <= windowMs;
}

export function GatewayConsole() {
  const [from, setFrom] = useState(() => localInput(new Date(Date.now() - 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(() => localInput(new Date()));
  const [gatewayFilter, setGatewayFilter] = useState("");
  const [state, setState] = useState<LoadState>({ data: null, error: "", loading: true });
  const [selectedId, setSelectedId] = useState("");
  const [picked, setPicked] = useState(false);

  async function load(next?: { from?: string; to?: string; gatewayId?: string }) {
    const fromValue = next?.from ?? from;
    const toValue = next?.to ?? to;
    const gatewayId = next?.gatewayId ?? gatewayFilter;
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const params = new URLSearchParams();
      const fromIso = vietnamInputToUtcIso(fromValue);
      const toIso = vietnamInputToUtcIso(toValue);
      if (fromIso) params.set("from", fromIso);
      if (toIso) {
        const toDate = new Date(toIso);
        toDate.setSeconds(59, 999);
        params.set("to", toDate.toISOString());
      }
      if (gatewayId) params.set("gatewayId", gatewayId);
      const response = await fetch(`/api/gateway/console?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as GatewayConsoleData & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể tải dữ liệu gateway.");
      setState({ data: payload, error: "", loading: false });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : "Không thể tải dữ liệu gateway.",
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const device = state.data?.gateways[0];
    if (picked || !device) return;
    setSelectedId(device.gatewayId);
    setPicked(true);
  }, [picked, state.data]);

  const selected = useMemo(
    () => state.data?.gateways.find((item) => item.gatewayId === selectedId) ?? null,
    [selectedId, state.data],
  );

  const packets = useMemo(() => {
    const rows = state.data?.packets ?? [];
    if (!selectedId) return rows;
    return rows.filter((item) => item.gatewayId === selectedId);
  }, [selectedId, state.data]);

  const onlineCount = state.data?.gateways.filter(isGatewayOnline).length ?? 0;
  const valueEntries = Object.entries(selected?.lastValues ?? {}).slice(0, 12);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 font-sans sm:p-6 lg:p-8">
      {/* Header + filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Gateway Server</h1>
          {state.data ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              <span className="text-emerald-700">{onlineCount}</span>/{state.data.gateways.length} online
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="datetime-local"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-emerald-500"
            aria-label="Từ"
          />
          <span className="text-xs text-slate-400">→</span>
          <input
            type="datetime-local"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-emerald-500"
            aria-label="Đến"
          />
          <select
            value={gatewayFilter}
            onChange={(event) => setGatewayFilter(event.target.value)}
            className="h-9 min-w-[140px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-emerald-500"
            aria-label="Lọc gateway"
          >
            <option value="">Tất cả gateway</option>
            {state.data?.gateways.map((item) => (
              <option key={item.gatewayId} value={item.gatewayId}>
                {item.gatewayId}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Làm mới
          </button>
        </div>
      </div>

      {state.loading ? <p className="text-xs text-slate-500">Đang tải…</p> : null}
      {state.error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{state.error}</p>
      ) : null}

      {state.data ? (
        <>
          {/* Master–detail */}
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <h2 className="text-sm font-semibold text-slate-800">Gateway</h2>
                <span className="text-[11px] text-slate-400">{state.data.gateways.length} thiết bị</span>
              </div>
              {state.data.gateways.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-slate-400">Chưa có gateway gửi dữ liệu.</p>
              ) : (
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                      <tr>
                        <th className="px-4 py-2">ID</th>
                        <th className="px-3 py-2">Đồng hồ</th>
                        <th className="px-3 py-2">Mạng</th>
                        <th className="px-3 py-2">Trạng thái</th>
                        <th className="px-4 py-2 text-right">Seen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {state.data.gateways.map((device) => {
                        const online = isGatewayOnline(device);
                        const active = selectedId === device.gatewayId;
                        return (
                          <tr
                            key={device.gatewayId}
                            onClick={() => {
                              setSelectedId(device.gatewayId);
                              setPicked(true);
                            }}
                            className={`cursor-pointer transition-colors ${
                              active ? "bg-emerald-50/70" : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="max-w-[160px] truncate px-4 py-2.5 font-semibold text-slate-800">
                              {device.gatewayId}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">
                              <span className="font-medium text-slate-800">{device.meterId || "—"}</span>
                              {device.meterModel ? (
                                <span className="ml-1 text-[10px] text-slate-400">{device.meterModel}</span>
                              ) : null}
                            </td>
                            <td className="px-3 py-2.5">
                              <NetDot internet={device.internet} />
                            </td>
                            <td className="px-3 py-2.5">
                              <OnlineDot online={online} />
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                              {shortStamp(device.lastSeenAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-slate-800">
                    {selected ? selected.gatewayId : "Chi tiết"}
                  </h2>
                  {selected ? (
                    <p className="truncate text-[11px] text-slate-400">
                      {[
                        selected.meterId,
                        selected.meterModel,
                        meterTypeText(selected.meterType),
                        selected.lastReadingTime ? `mốc ${selected.lastReadingTime}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
                {selected ? <OnlineDot online={isGatewayOnline(selected)} label /> : null}
              </div>

              {!selected ? (
                <p className="px-4 py-10 text-center text-xs text-slate-400">Chọn một gateway để xem số liệu.</p>
              ) : (
                <div className="space-y-3 p-4">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <MiniStat label="Nhiệt độ" value={selected.temperature} />
                    <MiniStat label="Độ ẩm" value={selected.humidity} />
                    <MiniStat
                      label="Mạng"
                      value={selected.internet ? INTERNET_LABEL[selected.internet] ?? selected.internet : "—"}
                    />
                    <MiniStat
                      label="Bản tin"
                      value={
                        selected.lastDisposition
                          ? DISPOSITION_LABEL[selected.lastDisposition] ?? selected.lastDisposition
                          : "—"
                      }
                    />
                  </div>
                  {valueEntries.length ? (
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {valueEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className="rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-1.5"
                        >
                          <p className="truncate text-[10px] font-medium text-slate-400">{key}</p>
                          <p className="truncate text-xs font-semibold tabular-nums text-slate-800">
                            {formatValue(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Chưa có thông số đo gần nhất.</p>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Packet history */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <h2 className="text-sm font-semibold text-slate-800">Bản tin gần đây</h2>
              <span className="text-[11px] text-slate-400">
                {packets.length}
                {state.data.packetCount > packets.length ? ` / ${state.data.packetCount}` : ""}
              </span>
            </div>
            {packets.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-400">Không có bản tin trong khoảng đã chọn.</p>
            ) : (
              <div className="max-h-[360px] overflow-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    <tr>
                      <th className="px-4 py-2">Nhận lúc</th>
                      <th className="px-3 py-2">Đồng hồ</th>
                      <th className="px-3 py-2">Mạng</th>
                      <th className="px-3 py-2">Trạng thái</th>
                      <th className="px-3 py-2">Mốc đo</th>
                      <th className="px-4 py-2">Số liệu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {packets.map((item) => (
                      <tr key={item.id} className="text-slate-700">
                        <td className="whitespace-nowrap px-4 py-2 tabular-nums text-slate-600">
                          {shortStamp(item.receivedAt)}
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-medium text-slate-800">{item.meterId || "—"}</span>
                          <span className="ml-1 text-[10px] text-slate-400">
                            {item.meterModel || meterTypeText(item.meterType) || ""}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <NetDot internet={item.internet} />
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {DISPOSITION_LABEL[item.disposition] ?? item.disposition}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                          {item.readingTime || "—"}
                        </td>
                        <td className="max-w-[280px] truncate px-4 py-2 text-slate-500">
                          {summarizeValues(item.values)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function OnlineDot({ online, label = false }: { online: boolean; label?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
        online ? "text-emerald-700" : "text-slate-400"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-slate-300"}`} />
      {label ? (online ? "Online" : "Offline") : online ? "Online" : "Offline"}
    </span>
  );
}

function NetDot({ internet }: { internet: string | null }) {
  const label = internet ? INTERNET_LABEL[internet] ?? internet : "—";
  return <span className="text-[11px] font-medium text-slate-600">{label}</span>;
}

function MiniStat({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2">
      <p className="text-[10px] font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-slate-800">
        {value == null || value === "" ? "—" : value}
      </p>
    </div>
  );
}

function meterTypeText(value: string | null) {
  if (!value) return null;
  return METER_TYPE_LABEL[value] ?? value;
}

function formatValue(value: unknown) {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function summarizeValues(values: Record<string, unknown>) {
  const entries = Object.entries(values ?? {}).slice(0, 3);
  if (!entries.length) return "—";
  return entries.map(([key, value]) => `${key}: ${formatValue(value)}`).join(" · ");
}

function shortStamp(value: string | null) {
  if (!value) return "—";
  const label = formatStoredVietnam(value) ?? value;
  // "16/11/2026 14:32:01" → bỏ giây nếu có
  return label.replace(/:(\d{2})$/, "");
}

function localInput(date: Date) {
  return vietnamInputValue(date);
}
