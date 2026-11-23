"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
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
import { notifyMeterReplaced } from "@/lib/admin-notifications";
import { loadProjectGatewayLatest } from "@/lib/gateway-series";
import { registerToKwh } from "@/lib/meter-parameters";
import { recordMeterReplacement } from "@/lib/meter-replacements";
import {
  hydrateMeterModels,
  loadMeterModels,
  type MeterModelDef,
} from "@/lib/meter-models";
import {
  hydrateMeterTypeDefs,
  inferMeterTypeIcon,
  loadMeterTypeDefs,
  type MeterTypeDef,
} from "@/lib/meter-types";

type MeterCodeOption = {
  key: string;
  code: string;
  label: string;
  serial: string;
  category: string;
  device?: CatalogDevice;
};

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
  const [devices, setDevices] = useState<CatalogDevice[]>([]);
  const [meterModels, setMeterModels] = useState<MeterModelDef[]>(loadMeterModels);
  const [existingMeters, setExistingMeters] = useState<ClientMeter[]>([]);
  const [droppedDevice, setDroppedDevice] = useState<CatalogDevice | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(initialMeter?.deviceId ?? null);
  const [serialNumber, setSerialNumber] = useState(initialMeter?.serialNumber ?? "");
  const [selectedKey, setSelectedKey] = useState("");
  const [pointId, setPointId] = useState(initialMeter?.code ?? "");
  const [pointName, setPointName] = useState(initialMeter?.name ?? "");
  const [error, setError] = useState("");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [lastReadingWh, setLastReadingWh] = useState<number | null>(null);
  const [loadingLastReading, setLoadingLastReading] = useState(false);
  /** Người dùng đã chọn/bỏ chọn thủ công — không tự gán lại từ initialMeter. */
  const codeSelectionTouched = useRef(false);

  const initialSerial = (
    initialMeter?.serialNumber?.trim() ||
    devices.find((item) => item.id === initialMeter?.deviceId)?.sn ||
    ""
  ).trim();
  const nextSerial = (serialNumber.trim() || droppedDevice?.sn || "").trim();
  const isReplacement =
    Boolean(initialMeter && projectId && initialSerial && nextSerial && initialSerial !== nextSerial);

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

  const codeOptions = useMemo(() => {
    const bySerial = new Map<string, CatalogDevice>();
    for (const device of devices) {
      const sn = device.sn.trim();
      if (sn) bySerial.set(sn.toLowerCase(), device);
    }

    const options: MeterCodeOption[] = [];
    const seen = new Set<string>();

    for (const model of meterModels) {
      for (const serial of model.serials) {
        const sn = serial.trim();
        if (!sn) continue;
        const key = `${model.name}::${sn}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const device = bySerial.get(sn.toLowerCase());
        options.push({
          key,
          code: device?.id?.toUpperCase() || sn,
          label: device
            ? `${device.name} · ${model.name} · ${sn}`
            : `${model.name} · ${sn}`,
          serial: sn,
          category: model.name,
          device,
        });
      }
    }

    // Thiết bị thư viện có serial nhưng chưa nằm trong Category/Serial
    for (const device of devices) {
      const sn = device.sn.trim();
      if (!sn) continue;
      const key = `device::${device.id}`;
      const already = options.some(
        (item) => item.serial.toLowerCase() === sn.toLowerCase() || item.device?.id === device.id,
      );
      if (already || seen.has(key)) continue;
      seen.add(key);
      options.push({
        key,
        code: device.id.toUpperCase(),
        label: `${device.name} · ${device.category || device.brandModel} · ${sn}`,
        serial: sn,
        category: device.category || device.brandModel || "",
        device,
      });
    }

    if (initialMeter?.code) {
      const exists = options.some(
        (item) =>
          item.code === initialMeter.code ||
          item.serial === (initialMeter.serialNumber ?? "") ||
          item.device?.id === initialMeter.deviceId,
      );
      if (!exists) {
        options.unshift({
          key: `current::${initialMeter.code}`,
          code: initialMeter.code,
          label: `${initialMeter.name} · ${initialMeter.code} (đang dùng)`,
          serial: initialMeter.serialNumber?.trim() || "",
          category: initialMeter.type,
          device: devices.find((item) => item.id === initialMeter.deviceId),
        });
      }
    }

    return options.sort((a, b) => a.label.localeCompare(b.label, "vi"));
  }, [devices, meterModels, initialMeter]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      hydrateDevices(),
      hydrateMeterTypeDefs(),
      hydrateMeterModels(),
      projectId ? hydrateClientMeters(projectId) : Promise.resolve([]),
    ]).then(([nextDevices, nextEnergyTypes, nextModels, meters]) => {
      if (!active) return;
      setDevices(nextDevices);
      setEnergyTypes(nextEnergyTypes);
      setMeterModels(nextModels);
      if (initialMeter?.deviceId) {
        const device = nextDevices.find((item) => item.id === initialMeter.deviceId) ?? null;
        setDroppedDevice(device);
        if (!initialMeter.serialNumber && device) setSerialNumber(device.sn);
      }
      if (projectId) setExistingMeters(meters);
    }).catch(() => {
      if (!active) return;
      setDevices(loadDevices());
      setEnergyTypes(loadMeterTypeDefs());
      setMeterModels(loadMeterModels());
      if (projectId) setExistingMeters(loadClientMeters(projectId));
    });
    return () => {
      active = false;
    };
  }, [initialMeter, projectId]);

  useEffect(() => {
    if (codeSelectionTouched.current) return;
    if (!codeOptions.length) return;
    if (selectedKey && codeOptions.some((item) => item.key === selectedKey)) return;
    const matched =
      codeOptions.find(
        (item) =>
          item.device?.id === initialMeter?.deviceId ||
          (initialMeter?.serialNumber &&
            item.serial.toLowerCase() === initialMeter.serialNumber.trim().toLowerCase()) ||
          item.code === initialMeter?.code,
      ) ?? null;
    if (matched) {
      setSelectedKey(matched.key);
      setPointId(matched.code);
      setSerialNumber(matched.serial);
      if (matched.device) {
        setDroppedDevice(matched.device);
        setDeviceId(matched.device.id);
      }
    }
  }, [codeOptions, initialMeter, selectedKey]);

  useEffect(() => {
    if (!isReplacement || !projectId || !initialMeter) {
      setLastReadingWh(null);
      return;
    }
    let active = true;
    setLoadingLastReading(true);
    void loadProjectGatewayLatest(projectId)
      .then((samples) => {
        if (!active) return;
        const sample = samples.find((item) => item.meterPointId === initialMeter.id);
        const raw = sample?.values?.EPaed;
        setLastReadingWh(typeof raw === "number" && Number.isFinite(raw) ? raw : 0);
      })
      .catch(() => {
        if (active) setLastReadingWh(0);
      })
      .finally(() => {
        if (active) setLoadingLastReading(false);
      });
    return () => {
      active = false;
    };
  }, [isReplacement, projectId, initialMeter]);

  const parentOptions = useMemo(
    () =>
      existingMeters.filter(
        (meter) =>
          meter.utility === energy &&
          meter.id !== initialMeter?.id &&
          (!initialMeter || !isMeterDescendant(existingMeters, initialMeter.id, meter.id)),
      ),
    [energy, existingMeters, initialMeter],
  );

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
    setConfirmReplace(false);
    setDroppedDevice(device);
    setDeviceId(device.id);
    setSerialNumber(device.sn);
    if (deviceEnergy) {
      setEnergy(deviceEnergy);
      const parent = existingMeters.find((meter) => meter.id === parentId);
      if (parent && parent.utility !== deviceEnergy) setParentId("");
    }
    setPointName((current) => current || device.name);
  }

  function clearMeterCode() {
    codeSelectionTouched.current = true;
    setSelectedKey("");
    setPointId("");
    setSerialNumber("");
    setDroppedDevice(null);
    setDeviceId(null);
    setConfirmReplace(false);
    setError("");
  }

  function selectMeterCode(key: string) {
    codeSelectionTouched.current = true;
    if (!key) {
      clearMeterCode();
      return;
    }
    setSelectedKey(key);
    setConfirmReplace(false);
    setError("");
    const option = codeOptions.find((item) => item.key === key);
    if (!option) {
      clearMeterCode();
      return;
    }
    setPointId(option.code);
    setSerialNumber(option.serial);
    if (option.device) {
      applyDevice(option.device);
    } else {
      setDroppedDevice(null);
      setDeviceId(null);
      setPointName((current) => current || option.label.split(" · ")[0] || option.code);
    }
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
      setError("Vui lòng chọn mã điểm đo và nhập tên điểm đo.");
      return;
    }
    if (!selectedKey) {
      setError("Vui lòng chọn mã điểm đo từ danh sách đã cấu hình.");
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
      if (isReplacement && !confirmReplace) {
        setError("Bạn đang thay đồng hồ. Hãy xác nhận thay thế để hệ thống lưu offset chỉ số cũ.");
        return;
      }

      const meters = await hydrateClientMeters(projectId);
      const selected = codeOptions.find((item) => item.key === selectedKey);
      const next: ClientMeter = {
        id: initialMeter?.id ?? `m-${Date.now()}`,
        name,
        code: id,
        type:
          droppedDevice?.brandModel ||
          droppedDevice?.type ||
          selected?.category ||
          initialMeter?.type ||
          "Chưa gán thiết bị",
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

      if (isReplacement && initialMeter) {
        const oldDevice = devices.find((item) => item.id === initialMeter.deviceId);
        const reading = lastReadingWh ?? 0;
        await recordMeterReplacement({
          projectId,
          meterPointId: initialMeter.id,
          oldSerial: initialSerial,
          newSerial: nextSerial,
          oldCategory: oldDevice?.category ?? null,
          newCategory: droppedDevice?.category ?? selected?.category ?? oldDevice?.category ?? null,
          lastReadingWh: reading,
          note: `Thay đồng hồ tại điểm ${name}`,
        });
        notifyMeterReplaced({
          projectId,
          meterName: name,
          oldSerial: initialSerial,
          newSerial: nextSerial,
          lastReadingKwh: registerToKwh(reading),
        });
      }

      await saveClientMeters(projectId, updated);
      router.push(cancelHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu điểm đo.");
    }
  }

  return (
    <div className="mx-auto max-w-[920px] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {initialMeter ? "Chỉnh sửa điểm đo" : "Thêm mới điểm đo"}
        </h1>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="text-[15px] font-semibold text-slate-800">Thông số cơ bản</h2>

        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
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
              <div className="relative">
                <select
                  value={selectedKey}
                  onChange={(e) => selectMeterCode(e.target.value)}
                  className="input appearance-none pr-9"
                  required
                >
                  <option value="">Chọn mã / serial đã cấu hình...</option>
                  {codeOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              {codeOptions.length === 0 ? (
                <p className="mt-1.5 text-xs text-amber-700">
                  Chưa có Category/Serial. Thêm tại Cấu hình → Category / Serial đồng hồ.
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-slate-400">
                  Chọn từ Category/Serial hoặc thư viện đồng hồ đã cấu hình sẵn.
                </p>
              )}
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

          {isReplacement ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <p className="text-sm font-semibold text-amber-900">Thay đồng hồ mới</p>
              <p className="mt-1 text-xs leading-5 text-amber-800">
                Serial đổi từ <span className="font-mono font-semibold">{initialSerial}</span> sang{" "}
                <span className="font-mono font-semibold">{nextSerial}</span>. Đồng hồ mới thường về 0 —
                hệ thống sẽ lưu chỉ số cuối đồng hồ cũ làm <strong>offset</strong> để tính sản lượng liên tục.
              </p>
              <p className="mt-2 text-xs text-amber-800">
                Chỉ số cuối đồng hồ cũ:{" "}
                {loadingLastReading
                  ? "đang lấy..."
                  : `${registerToKwh(lastReadingWh ?? 0).toFixed(3)} kWh`}
              </p>
              <label className="mt-3 flex items-start gap-2 text-xs text-amber-900">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={confirmReplace}
                  onChange={(e) => setConfirmReplace(e.target.checked)}
                />
                <span>
                  Xác nhận đây là thay đồng hồ (không phải sửa nhầm serial). Offset sẽ được cộng vào chỉ số mới khi tính điện / chi phí.
                </span>
              </label>
            </div>
          ) : null}

          <div className="block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500">
              THIẾT BỊ
            </span>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              {selectedKey && (droppedDevice || serialNumber) ? (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {droppedDevice?.name || "Đã chọn serial"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {[serialNumber || droppedDevice?.sn, droppedDevice?.brandModel || droppedDevice?.category]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      clearMeterCode();
                    }}
                    className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
                  >
                    Bỏ chọn
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Chọn mã điểm đo ở trên để gán Category/Serial đồng hồ.
                </p>
              )}
            </div>
          </div>

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
              disabled={!selectedKey || !pointId.trim() || !pointName.trim()}
              className="h-10 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {initialMeter ? "Lưu thay đổi" : "Thêm điểm đo"}
            </button>
          </div>
        </form>
      </section>
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

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
