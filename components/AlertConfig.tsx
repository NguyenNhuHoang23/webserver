"use client";

import { useMemo, useState, type ReactNode } from "react";

type CategoryId =
  | "energy"
  | "ui"
  | "frequency"
  | "power"
  | "harmonics"
  | "imbalance"
  | (string & {});

type Alarm = {
  id: string;
  alarmId: string;
  name: string;
  description: string;
  threshold: string;
  unit: string;
  current: string;
};

type Category = {
  id: CategoryId;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
};

type HistoryItem = {
  id: string;
  title: string;
  detail: string;
  values: string;
};

const presetCategories: Category[] = [
  { id: "energy", label: "Energy", icon: BoltIcon },
  { id: "ui", label: "U/I", icon: GaugeIcon },
  { id: "frequency", label: "Tần số", icon: WaveIcon },
  { id: "power", label: "Công suất", icon: PowerIcon },
  { id: "harmonics", label: "Sóng hài", icon: HarmonicIcon },
  { id: "imbalance", label: "Mất cân bằng pha", icon: ImbalanceIcon },
];

const extraCategoryPool: Category[] = [
  { id: "temperature", label: "Nhiệt độ", icon: ThermoIcon },
  { id: "quality", label: "Chất lượng điện", icon: QualityIcon },
];

const initialAlarms: Record<string, Alarm[]> = {
  energy: [
    {
      id: "e1",
      alarmId: "1",
      name: "Quá áp (Over-voltage)",
      description: "Cảnh báo khi điện áp vượt ngưỡng an toàn vận hành",
      threshold: "240",
      unit: "V",
      current: "250.1 V",
    },
    {
      id: "e2",
      alarmId: "2",
      name: "Thấp áp (Under-voltage)",
      description: "Cảnh báo khi điện áp giảm dưới mức cho phép",
      threshold: "200",
      unit: "V",
      current: "215.4 V",
    },
    {
      id: "e3",
      alarmId: "3",
      name: "Quá dòng (Over-current)",
      description: "Cảnh báo khi dòng điện vượt định mức thiết bị",
      threshold: "100",
      unit: "A",
      current: "45.2 A",
    },
    {
      id: "e4",
      alarmId: "4",
      name: "Hệ số công suất (Power Factor)",
      description: "Cảnh báo khi cosφ thấp hơn hệ số yêu cầu",
      threshold: "0.85",
      unit: "φ",
      current: "0.92 φ",
    },
  ],
  ui: [
    {
      id: "u1",
      alarmId: "1",
      name: "Điện áp pha A",
      description: "Ngưỡng theo dõi điện áp pha L1-N",
      threshold: "230",
      unit: "V",
      current: "228.6 V",
    },
    {
      id: "u2",
      alarmId: "2",
      name: "Dòng điện pha A",
      description: "Ngưỡng theo dõi dòng pha L1",
      threshold: "80",
      unit: "A",
      current: "41.8 A",
    },
  ],
  frequency: [
    {
      id: "f1",
      alarmId: "1",
      name: "Tần số cao",
      description: "Cảnh báo khi tần số lưới vượt ngưỡng",
      threshold: "50.5",
      unit: "Hz",
      current: "50.02 Hz",
    },
    {
      id: "f2",
      alarmId: "2",
      name: "Tần số thấp",
      description: "Cảnh báo khi tần số lưới tụt dưới ngưỡng",
      threshold: "49.5",
      unit: "Hz",
      current: "50.02 Hz",
    },
  ],
  power: [
    {
      id: "p1",
      alarmId: "1",
      name: "Công suất đỉnh",
      description: "Cảnh báo khi công suất hữu công vượt định mức",
      threshold: "250",
      unit: "kW",
      current: "184.7 kW",
    },
    {
      id: "p2",
      alarmId: "2",
      name: "Công suất phản kháng",
      description: "Cảnh báo khi Q vượt ngưỡng bù",
      threshold: "40",
      unit: "kVAr",
      current: "18.4 kVAr",
    },
  ],
  harmonics: [
    {
      id: "h1",
      alarmId: "1",
      name: "THD điện áp",
      description: "Tổng méo hài điện áp vượt tiêu chuẩn",
      threshold: "8",
      unit: "%",
      current: "3.2 %",
    },
    {
      id: "h2",
      alarmId: "2",
      name: "THD dòng điện",
      description: "Tổng méo hài dòng điện vượt tiêu chuẩn",
      threshold: "15",
      unit: "%",
      current: "6.8 %",
    },
  ],
  imbalance: [
    {
      id: "i1",
      alarmId: "1",
      name: "Mất cân bằng điện áp",
      description: "Độ lệch điện áp giữa các pha vượt ngưỡng",
      threshold: "2",
      unit: "%",
      current: "0.8 %",
    },
    {
      id: "i2",
      alarmId: "2",
      name: "Mất cân bằng dòng",
      description: "Độ lệch dòng giữa các pha vượt ngưỡng",
      threshold: "10",
      unit: "%",
      current: "4.1 %",
    },
  ],
};

