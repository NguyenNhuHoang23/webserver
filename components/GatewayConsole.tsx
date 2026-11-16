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

  return (
    <div className="mx-auto max-w-[1400px] p-4 font-sans sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Gateway Server</h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi kết nối gateway, thông số đo gần nhất và lịch sử bản tin.
          </p>
        </div>
        {state.data ? (
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs shadow-sm">
            <span className="font-semibold text-emerald-700">{onlineCount}</span>
            <span className="text-slate-500"> / {state.data.gateways.length} gateway đang kết nối</span>
          </div>
        ) : null}
      </div>

      <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="text-xs font-medium text-slate-600">
            Từ
            <input
              type="datetime-local"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-1 block h-10 rounded-xl border border-slate-200 px-3 text-xs text-slate-800 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Đến
            <input
              type="datetime-local"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="mt-1 block h-10 rounded-xl border border-slate-200 px-3 text-xs text-slate-800 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="min-w-0 flex-1 text-xs font-medium text-slate-600">
            Gateway
            <select
              value={gatewayFilter}
              onChange={(event) => setGatewayFilter(event.target.value)}
              className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-emerald-500"
            >
              <option value="">Tất cả gateway</option>
              {state.data?.gateways.map((item) => (
                <option key={item.gatewayId} value={item.gatewayId}>
                  {item.gatewayId}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="h-10 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Làm mới
          </button>
        </div>
      </section>

      {state.loading && <p className="mb-4 text-xs text-slate-500">Đang tải dữ liệu gateway...</p>}
      {state.error && <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{state.error}</p>}

      {state.data && (
        <>
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Danh sách Gateway & trạng thái kết nối</h2>
            {state.data.gateways.length === 0 ? (
              <Empty text="Chưa có gateway nào gửi dữ liệu." />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {state.data.gateways.map((device) => {
                  const online = isGatewayOnline(device);
                  const active = selectedId === device.gatewayId;
                  return (
                    <button
                      key={device.gatewayId}
                      type="button"
                      onClick={() => {
                        setSelectedId(device.gatewayId);
                        setPicked(true);
                      }}
                      className={`rounded-2xl border p-4 text-left shadow-sm transition-colors ${
                        active
                          ? "border-emerald-400 bg-emerald-50/50"
                          : "border-slate-200/80 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                            Gateway ID
                          </p>
                          <p className="break-all text-sm font-bold text-slate-900">{device.gatewayId}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusBadge online={online} />
                          <InternetBadge internet={device.internet} />
                        </div>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <Field label="Đồng hồ" value={device.meterId} />
                        <Field label="Model" value={device.meterModel} />
                        <Field label="Loại đo" value={meterTypeText(device.meterType)} />
                        <Field label="Cập nhật gần nhất" value={formatStamp(device.lastSeenAt)} />
                      </dl>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Thông số đo gần nhất</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selected
                    ? `Gateway ${selected.gatewayId} · mốc đo ${selected.lastReadingTime || "—"}`
                    : "Chọn một gateway để xem thông số."}
                </p>
              </div>
              {selected ? <StatusBadge online={isGatewayOnline(selected)} /> : null}
            </div>
            {selected ? (
              <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <dl className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs">
                  <Field label="Nhiệt độ gateway" value={selected.temperature} />
                  <Field label="Độ ẩm gateway" value={selected.humidity} />
                  <Field label="Mạng" value={selected.internet ? INTERNET_LABEL[selected.internet] ?? selected.internet : null} />
                  <Field
                    label="Trạng thái bản tin"
                    value={
                      selected.lastDisposition
                        ? DISPOSITION_LABEL[selected.lastDisposition] ?? selected.lastDisposition
                        : null
                    }
                  />
                </dl>
                <ValueList values={selected.lastValues} />
              </div>
            ) : (
              <Empty text="Chọn một gateway ở danh sách phía trên." />
            )}
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Lịch sử bản tin gần nhất</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedId ? `Lọc theo gateway ${selectedId}` : "Tất cả gateway trong khoảng đã chọn"}
                </p>
              </div>
              <p className="text-[11px] text-slate-400">
                {packets.length}
                {state.data.packetCount > packets.length ? ` / ${state.data.packetCount}` : ""} bản tin
              </p>
            </div>
            {packets.length === 0 ? (
              <Empty text="Chưa có bản tin trong khoảng thời gian này." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                      <th className="px-2 py-2">Nhận lúc</th>
                      <th className="px-2 py-2">Gateway</th>
                      <th className="px-2 py-2">Đồng hồ</th>
                      <th className="px-2 py-2">Mạng</th>
                      <th className="px-2 py-2">Trạng thái</th>
                      <th className="px-2 py-2">Mốc đo</th>
                      <th className="px-2 py-2">Thông số chính</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {packets.map((item) => (
                      <tr key={item.id} className="text-slate-700">
                        <td className="px-2 py-2.5 whitespace-nowrap">{formatStamp(item.receivedAt)}</td>
                        <td className="px-2 py-2.5 break-all font-medium">{item.gatewayId}</td>
                        <td className="px-2 py-2.5">
                          <p className="font-medium">{item.meterId || "—"}</p>
                          <p className="text-[11px] text-slate-400">{item.meterModel || meterTypeText(item.meterType)}</p>
                        </td>
                        <td className="px-2 py-2.5">
                          <InternetBadge internet={item.internet} />
                        </td>
                        <td className="px-2 py-2.5">
                          {DISPOSITION_LABEL[item.disposition] ?? item.disposition}
                        </td>
                        <td className="px-2 py-2.5 whitespace-nowrap">{item.readingTime || "—"}</td>
                        <td className="px-2 py-2.5 text-slate-600">{summarizeValues(item.values)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatusBadge({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        online ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-slate-400"}`} />
      {online ? "Đang kết nối" : "Mất kết nối"}
    </span>
  );
}

function ValueList({ values }: { values: Record<string, unknown> | null }) {
  if (!values) return <p className="text-xs text-slate-400">Chưa có thông số đo.</p>;
  const entries = Object.entries(values);
  if (!entries.length) return <p className="text-xs text-slate-400">Chưa có thông số đo.</p>;
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
          <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{key}</p>
          <p className="mt-0.5 break-all text-sm font-semibold text-slate-800">{formatValue(value)}</p>
        </div>
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">{label}</dt>
      <dd className="break-all text-xs text-slate-800">{value == null || value === "" ? "—" : value}</dd>
    </div>
  );
}

function InternetBadge({ internet }: { internet: string | null }) {
  const label = internet ? INTERNET_LABEL[internet] ?? internet : "Chưa có";
  const wifi = internet === "W";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        wifi
          ? "bg-sky-100 text-sky-800"
          : internet === "S"
            ? "bg-violet-100 text-violet-800"
            : "bg-slate-100 text-slate-500"
      }`}
    >
      {label}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-400">{text}</p>;
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

function formatStamp(value: string | null) {
  if (!value) return null;
  return formatStoredVietnam(value) ?? value;
}

function localInput(date: Date) {
  return vietnamInputValue(date);
}
