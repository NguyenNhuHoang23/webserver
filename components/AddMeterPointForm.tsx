"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  deviceSpec,
  INITIAL_DEVICES,
  hydrateDevices,
  loadDevices,
  type CatalogDevice,
} from "@/lib/devices";
import {
  loadClientMeters,
  hydrateClientMeters,
  saveClientMeters,
  isMeterDescendant,
  type ClientMeter,
} from "@/lib/client-meters";
import {
  hydrateMeterTypeDefs,
  inferMeterTypeIcon,
  loadMeterTypeDefs,
  type MeterTypeDef,
} from "@/lib/meter-types";

export function AddMeterPointForm({
  cancelHref = "/",
  projectId,
  configuredMeterTypes,
  initialMeter,
}: {
  cancelHref?: string;
  projectId?: string;
  configuredMeterTypes?: string[];
  initialMeter?: ClientMeter;
}) {
  const router = useRouter();
  const [energyTypes, setEnergyTypes] = useState<MeterTypeDef[]>(loadMeterTypeDefs);
  const [energy, setEnergy] = useState(
    initialMeter?.utility ?? (configuredMeterTypes ? configuredMeterTypes.find(Boolean) ?? "" : "Điện"),
  );
  const [parentId, setParentId] = useState(initialMeter?.parentId ?? "");
  const [query, setQuery] = useState("");
  const [devices, setDevices] = useState<CatalogDevice[]>(INITIAL_DEVICES);
  const [existingMeters, setExistingMeters] = useState<ClientMeter[]>([]);
  const [droppedDevice, setDroppedDevice] = useState<CatalogDevice | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(initialMeter?.deviceId ?? null);
  const [serialNumber, setSerialNumber] = useState(initialMeter?.serialNumber ?? "");
  const [pointId, setPointId] = useState(initialMeter?.code ?? "");
  const [pointName, setPointName] = useState(initialMeter?.name ?? "");
  const [formula, setFormula] = useState("");
  const [error, setError] = useState("");

  const configuredTypeNames = useMemo(
    () =>
      configuredMeterTypes === undefined
        ? undefined
        : Array.from(new Set(configuredMeterTypes.map((item) => item.trim()).filter(Boolean))),
    [configuredMeterTypes],
  );

  const selectableEnergyTypes = (() => {
    if (configuredTypeNames === undefined) return energyTypes;

    const catalog = new Map(energyTypes.map((item) => [item.name, item]));
    const names = [...configuredTypeNames];

    // Keep an existing point's old type visible while editing so saving the
    // form does not silently change data after that type is removed from the project.
    if (initialMeter?.utility && !names.includes(initialMeter.utility)) {
      names.push(initialMeter.utility);
    }

    return names.map(
      (name) =>
        catalog.get(name) ?? {
          name,
          description: "Loại điểm đo đã cấu hình cho dự án",
          icon: inferMeterTypeIcon(name),
          builtin: false,
        },
    );
  })();

  useEffect(() => {
    let active = true;
    void Promise.all([
      hydrateDevices(),
      hydrateMeterTypeDefs(),
      projectId ? hydrateClientMeters(projectId) : Promise.resolve([]),
    ]).then(([devices, energyTypes, meters]) => {
      if (!active) return;
      setDevices(devices);
      setEnergyTypes(energyTypes);
      if (initialMeter?.deviceId) {
        const device = devices.find((item) => item.id === initialMeter.deviceId) ?? null;
        setDroppedDevice(device);
        if (!initialMeter.serialNumber && device) setSerialNumber(device.sn);
      }
      if (projectId) setExistingMeters(meters);
    }).catch(() => {
      if (!active) return;
      setDevices(loadDevices());
      setEnergyTypes(loadMeterTypeDefs());
      if (projectId) setExistingMeters(loadClientMeters(projectId));
    });
    return () => {
      active = false;
    };
  }, [initialMeter, projectId]);

  const parentOptions = useMemo(
    () => existingMeters.filter((meter) =>
      meter.utility === energy &&
      meter.id !== initialMeter?.id &&
      (!initialMeter || !isMeterDescendant(existingMeters, initialMeter.id, meter.id)),
    ),
    [energy, existingMeters, initialMeter],
  );

  const compatibleDevices = useMemo(
    () =>
      configuredTypeNames === undefined
        ? devices
        : devices.filter((device) => {
            const deviceEnergy = utilityForDevice(device);
            return !deviceEnergy || configuredTypeNames.includes(deviceEnergy);
          }),
    [configuredTypeNames, devices],
  );

  const filteredDevices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return compatibleDevices;
    return compatibleDevices.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.brandModel.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.sn.toLowerCase().includes(q) ||
        (d.protocol ?? "").toLowerCase().includes(q),
    );
  }, [compatibleDevices, query]);

  function applyDevice(device: CatalogDevice) {
    const deviceEnergy = utilityForDevice(device);
    if (
      configuredTypeNames !== undefined &&
      deviceEnergy &&
      !configuredTypeNames.includes(deviceEnergy)
    ) {
      setError(`Thiết bị này thuộc loại ${deviceEnergy}, chưa được cấu hình cho dự án.`);
      return;
    }
    setError("");
    setDroppedDevice(device);
    setDeviceId(device.id);
    setSerialNumber(device.sn);
    if (deviceEnergy) {
      setEnergy(deviceEnergy);
      const parent = existingMeters.find((meter) => meter.id === parentId);
      if (parent && parent.utility !== deviceEnergy) setParentId("");
    }
    setPointName((current) => current || device.name);
    setPointId((current) => current || device.id.toUpperCase());
  }

  function clearDevice() {
    setDroppedDevice(null);
    setDeviceId(null);
  }

  function selectParent(nextParentId: string) {
    setParentId(nextParentId);
    if (!nextParentId) return;
    const parent = existingMeters.find((meter) => meter.id === nextParentId);
    if (parent) setEnergy(parent.utility);
  }

  function selectEnergy(nextEnergy: string) {
    setEnergy(nextEnergy);
    const parent = existingMeters.find((meter) => meter.id === parentId);
    if (parent && parent.utility !== nextEnergy) setParentId("");
  }

  async function handleSubmit() {
    const id = pointId.trim();
    const name = pointName.trim();
    if (!id || !name) {
      setError("Vui lòng nhập mã điểm đo và tên điểm đo.");
      return;
    }
    if (!energy) {
      setError("Dự án chưa cấu hình loại điểm đo. Vui lòng cấu hình trước khi thêm điểm đo.");
      return;
    }
    if (
      configuredTypeNames !== undefined &&
      !configuredTypeNames.includes(energy) &&
      energy !== initialMeter?.utility
    ) {
      setError("Loại điểm đo này chưa được cấu hình cho dự án.");
      return;
    }
    if (!projectId) {
      router.push(cancelHref);
      return;
    }

    try {
      const meters = await hydrateClientMeters(projectId);
      const next: ClientMeter = {
        id: initialMeter?.id ?? `m-${Date.now()}`,
        name,
        code: id,
        type: droppedDevice?.brandModel || droppedDevice?.type || initialMeter?.type || "Chưa gán thiết bị",
        parentId: parentId || null,
        utility: energy,
        deviceId,
        serialNumber: serialNumber.trim() || null,
      };
      const updated = initialMeter
        ? meters.map((meter) => (meter.id === initialMeter.id ? next : meter))
        : [...meters, next];
      if (initialMeter && !meters.some((meter) => meter.id === initialMeter.id)) {
        throw new Error("Không tìm thấy điểm đo cần cập nhật trong dự án.");
      }
      await saveClientMeters(projectId, updated);
      router.push(cancelHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu điểm đo.");
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {initialMeter ? "Chỉnh sửa điểm đo" : "Thêm mới điểm đo"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {initialMeter
            ? "Cập nhật thông tin và cấu hình điểm đo trong dự án."
            : "Cấu hình điểm thu thập dữ liệu mới cho hệ thống giám sát năng lượng."}
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h2 className="text-[15px] font-semibold text-slate-800">Thông số cơ bản</h2>

          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            >
            <Field label="LOẠI ĐIỂM ĐO">
              {selectableEnergyTypes.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {selectableEnergyTypes.map((type) => {
                    const active = energy === type.name;
                    const isOutsideProject =
                      configuredTypeNames !== undefined && !configuredTypeNames.includes(type.name);
                    return (
                      <button
                        key={type.name}
                        type="button"
                        onClick={() => selectEnergy(type.name)}
                        title={
                          isOutsideProject
                            ? "Loại này đã được bỏ khỏi cấu hình hiện tại của dự án"
                            : type.description
                        }
                        className={`h-10 rounded-xl border text-sm font-semibold transition-all ${
                          active
                            ? "border-emerald-600 bg-emerald-50/80 text-emerald-700 ring-1 ring-emerald-500/20"
                            : isOutsideProject
                              ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                        }`}
                      >
                        <span>{type.name}</span>
                        {isOutsideProject ? <span className="ml-1 text-[10px]">(cũ)</span> : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-semibold">Dự án chưa cấu hình loại điểm đo.</p>
                  <p className="mt-1 text-xs text-amber-700">
                    Hãy quay lại cấu hình dự án để thêm Điện, Hơi hoặc loại năng lượng phù hợp.
                  </p>
                  <Link
                    href={cancelHref}
                    className="mt-2 inline-flex text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Mở cấu hình dự án
                  </Link>
                </div>
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="MÃ ĐIỂM ĐO (ID)">
                <input
                  value={pointId}
                  onChange={(e) => setPointId(e.target.value)}
                  placeholder="VD: MP-001"
                  className="input"
                  required
                />
              </Field>
              <Field label="TÊN ĐIỂM ĐO">
                <input
                  value={pointName}
                  onChange={(e) => setPointName(e.target.value)}
                  placeholder="Nhập tên điểm đo"
                  className="input"
                  required
                />
              </Field>
            </div>

            <Field label="SỐ SERIAL ĐỒNG HỒ (NHẬP TAY)">
              <input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="VD: EM-992834-A"
                className="input"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Có thể nhập trước khi gán thiết bị. Serial chưa được ghép nối sẽ chưa có dữ liệu.
              </p>
            </Field>

            <Field label="THIẾT BỊ">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  const device = devices.find((d) => d.id === id);
                  if (device) applyDevice(device);
                }}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 px-6 py-10 text-center"
              >
                <ImportIcon className="mb-3 h-8 w-8 text-emerald-600" />
                {droppedDevice ? (
                  <>
                    <p className="max-w-md text-sm font-semibold text-slate-700">
                      Đã gán đồng hồ: {droppedDevice.name}
                    </p>
                    <p className="mt-1 max-w-md text-xs text-slate-500">
                      {serialNumber || droppedDevice.sn} · {droppedDevice.brandModel}
                    </p>
                    <button
                      type="button"
                      onClick={clearDevice}
                      className="mt-2 rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
                    >
                      Bỏ gán đồng hồ
                    </button>
                  </>
                ) : (
                  <>
                    <p className="max-w-md text-sm text-slate-500">
                      Chưa gán đồng hồ hoặc số serial
                    </p>
                    <p className="mt-1 max-w-md text-xs text-slate-400">
                      Điểm đo vẫn được lưu; trạng thái và giá trị sẽ hiển thị chưa có dữ liệu cho đến khi gán đồng hồ.
                    </p>
                  </>
                )}
              </div>
            </Field>

            <Field label="ĐIỂM ĐO CHA">
              <div className="relative">
                <select
                  value={parentId}
                  onChange={(e) => selectParent(e.target.value)}
                  className="input appearance-none pr-9"
                >
                  <option value="">Không có điểm đo cha</option>
                  {parentOptions.map((meter) => (
                    <option key={meter.id} value={meter.id}>
                      {meter.name} ({meter.code})
                    </option>
                  ))}
                </select>
                <ChevronIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Chỉ chọn nếu điểm đo này có quan hệ cha–con. Nếu không, giữ “Không có điểm đo cha”.
              </p>
            </Field>

            <Field label="CÔNG THỨC CHUYỂN ĐỔI (DATA TRANSFORM)">
              <div className="relative">
                <input
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  placeholder="VD: kWh * 0.85"
                  className="input pr-10"
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-lg font-semibold text-slate-400">
                  Σ
                </span>
              </div>
            </Field>

            {error ? <p className="text-sm font-medium text-red-500">{error}</p> : null}

            <div className="flex justify-end gap-3 pt-4">
              <Link
                href={cancelHref}
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
              >
                Hủy
              </Link>
              <button
                type="submit"
                className="h-10 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
              >
                {initialMeter ? "Lưu thay đổi" : "Thêm điểm đo"}
              </button>
            </div>
          </form>
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-slate-800">Thư viện loại đồng hồ</h2>
            <InfoIcon className="h-4 w-4 text-slate-400" />
          </div>

          <label className="relative mb-4 flex items-center">
            <span className="pointer-events-none absolute left-3 text-slate-400">
              <MiniSearchIcon className="h-4 w-4" />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm thiết bị..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-[#f8fafc] pr-3 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white transition-colors"
            />
          </label>

          <ul className="max-h-[min(640px,70vh)] space-y-2 overflow-y-auto pr-1">
            {filteredDevices.map((device) => (
              <li key={device.id}>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", device.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => applyDevice(device)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3 text-left hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <MeterIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-800">{device.name}</span>
                    <span className="block truncate text-xs text-slate-400">
                      {device.brandModel} • {deviceSpec(device)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {filteredDevices.length === 0 && (
              <li className="py-6 text-center text-sm text-slate-400">Không tìm thấy thiết bị</li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function utilityForDevice(device: CatalogDevice): string | null {
  switch (device.kind) {
    case "flow":
      return "Nước";
    case "temp":
      return "Nhiệt";
    case "steam":
      return "Hơi";
    case "power":
      return "Điện";
    default:
      return null;
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ImportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 14v5.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 4v11M8 11l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5M12 8v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MiniSearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MeterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 15V9M12 15v-4M16 15v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