const allHistory: HistoryItem[] = [
  {
    id: "h-1",
    title: "Cập nhật ngưỡng Quá áp & Thấp áp",
    detail: "Áp dụng từ 24/10/2023 • Bởi Admin",
    values: "240V / 200V",
  },
  {
    id: "h-2",
    title: "Điều chỉnh ngưỡng Quá dòng",
    detail: "Áp dụng từ 12/09/2023 • Bởi Admin",
    values: "100A",
  },
  {
    id: "h-3",
    title: "Thêm cảnh báo hệ số công suất",
    detail: "Áp dụng từ 03/08/2023 • Bởi Kỹ sư vận hành",
    values: "0.85 φ",
  },
];

export function AlertConfig() {
  const [categories, setCategories] = useState<Category[]>(presetCategories);
  const [activeId, setActiveId] = useState<CategoryId>("energy");
  const [alarmsByCategory, setAlarmsByCategory] = useState(initialAlarms);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const active = categories.find((item) => item.id === activeId) ?? categories[0];
  const alarms = alarmsByCategory[active?.id ?? "energy"] ?? [];
  const history = showAllHistory ? allHistory : allHistory.slice(0, 1);

  const nextExtra = useMemo(
    () => extraCategoryPool.find((item) => !categories.some((cat) => cat.id === item.id)),
    [categories],
  );

  function updateAlarm(alarmKey: string, patch: Partial<Alarm>) {
    if (!active) return;
    setAlarmsByCategory((current) => ({
      ...current,
      [active.id]: (current[active.id] ?? []).map((item) =>
        item.id === alarmKey ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addAlarm() {
    if (!active) return;
    const nextNo = (alarmsByCategory[active.id] ?? []).length + 1;
    const row: Alarm = {
      id: `${active.id}-${Date.now()}`,
      alarmId: String(nextNo),
      name: "",
      description: "Mô tả điều kiện kích hoạt cảnh báo",
      threshold: "0",
      unit: "V",
      current: "--.-",
    };
    setAlarmsByCategory((current) => ({
      ...current,
      [active.id]: [...(current[active.id] ?? []), row],
    }));
  }

  function removeCategory(id: CategoryId) {
    setCategories((current) => {
      const next = current.filter((item) => item.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? "energy");
      return next;
    });
  }

  function addCategory() {
    if (!nextExtra) return;
    setCategories((current) => [...current, nextExtra]);
    setAlarmsByCategory((current) =>
      current[nextExtra.id]
        ? current
        : {
            ...current,
            [nextExtra.id]: [
              {
                id: `${nextExtra.id}-1`,
                alarmId: "1",
                name: `Cảnh báo ${nextExtra.label}`,
                description: "Ngưỡng cảnh báo mặc định",
                threshold: "0",
                unit: nextExtra.id === "temperature" ? "°C" : "%",
                current: "--.-",
              },
            ],
          },
    );
    setActiveId(nextExtra.id);
  }

  if (!active) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        Chưa có nhóm cảnh báo. Thêm mới để bắt đầu cấu hình.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((category) => {
          const selected = category.id === active.id;
          const Icon = category.icon;
          return (
            <div
              key={category.id}
              className={`inline-flex h-11 items-center gap-2 rounded-xl pl-2.5 pr-1 text-sm font-medium ${
                selected
                  ? "bg-[#e8f1fd] text-[#1a73e8] ring-1 ring-[#1a73e8]"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  selected ? "bg-white text-[#1a73e8]" : "bg-slate-50 text-slate-500"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <button type="button" onClick={() => setActiveId(category.id)}>
                {category.label}
              </button>
              <button
                type="button"
                aria-label={`Ẩn nhóm ${category.label}`}
                className={`px-2 text-base leading-none ${
                  selected ? "text-[#1a73e8]/70" : "text-slate-400"
                }`}
                onClick={() => removeCategory(category.id)}
              >
                ×
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={addCategory}
          disabled={!nextExtra}
          className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3 text-sm font-medium text-slate-500 hover:border-[#1a73e8] hover:text-[#1a73e8] disabled:opacity-40"
        >
          <span className="text-base leading-none">+</span>
          Thêm mới
        </button>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Cấu hình Cảnh báo: {active.label}
            </h2>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#1a73e8] hover:underline"
            >
              <LiveIcon className="h-4 w-4" />
              Cấu hình Gateway trực tuyến (Live Gateway Configuration)
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {alarms.map((alarm) => (
            <article
              key={alarm.id}
              className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.03)]"
            >
              <div className="flex flex-wrap items-start gap-4">
                <label className="w-16 shrink-0">
                  <span className="mb-1.5 block text-[10px] font-semibold tracking-wide text-slate-400">
                    ID ALARM
                  </span>
                  <input
                    value={alarm.alarmId}
                    onChange={(e) => updateAlarm(alarm.id, { alarmId: e.target.value })}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-semibold outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/15"
                  />
                </label>

                <label className="min-w-[240px] flex-1">
                  <span className="mb-1.5 block text-[10px] font-semibold tracking-wide text-slate-400">
                    TÊN CẢNH BÁO
                  </span>
                  <input
                    value={alarm.name}
                    onChange={(e) => updateAlarm(alarm.id, { name: e.target.value })}
                    placeholder="Nhập tên cảnh báo"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none placeholder:text-slate-400 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/15"
                  />
                  <span className="mt-1.5 block text-xs text-slate-400">{alarm.description}</span>
                </label>

                <div className="ml-auto flex min-w-[120px] items-baseline justify-end gap-1.5 pt-6">
                  <input
                    value={alarm.threshold}
                    onChange={(e) => updateAlarm(alarm.id, { threshold: e.target.value })}
                    className="w-24 bg-transparent text-right text-3xl font-bold tracking-tight text-[#1a73e8] outline-none"
                    aria-label="Ngưỡng cảnh báo"
                  />
                  <span className="text-lg font-semibold text-[#5b9cf0]">{alarm.unit}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-[#1a73e8]">
                <CurrentIcon className="h-3.5 w-3.5" />
                Giá trị hiện tại: {alarm.current}
              </div>
            </article>
          ))}
        </div>

        <button
          type="button"
          onClick={addAlarm}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-[#f8fafc] py-3.5 text-sm font-medium text-slate-500 hover:border-[#1a73e8] hover:bg-[#f3f8ff] hover:text-[#1a73e8]"
        >
          <span className="text-base leading-none">+</span>
          Thêm loại cảnh báo
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[12px] font-semibold tracking-wide text-slate-500 uppercase">
            Lịch sử cấu hình cảnh báo
          </h2>
          <button
            type="button"
            onClick={() => setShowAllHistory((open) => !open)}
            className="text-sm font-medium text-[#1a73e8] hover:underline"
          >
            {showAllHistory ? "Thu gọn" : "Xem tất cả"}
          </button>
        </div>

        <ul className="space-y-2">
          {history.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-xl bg-[#f6f8fb] px-4 py-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
                <ClockIcon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-800">{item.title}</span>
                <span className="block text-xs text-slate-400">{item.detail}</span>
              </span>
              <span className="text-sm font-semibold text-[#1a73e8]">{item.values}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 4.5 13.5h6.2L9.2 22 19.5 10h-6.2L13 2Z" />
    </svg>
  );
}

function GaugeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="14" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.2 10.8a5.5 5.5 0 0 1 7.6 0M6 8.2a8.5 8.5 0 0 1 12 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PowerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M7.2 7.8a7 7 0 1 0 9.6 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HarmonicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 16V8M8 16v-5M12 16V6M16 16v-7M20 16v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ImbalanceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5 4.5 18h15L12 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 10v5M12 17.2v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ThermoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10 13.5V6.5a2 2 0 1 1 4 0v7a3.5 3.5 0 1 1-4 0Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 9v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function QualityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12.5 11 15.5 16.5 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="14" r="1.6" fill="currentColor" />
      <path
        d="M8.5 11.2a5 5 0 0 1 7 0M6.2 8.6a8.2 8.2 0 0 1 11.6 0M4 6.2a11.5 11.5 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CurrentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12h10M11 7l7 5-7 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4.5l3 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
