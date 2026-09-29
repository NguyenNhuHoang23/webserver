"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  DISPOSITION_LABEL,
  INTERNET_LABEL,
  METER_TYPE_LABEL,
  alarmName,
  gatewayErrorText,
  replayLabel,
} from "@/lib/gateway-protocol";

type GatewayDeviceView = {
  gatewayId: string;
  protocolVersion: string | null;
  internet: string | null;
  temperature: string | null;
  humidity: string | null;
  packetNumber: string | null;
  meterType: string | null;
  meterModel: string | null;
  meterId: string | null;
  lastReadingTime: string | null;
  lastIsReplay: boolean | null;
  lastError: number | null;
  lastValues: Record<string, unknown> | null;
  lastDisposition: string | null;
  lastSeenAt: string | null;
  wifi: string | null;
  passWifi: string | null;
  timeUpdate: number;
};

type GatewayPacketView = {
  id: number;
  receivedAt: string;
  disposition: string;
  protocolVersion: string;
  internet: string;
  packetNumber: string;
  gatewayId: string;
  gatewayTemperature: string | null;
  gatewayHumidity: string | null;
  meterType: string;
  meterModel: string;
  meterId: string;
  readingTime: string;
  isReplay: boolean;
  error: number;
  values: Record<string, unknown>;
  dateTimeAlarm: string | null;
  idAlarm: number | null;
  valueAlarm: number | null;
  checksum: string;
  rawText: string;
};

type GatewayAlarmView = {
  id: number;
  source: "gateway" | "threshold";
  gatewayId: string;
  meterModel: string | null;
  meterId: string | null;
  occurredAt: string | null;
  alarmCode: number | null;
  alarmName: string | null;
  alarmValue: number | null;
  parameterName: string | null;
  parameterValue: number | null;
  minValue: number | null;
  maxValue: number | null;
  packetId: number | null;
  createdAt: string;
};

type GatewayLogView = {
  id: number;
  receivedAt: string;
  level: string;
  reason: string;
  gatewayId: string | null;
  meterModel: string | null;
  meterId: string | null;
  readingTime: string | null;
  packetNumber: string | null;
  rawText: string | null;
};

type GatewayThresholdView = {
  id: number;
  gatewayId: string;
  meterModel: string;
  meterId: string;
  parameterName: string;
  minValue: number | null;
  maxValue: number | null;
};

type GatewayConsoleData = {
  serverTime: string;
  gateways: GatewayDeviceView[];
  stats: {
    total: number;
    wifi: number;
    sim: number;
    realtime: number;
    replay: number;
    accepted: number;
    ignored: number;
  };
  packets: GatewayPacketView[];
  packetCount: number;
  alarms: GatewayAlarmView[];
  alarmCount: number;
  logs: GatewayLogView[];
  logCount: number;
  thresholds: GatewayThresholdView[];
  parameters: string[];
};

type LoadState = {
  data: GatewayConsoleData | null;
  error: string;
  loading: boolean;
};

