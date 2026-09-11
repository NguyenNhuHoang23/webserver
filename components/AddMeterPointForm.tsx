"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  deviceSpec,
  INITIAL_DEVICES,
  loadDevices,
  type CatalogDevice,
} from "@/lib/devices";
import {
  loadClientMeters,
  saveClientMeters,
  type ClientMeter,
} from "@/lib/client-meters";
import { loadMeterTypeDefs, type MeterTypeDef } from "@/lib/meter-types";

export function AddMeterPointForm({
  cancelHref = "/",
  projectId,
}: {
  cancelHref?: string;
  projectId?: string;
}) {
  const router = useRouter();
  const [energyTypes, setEnergyTypes] = useState<MeterTypeDef[]>(loadMeterTypeDefs);
  const [energy, setEnergy] = useState("Điện");
  const [parentId, setParentId] = useState("");
  const [query, setQuery] = useState("");
  const [devices, setDevices] = useState<CatalogDevice[]>(INITIAL_DEVICES);
  const [existingMeters, setExistingMeters] = useState<ClientMeter[]>([]);
  const [droppedDevice, setDroppedDevice] = useState<CatalogDevice | null>(null);
  const [pointId, setPointId] = useState("");
  const [pointName, setPointName] = useState("");
  const [interval, setInterval] = useState("15");
  const [formula, setFormula] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setDevices(loadDevices());
    setEnergyTypes(loadMeterTypeDefs());
    if (projectId) setExistingMeters(loadClientMeters(projectId));
  }, [projectId]);

  const parentOptions = useMemo(
    () => existingMeters.filter((meter) => meter.utility === energy),
    [energy, existingMeters],
  );

  const filteredDevices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.brandModel.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.sn.toLowerCase().includes(q) ||
        (d.protocol ?? "").toLowerCase().includes(q),
    );
  }, [devices, query]);

  function applyDevice(device: CatalogDevice) {
    setDroppedDevice(device);
    setPointName((current) => current || device.name);
    setPointId((current) => current || device.id.toUpperCase());
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

  function handleSubmit() {
    const id = pointId.trim();
    const name = pointName.trim();
    if (!id || !name) {
      setError("Vui lòng nhập mã điểm đo và tên điểm đo.");
      return;
    }
    if (!projectId) {
      router.push(cancelHref);
      return;
    }

    const meters = loadClientMeters(projectId);
    const next: ClientMeter = {
      id: `m-${Date.now()}`,
      name,
      code: id,
      type: droppedDevice?.brandModel || droppedDevice?.type || "Chưa gán thiết bị",
      parentId: parentId || null,
      utility: energy,
      deviceId: droppedDevice?.id ?? null,
    };
    saveClientMeters(projectId, [...meters, next]);
    router.push(cancelHref);
  }

  return (
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Thêm mới điểm đo</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cấu hình điểm thu thập dữ liệu mới cho hệ thống giám sát năng lượng.
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
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {energyTypes.map((type) => {
                  const active = energy === type.name;
                  return (
                    <button
                      key={type.name}
                      type="button"
                      onClick={() => selectEnergy(type.name)}
                      title={type.description}
                      className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                        active
                          ? "border-[#1a73e8] bg-white text-[#1a73e8]"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                      }`}
                    >
                      {type.name}
                    </button>
                  );
                })}
              </div>
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
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#8bb4ee] bg-[#f3f8ff] px-6 py-10 text-center"
              >
                <ImportIcon className="mb-3 h-8 w-8 text-[#1a73e8]" />
                <p className="max-w-md text-sm text-slate-500">
                  {droppedDevice
                    ? `Đã gắn thiết bị: ${droppedDevice.name}`
                    : "Kéo thiết bị từ thư viện vào đây để tự động cấu hình..."}
                </p>
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
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
              <Field label="CHU KỲ LẤY MẪU (PHÚT)">
                <input
                  type="number"
                  min={1}
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  className="input"
                />
              </Field>
            </div>

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
                className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </Link>
              <button
                type="submit"
                className="h-10 rounded-lg bg-[#1a73e8] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#1666d0]"
              >
                Lưu thay đổi
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
              className="h-9 w-full rounded-lg border border-slate-200 bg-[#f8fafc] pr-3 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-[#1a73e8] focus:bg-white"
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
                  className="flex w-full items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-3 text-left hover:border-[#c5daf7] hover:bg-[#f7fbff]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f1fd] text-[#1a73e8]">
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