export function GatewayConsole() {
  const [from, setFrom] = useState(() => localInput(new Date(Date.now() - 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(() => localInput(new Date()));
  const [gatewayFilter, setGatewayFilter] = useState("");
  const [state, setState] = useState<LoadState>({ data: null, error: "", loading: true });
  const [selectedId, setSelectedId] = useState("");
  const [picked, setPicked] = useState(false);
  const [draftId, setDraftId] = useState("");
  const [wifi, setWifi] = useState("");
  const [passWifi, setPassWifi] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [timeUpdate, setTimeUpdate] = useState("30");
  const [configMessage, setConfigMessage] = useState("");
  const [configError, setConfigError] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [parameterName, setParameterName] = useState("");
  const [meterModel, setMeterModel] = useState("");
  const [meterId, setMeterId] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [thresholdMessage, setThresholdMessage] = useState("");
  const [thresholdError, setThresholdError] = useState("");
  const [thresholdToDelete, setThresholdToDelete] = useState<GatewayThresholdView | null>(null);

  async function load(next?: { from?: string; to?: string; gatewayId?: string }) {
    const fromValue = next?.from ?? from;
    const toValue = next?.to ?? to;
    const gatewayId = next?.gatewayId ?? gatewayFilter;
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const params = new URLSearchParams();
      const fromDate = new Date(fromValue);
      const toDate = new Date(toValue);
      if (!Number.isNaN(fromDate.getTime())) params.set("from", fromDate.toISOString());
      if (!Number.isNaN(toDate.getTime())) {
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
    setDraftId(device.gatewayId);
    setWifi(device.wifi ?? "");
    setPassWifi(device.passWifi ?? "");
    setTimeUpdate(String(device.timeUpdate));
    setMeterModel(device.meterModel ?? "");
    setMeterId(device.meterId ?? "");
    setPicked(true);
  }, [picked, state.data]);

  const selected = useMemo(
    () => state.data?.gateways.find((item) => item.gatewayId === selectedId) ?? null,
    [selectedId, state.data],
  );

  function chooseGateway(device: GatewayDeviceView) {
    setSelectedId(device.gatewayId);
    setDraftId(device.gatewayId);
    setWifi(device.wifi ?? "");
    setPassWifi(device.passWifi ?? "");
    setTimeUpdate(String(device.timeUpdate));
    setMeterModel(device.meterModel ?? "");
    setMeterId(device.meterId ?? "");
    setPicked(true);
    setConfigMessage("");
    setConfigError("");
  }

  async function saveConfig() {
    setSavingConfig(true);
    setConfigMessage("");
    setConfigError("");
    try {
      await postConsole({
        action: "config",
        gatewayId: draftId.trim(),
        wifi,
        passWifi,
        timeUpdate: Number(timeUpdate),
      });
      setSelectedId(draftId.trim());
      setPicked(true);
      setConfigMessage("Đã lưu. Bản ACK sau của gateway này sẽ mang Wifi, PassWifi và TimeUpdate vừa cài.");
      await load();
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : "Không lưu được cấu hình.");
    } finally {
      setSavingConfig(false);
    }
  }

  async function saveThreshold() {
    setThresholdMessage("");
    setThresholdError("");
    try {
      await postConsole({
        action: "threshold",
        gatewayId: draftId.trim(),
        meterModel,
        meterId,
        parameterName,
        minValue,
        maxValue,
      });
      setThresholdMessage("Đã lưu ngưỡng Min/Max. Bản tin hợp lệ tiếp theo sẽ đối chiếu tham số này.");
      setParameterName("");
      await load();
    } catch (error) {
      setThresholdError(error instanceof Error ? error.message : "Không lưu được ngưỡng.");
    }
  }

  async function confirmDeleteThreshold() {
    if (!thresholdToDelete) return;
    const id = thresholdToDelete.id;
    setThresholdToDelete(null);
    setThresholdError("");
    try {
      await postConsole({ action: "delete-threshold", id });
      await load();
    } catch (error) {
      setThresholdError(error instanceof Error ? error.message : "Không xóa được ngưỡng.");
    }
  }

  const data = state.data;
  const gatewayAlarms = data?.alarms.filter((item) => item.source === "gateway") ?? [];
  const thresholdAlarms = data?.alarms.filter((item) => item.source === "threshold") ?? [];

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8 font-sans">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Gateway Server 1.0</h1>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            POST /api/gateway
          </span>
        </div>
        <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-500">
          Gateway bắn JSON đầy đủ hoặc dạng viết tắt (PV, IT, PN, GID, GT, GH, MT, MM, MID, TIM, RE, ER, VAL, CRC).
          Server lưu nguyên văn bản tin, toàn bộ values kể cả Null, rồi trả ACK kèm SeverTime, TimeUpdate, Wifi và PassWifi.
          Checksum là CRC-16/MODBUS (4 ký tự hex) hoặc CRC-32 (8 ký tự hex) của JSON.stringify sau khi bỏ trường checksum.
        </p>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard title="Server = 1" text="Đã lưu bản tin." />
        <InfoCard title="Server = 2" text="Lỗi checksum. Không dùng số liệu." />
        <InfoCard title="Server = 3" text="Lỗi format JSON hoặc thiếu trường." />
        <InfoCard title="Server = 4" text="Bỏ qua: trùng readingTime, lệch giờ quá 20 giây, hoặc Error khác 0. Vẫn trả giờ server để gateway chỉnh đồng hồ." />
      </section>

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
              {data?.gateways.map((item) => (
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
            Xem thống kê
          </button>
        </div>
        {data && (
          <p className="mt-3 text-[11px] text-slate-400">
            Giờ server lúc tải: {data.serverTime}. Thống kê đếm mọi bản tin đúng format trong khoảng này, gồm cả bản bị bỏ qua.
          </p>
        )}
      </section>

      {state.loading && <p className="mb-4 text-xs text-slate-500">Đang tải dữ liệu gateway...</p>}
      {state.error && <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{state.error}</p>}

      {data && (
        <>
          <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Tổng bản tin" value={data.stats.total} />
            <StatCard label="Bắn qua Wifi" value={data.stats.wifi} />
            <StatCard label="Bắn qua SIM" value={data.stats.sim} />
            <StatCard label="Realtime (fail / F)" value={data.stats.realtime} />
            <StatCard label="Phát lại do mất mạng (true / T)" value={data.stats.replay} />
            <StatCard label="Đã lưu" value={data.stats.accepted} />
            <StatCard label="Bỏ qua và log" value={data.stats.ignored} />
            <StatCard label="Cảnh báo trong khoảng" value={data.alarmCount} />
          </section>

          <section className="mb-6">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Gateway và mạng gần nhất</h2>
            {data.gateways.length === 0 ? (
              <Empty text="Chưa có gateway nào. Có thể cài Wifi và chu kỳ gửi trước khi gateway bắn bản tin đầu tiên." />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {data.gateways.map((device) => (
                  <button
                    key={device.gatewayId}
                    type="button"
                    onClick={() => chooseGateway(device)}
                    className={`rounded-2xl border p-4 text-left shadow-sm transition-colors ${
                      selectedId === device.gatewayId
                        ? "border-emerald-400 bg-emerald-50/50"
                        : "border-slate-200/80 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">GID</p>
                        <p className="break-all text-sm font-bold text-slate-900">{device.gatewayId}</p>
                      </div>
                      <InternetBadge internet={device.internet} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <Field label="protocolVersion" value={device.protocolVersion} />
                      <Field label="Packetnumber" value={device.packetNumber} />
                      <Field label="gatewayTemperature" value={device.temperature} />
                      <Field label="gatewayHumidity" value={device.humidity} />
                      <Field label="meterType" value={meterTypeText(device.meterType)} />
                      <Field label="meterModel" value={device.meterModel} />
                      <Field label="meterId" value={device.meterId} />
                      <Field label="Nhận lúc" value={formatStamp(device.lastSeenAt)} />
                      <Field label="readingTime đã lưu" value={device.lastReadingTime} />
                      <Field
                        label="isReplay đã lưu"
                        value={device.lastIsReplay == null ? null : replayLabel(device.lastIsReplay)}
                      />
                      <Field
                        label="Error gần nhất"
                        value={device.lastError == null ? null : `${device.lastError} - ${gatewayErrorText(device.lastError)}`}
                      />
                      <Field label="Trạng thái bản tin" value={device.lastDisposition ? DISPOSITION_LABEL[device.lastDisposition] ?? device.lastDisposition : null} />
                      <Field label="TimeUpdate" value={`${device.timeUpdate} giây`} />
                      <Field label="Wifi đã cài" value={device.wifi} />
                    </dl>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Cài đặt từ xa cho gateway</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Tên Wifi để trống sẽ trả Null. TimeUpdate mặc định 30 giây nếu chưa cài. Packetnumber chỉ được echo trong ACK, không dùng để kết luận lỗi.
              </p>
              <div className="mt-4 grid gap-3">
                <TextField label="gatewayId" value={draftId} onChange={setDraftId} />
                <TextField label="Wifi" value={wifi} onChange={setWifi} placeholder="Null nếu để trống" />
                <label className="text-xs font-medium text-slate-600">
                  PassWifi
                  <input
                    type={showPass ? "text" : "password"}
                    value={passWifi}
                    onChange={(event) => setPassWifi(event.target.value)}
                    className="mt-1 block h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <input type="checkbox" checked={showPass} onChange={(event) => setShowPass(event.target.checked)} />
                  Hiện mật khẩu
                </label>
                <TextField label="TimeUpdate (giây)" value={timeUpdate} onChange={setTimeUpdate} />
                <button
                  type="button"
                  onClick={() => void saveConfig()}
                  disabled={savingConfig}
                  className="h-10 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {savingConfig ? "Đang lưu..." : "Lưu cấu hình gateway"}
                </button>
                {configMessage && <p className="text-xs text-emerald-700">{configMessage}</p>}
                {configError && <p className="text-xs text-rose-700">{configError}</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Values gần nhất đã lưu</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Chỉ bản tin được chấp nhận mới cập nhật khung này. Tham số Null vẫn được giữ. Trường gateway không gửi sẽ không xuất hiện.
              </p>
              <div className="mt-4">
                {selected ? <ValueList values={selected.lastValues} /> : <Empty text="Chọn một gateway để xem values." />}
              </div>
            </div>
          </section>

          <section className="mb-6">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">Bản tin gateway</h2>
              <p className="text-[11px] text-slate-400">
                Đang hiện {data.packets.length} / {data.packetCount} bản tin. Mỗi bản giữ đủ trường và raw JSON.
              </p>
            </div>
            {data.packets.length === 0 ? (
              <Empty text="Không có bản tin trong khoảng thời gian này." />
            ) : (
              <div className="space-y-3">
                {data.packets.map((packet) => (
                  <PacketCard key={packet.id} packet={packet} />
                ))}
              </div>
            )}
          </section>

          <section className="mb-6 grid gap-4 xl:grid-cols-2">
            <AlarmColumn
              title="Cảnh báo loại 1 - do gateway bắn"
              hint="DateTimeAlarm, IDAlarm, ValueAlarm. Mã 1 và 3 là quá áp, mã 2 là quá dòng."
              empty="Chưa có cảnh báo từ gateway trong khoảng này."
              alarms={gatewayAlarms}
              kind="gateway"
            />
            <AlarmColumn
              title="Cảnh báo loại 2 - Min/Max trên web"
              hint="So giá trị số trong values với ngưỡng đã cài. Bằng Min hoặc Max thì không cảnh báo."
              empty="Chưa có giá trị nào vượt Min/Max trong khoảng này."
              alarms={thresholdAlarms}
              kind="threshold"
            />
          </section>

          <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Ngưỡng Min/Max</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Để trống gateway, model hoặc meterId nếu muốn áp dụng rộng hơn. Ngưỡng cụ thể hơn được ưu tiên khi cùng một tham số.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <TextField label="gatewayId" value={draftId} onChange={setDraftId} placeholder="Trống = mọi gateway" />
              <TextField label="meterModel" value={meterModel} onChange={setMeterModel} placeholder="Trống = mọi model" />
              <TextField label="meterId" value={meterId} onChange={setMeterId} placeholder="Trống = mọi đồng hồ" />
              <label className="text-xs font-medium text-slate-600">
                Tham số trong values
                <input
                  list="gateway-parameters"
                  value={parameterName}
                  onChange={(event) => setParameterName(event.target.value)}
                  className="mt-1 block h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-500"
                />
                <datalist id="gateway-parameters">
                  {data.parameters.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
              <TextField label="Min" value={minValue} onChange={setMinValue} />
              <TextField label="Max" value={maxValue} onChange={setMaxValue} />
            </div>
            <button
              type="button"
              onClick={() => void saveThreshold()}
              className="mt-3 h-10 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Lưu ngưỡng
            </button>
            {thresholdMessage && <p className="mt-2 text-xs text-emerald-700">{thresholdMessage}</p>}
            {thresholdError && <p className="mt-2 text-xs text-rose-700">{thresholdError}</p>}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-2 py-2">gatewayId</th>
                    <th className="px-2 py-2">meterModel</th>
                    <th className="px-2 py-2">meterId</th>
                    <th className="px-2 py-2">Tham số</th>
                    <th className="px-2 py-2">Min</th>
                    <th className="px-2 py-2">Max</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.thresholds.map((item) => (
                    <tr key={item.id}>
                      <td className="px-2 py-2 break-all">{item.gatewayId || "Mọi gateway"}</td>
                      <td className="px-2 py-2 break-all">{item.meterModel || "Mọi model"}</td>
                      <td className="px-2 py-2 break-all">{item.meterId || "Mọi đồng hồ"}</td>
                      <td className="px-2 py-2 break-all font-medium">{item.parameterName}</td>
                      <td className="px-2 py-2">{item.minValue ?? "Null"}</td>
                      <td className="px-2 py-2">{item.maxValue ?? "Null"}</td>
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setThresholdToDelete(item)}
                          className="text-rose-600 hover:underline"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                  {data.thresholds.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-2 py-4 text-slate-400">
                        Chưa có ngưỡng.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">Log bỏ qua / cảnh báo</h2>
              <p className="text-[11px] text-slate-400">
                {data.logs.length} / {data.logCount} dòng
              </p>
            </div>
            {data.logs.length === 0 ? (
              <Empty text="Không có log trong khoảng thời gian này." />
            ) : (
              <div className="space-y-2">
                {data.logs.map((item) => (
                  <LogCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        open={thresholdToDelete != null}
        title="Xóa ngưỡng Min/Max"
        description={
          thresholdToDelete
            ? `Xóa ngưỡng ${thresholdToDelete.parameterName} của gateway ${thresholdToDelete.gatewayId || "mọi gateway"}?`
            : ""
        }
        onCancel={() => setThresholdToDelete(null)}
        onConfirm={() => void confirmDeleteThreshold()}
      />
    </div>
  );
}

function PacketCard({ packet }: { packet: GatewayPacketView }) {
  const rows: Array<[string, string | null]> = [
    ["Thời điểm server nhận", formatStamp(packet.receivedAt)],
    ["disposition", DISPOSITION_LABEL[packet.disposition] ?? packet.disposition],
    ["protocolVersion", packet.protocolVersion],
    ["Internet", `${packet.internet} - ${INTERNET_LABEL[packet.internet] ?? packet.internet}`],
    ["Packetnumber", packet.packetNumber],
    ["gatewayId", packet.gatewayId],
    ["gatewayTemperature", packet.gatewayTemperature],
    ["gatewayHumidity", packet.gatewayHumidity],
    ["meterType", meterTypeText(packet.meterType)],
    ["meterModel", packet.meterModel],
    ["meterId", packet.meterId],
    ["readingTime", packet.readingTime],
    ["isReplay", replayLabel(packet.isReplay)],
    ["Error", `${packet.error} - ${gatewayErrorText(packet.error)}`],
    ["DateTimeAlarm", packet.dateTimeAlarm],
    ["IDAlarm", packet.idAlarm == null ? null : `${packet.idAlarm} - ${alarmName(packet.idAlarm)}`],
    ["ValueAlarm", packet.valueAlarm == null ? null : String(packet.valueAlarm)],
    ["checksum", packet.checksum],
  ];

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">#{packet.id}</span>
        <span className="text-xs font-semibold text-slate-700">{DISPOSITION_LABEL[packet.disposition] ?? packet.disposition}</span>
        <InternetBadge internet={packet.internet} />
        <span className="text-[11px] text-slate-400">{replayLabel(packet.isReplay)}</span>
      </div>
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <Field key={label} label={label} value={value} />
        ))}
      </dl>
      <div className="mt-3">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">values</p>
        <ValueList values={packet.values} />
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-emerald-700">Raw JSON gateway đã bắn</summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">
          {packet.rawText}
        </pre>
      </details>
    </article>
  );
}

function AlarmColumn({
  title,
  hint,
  empty,
  alarms,
  kind,
}: {
  title: string;
  hint: string;
  empty: string;
  alarms: GatewayAlarmView[];
  kind: "gateway" | "threshold";
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
      <div className="mt-3 space-y-2">
        {alarms.length === 0 && <Empty text={empty} />}
        {alarms.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
            <p className="font-semibold text-slate-800">
              {kind === "gateway"
                ? item.alarmName || "Cảnh báo gateway"
                : `${item.alarmName}: ${item.parameterName}`}
            </p>
            <dl className="mt-2 grid gap-1">
              <Field label="gatewayId" value={item.gatewayId} />
              <Field label="meterModel" value={item.meterModel} />
              <Field label="meterId" value={item.meterId} />
              <Field label="occurredAt" value={item.occurredAt} />
              <Field label="createdAt" value={formatStamp(item.createdAt)} />
              {kind === "gateway" ? (
                <>
                  <Field label="IDAlarm" value={item.alarmCode == null ? null : String(item.alarmCode)} />
                  <Field label="ValueAlarm" value={item.alarmValue == null ? null : String(item.alarmValue)} />
                </>
              ) : (
                <>
                  <Field label="Giá trị" value={item.parameterValue == null ? null : String(item.parameterValue)} />
                  <Field label="Min" value={item.minValue == null ? null : String(item.minValue)} />
                  <Field label="Max" value={item.maxValue == null ? null : String(item.maxValue)} />
                </>
              )}
              <Field label="packetId" value={item.packetId == null ? null : String(item.packetId)} />
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

function LogCard({ item }: { item: GatewayLogView }) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 text-xs shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            item.level === "warning" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
          }`}
        >
          {item.level}
        </span>
        <span className="text-slate-400">{formatStamp(item.receivedAt)}</span>
      </div>
      <p className="mt-2 font-medium text-slate-800">{item.reason}</p>
      <dl className="mt-2 grid gap-1 sm:grid-cols-2">
        <Field label="gatewayId" value={item.gatewayId} />
        <Field label="Packetnumber" value={item.packetNumber} />
        <Field label="meterModel" value={item.meterModel} />
        <Field label="meterId" value={item.meterId} />
        <Field label="readingTime" value={item.readingTime} />
      </dl>
      {item.rawText && (
        <details className="mt-2">
          <summary className="cursor-pointer font-medium text-emerald-700">Raw JSON</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">
            {item.rawText}
          </pre>
        </details>
      )}
    </article>
  );
}

function ValueList({ values }: { values: Record<string, unknown> | null }) {
  if (!values) return <p className="text-xs text-slate-400">Null</p>;
  const entries = Object.entries(values);
  if (!entries.length) return <p className="text-xs text-slate-400">Object rỗng</p>;
  return (
    <dl className="grid gap-1">
      {entries.map(([key, value]) => (
        <div key={key} className="grid grid-cols-[minmax(0,180px)_minmax(0,1fr)] gap-2 text-xs">
          <dt className="break-all font-medium text-slate-500">{key}</dt>
          <dd className="break-all whitespace-pre-wrap text-slate-800">{formatValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="break-all text-xs text-slate-800">{value == null || value === "" ? "Null" : value}</dd>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="text-xs font-medium text-slate-600">
      {label}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block h-10 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-800 outline-none focus:border-emerald-500"
      />
    </label>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">{text}</p>
    </div>
  );
}

function InternetBadge({ internet }: { internet: string | null }) {
  const label = internet ? INTERNET_LABEL[internet] ?? internet : "Chưa có";
  const wifi = internet === "W";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        wifi ? "bg-sky-100 text-sky-800" : internet === "S" ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-500"
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
  return `${value} - ${METER_TYPE_LABEL[value] ?? value}`;
}

function formatValue(value: unknown) {
  if (value == null) return "Null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function formatStamp(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleString("vi-VN")} (${value})`;
}

function localInput(date: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function postConsole(body: Record<string, unknown>) {
  const response = await fetch("/api/gateway/console", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(payload.error || "Không lưu được.");
}
