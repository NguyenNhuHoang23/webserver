"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { hydrateProjectSettings, loadProjectSettings, saveProjectSettings } from "@/lib/project-settings";
import type { MeterType } from "@/lib/projects";

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

const presetCategories: Category[] = [
  { id: "energy", label: "Energy", icon: BoltIcon },
  { id: "ui", label: "U/I", icon: GaugeIcon },
  { id: "frequency", label: "Tần số", icon: WaveIcon },
  { id: "power", label: "Công suất", icon: PowerIcon },
  { id: "harmonics", label: "Sóng hài", icon: HarmonicIcon },
  { id: "imbalance", label: "Mất cân bằng pha", icon: ImbalanceIcon },
];

const extraCategories: Category[] = [
  { id: "temperature", label: "Nhiệt độ", icon: ThermoIcon },
  { id: "quality", label: "Chất lượng điện", icon: QualityIcon },
  { id: "water", label: "Nước", icon: DropIcon },
  { id: "steam", label: "Hơi", icon: SteamIcon },
];

const catalogCategories: Category[] = [...presetCategories, ...extraCategories];

const ELECTRICITY_CATEGORY_IDS: CategoryId[] = [
  "energy",
  "ui",
  "frequency",
  "power",
  "harmonics",
  "imbalance",
];

function uniqueUtilities(values: string[]): MeterType[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function utilityIcon(utility: string): Category["icon"] {
  const value = utility.toLowerCase();
  if (value.includes("điện") || value.includes("dien")) return BoltIcon;
  if (value.includes("nước") || value.includes("nuoc")) return DropIcon;
  if (value.includes("nhiệt") || value.includes("nhiet")) return ThermoIcon;
  if (value.includes("hơi") || value.includes("hoi")) return SteamIcon;
  return TagIcon;
}

function categoriesForUtility(utility: string): Category[] {
  const value = utility.toLowerCase();
  const ids = value.includes("điện") || value.includes("dien")
    ? ELECTRICITY_CATEGORY_IDS
    : value.includes("nước") || value.includes("nuoc")
      ? (["water"] as CategoryId[])
      : value.includes("nhiệt") || value.includes("nhiet")
        ? (["temperature"] as CategoryId[])
        : value.includes("hơi") || value.includes("hoi")
          ? (["steam"] as CategoryId[])
          : [];
  const categories = ids
    .map((id) => catalogCategories.find((category) => category.id === id))
    .filter((category): category is Category => Boolean(category));
  return categories.length > 0
    ? categories
    : [{ id: `utility-${utility.toLowerCase().replace(/\s+/g, "-")}`, label: utility, icon: utilityIcon(utility) }];
}

function buildCategoryMap(utilities: string[]) {
  return Object.fromEntries(utilities.map((utility) => [utility, categoriesForUtility(utility)])) as Record<string, Category[]>;
}

const initialAlarms: Record<string, Alarm[]> = {};

function defaultAlarmsFor(categoryId: string, label?: string): Alarm[] {
  return [
    {
      id: `${categoryId}-1`,
      alarmId: "1",
      name: label ? `Cảnh báo ${label}` : "",
      description: "",
      threshold: "",
      unit: "",
      current: "",
    },
  ];
}

export function AlertConfig({
  projectId,
  initialUtilities,
}: {
  projectId: string;
  initialUtilities: MeterType[];
}) {
  const utilities = useMemo(() => uniqueUtilities(initialUtilities), [initialUtilities]);
  const firstUtility = utilities[0] ?? "Điện";
  const [activeUtility, setActiveUtility] = useState<MeterType>(firstUtility);
  const [categoriesByUtility, setCategoriesByUtility] = useState<Record<string, Category[]>>(() =>
    buildCategoryMap(utilities.length ? utilities : [firstUtility]),
  );
  const [activeId, setActiveId] = useState<CategoryId>(
    categoriesForUtility(firstUtility)[0]?.id ?? "energy",
  );
  const [alarmsByCategory, setAlarmsByCategory] = useState(initialAlarms);
  const [settingsReady, setSettingsReady] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: CategoryId; label: string } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    let active = true;
    setSettingsReady(false);
    void hydrateProjectSettings(projectId).then((payload) => {
      if (!active) return;
      const saved = payload.alertConfig as {
        categories?: Array<{ id: string; label: string }>;
        categoriesByUtility?: Record<string, Array<{ id: string; label: string }>>;
        activeUtility?: string;
        activeId?: string;
        alarmsByCategory?: Record<string, Alarm[]>;
      } | undefined;
      const restoreCategory = (item: { id: string; label: string }) => {
        const catalog = catalogCategories.find((category) => category.id === item.id);
        return catalog ?? { id: item.id, label: item.label, icon: TagIcon };
      };
      const defaults = buildCategoryMap(utilities.length ? utilities : [firstUtility]);
      const savedByUtility = saved?.categoriesByUtility;
      if (savedByUtility) {
        for (const utility of Object.keys(defaults)) {
          const savedCategories = savedByUtility[utility];
          if (savedCategories?.length) defaults[utility] = savedCategories.map(restoreCategory);
        }
      } else if (saved?.categories?.length && defaults[firstUtility]) {
        defaults[firstUtility] = saved.categories.map(restoreCategory);
      }
      const restoredUtility = saved?.activeUtility && utilities.includes(saved.activeUtility)
        ? saved.activeUtility
        : firstUtility;
      const restoredCategories = defaults[restoredUtility] ?? categoriesForUtility(restoredUtility);
      setCategoriesByUtility(defaults);
      setActiveUtility(restoredUtility);
      const savedActiveId = saved?.activeId;
      setActiveId(
        savedActiveId && restoredCategories.some((category) => category.id === savedActiveId)
          ? savedActiveId
          : restoredCategories[0]?.id ?? "",
      );
      if (saved?.alarmsByCategory) setAlarmsByCategory(saved.alarmsByCategory);
      setSettingsReady(true);
    }).catch(() => {
      if (active) setSettingsReady(true);
    });
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (!settingsReady) return;
    void saveProjectSettings(projectId, {
      ...(loadProjectSettings(projectId) ?? {}),
      alertConfig: {
        categoriesByUtility: Object.fromEntries(
          Object.entries(categoriesByUtility).map(([utility, items]) => [
            utility,
            items.map(({ id, label }) => ({ id, label })),
          ]),
        ),
        activeUtility,
        activeId,
        alarmsByCategory,
      },
    });
  }, [activeId, activeUtility, alarmsByCategory, categoriesByUtility, projectId, settingsReady]);

  const categories = categoriesByUtility[activeUtility] ?? categoriesForUtility(activeUtility);
  const active = categories.find((item) => item.id === activeId) ?? categories[0];
  const alarms = alarmsByCategory[active?.id ?? "energy"] ?? [];
  const unusedCatalog = useMemo(
    () => catalogCategories.filter((item) => !categories.some((cat) => cat.id === item.id)),
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
    setCategoriesByUtility((current) => ({
      ...current,
      [activeUtility]: (current[activeUtility] ?? []).filter((item) => item.id !== id),
    }));
    if (activeId === id) {
      setActiveId(categories.find((item) => item.id !== id)?.id ?? "");
    }
  }

  function addExistingCategory(category: Category) {
    setCategoriesByUtility((current) => ({
      ...current,
      [activeUtility]: (current[activeUtility] ?? []).some((item) => item.id === category.id)
        ? current[activeUtility]
        : [...(current[activeUtility] ?? []), category],
    }));
    setAlarmsByCategory((current) =>
      current[category.id] ? current : { ...current, [category.id]: defaultAlarmsFor(category.id, category.label) },
    );
    setActiveId(category.id);
    setAddingCategory(false);
    setNewCategoryName("");
  }

  function addCustomCategory() {
    const label = newCategoryName.trim();
    if (!label) return;
    const exists = categories.find((item) => item.label.toLowerCase() === label.toLowerCase());
    if (exists) {
      setActiveId(exists.id);
      setAddingCategory(false);
      setNewCategoryName("");
      return;
    }
    const fromCatalog = catalogCategories.find((item) => item.label.toLowerCase() === label.toLowerCase());
    if (fromCatalog) {
      addExistingCategory(fromCatalog);
      return;
    }
    addExistingCategory({ id: `custom-${Date.now()}`, label, icon: TagIcon });
  }

  function selectUtility(utility: MeterType) {
    const nextCategories = categoriesByUtility[utility] ?? categoriesForUtility(utility);
    setActiveUtility(utility);
    setActiveId((current) =>
      nextCategories.some((category) => category.id === current)
        ? current
        : nextCategories[0]?.id ?? "",
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Loại năng lượng của dự án
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Loại năng lượng">
          {utilities.map((utility) => {
            const selected = utility === activeUtility;
            const Icon = utilityIcon(utility);
            return (
              <button
                key={utility}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectUtility(utility)}
                className={`inline-flex h-12 min-w-[132px] items-center gap-2.5 rounded-xl border px-3.5 text-sm font-bold transition-all ${
                  selected
                    ? "border-emerald-500 bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    selected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {utility}
              </button>
            );
          })}
        </div>
      </section>

      <div>
        <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Nhóm cảnh báo của {activeUtility}
        </div>
        <div className="flex flex-wrap items-center gap-2">
        {categories.map((category) => {
          const selected = category.id === active?.id;
          const Icon = category.icon;
          return (
            <div
              key={category.id}
              className={`inline-flex h-11 items-center gap-2 rounded-xl pl-2.5 pr-1 text-sm font-semibold transition-all ${
                selected
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500 shadow-xs"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  selected ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-50 text-slate-500"
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
                  selected ? "text-emerald-700/70 hover:text-emerald-900" : "text-slate-400 hover:text-slate-600"
                }`}
                onClick={() => setCategoryToDelete({ id: category.id, label: category.label })}
              >
                ×
              </button>
            </div>
          );
        })}
        {addingCategory ? (
          <div className="flex min-w-[280px] flex-1 flex-wrap items-center gap-2 rounded-xl border border-dashed border-emerald-500 bg-emerald-50/40 p-2">
            {unusedCatalog.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addExistingCategory(item)}
                className="inline-flex h-8 items-center rounded-lg bg-white px-2.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:text-emerald-600 hover:ring-emerald-500 transition-colors"
              >
                {item.label}
              </button>
            ))}
            <input
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addCustomCategory();
                if (e.key === "Escape") {
                  setAddingCategory(false);
                  setNewCategoryName("");
                }
              }}
              placeholder="Tên nhóm cảnh báo mới"
              className="h-8 min-w-[160px] flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={addCustomCategory}
              disabled={!newCategoryName.trim()}
              className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors shadow-xs"
            >
              Thêm
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingCategory(false);
                setNewCategoryName("");
              }}
              className="h-8 rounded-lg px-2 text-xs font-medium text-slate-500 hover:bg-white"
            >
              Hủy
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingCategory(true)}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3 text-sm font-semibold text-slate-500 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
          >
            <span className="text-base leading-none text-emerald-600">+</span>
            Thêm mới
          </button>
        )}
      </div>
      </div>

      {!active ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Chưa có nhóm cảnh báo. Thêm mới để bắt đầu cấu hình.
        </div>
      ) : (
        <>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Cấu hình Cảnh báo: {active.label}
            </h2>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
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
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-center text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
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
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                  />
                  <span className="mt-1.5 block text-xs text-slate-400">{alarm.description}</span>
                </label>

                <div className="ml-auto flex min-w-[120px] items-baseline justify-end gap-1.5 pt-6">
                  <input
                    value={alarm.threshold}
                    onChange={(e) => updateAlarm(alarm.id, { threshold: e.target.value })}
                    className="w-24 bg-transparent text-right text-3xl font-bold tracking-tight text-emerald-600 outline-none"
                    aria-label="Ngưỡng cảnh báo"
                  />
                  <span className="text-lg font-semibold text-emerald-500">{alarm.unit}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CurrentIcon className="h-3.5 w-3.5" />
                Giá trị hiện tại: {alarm.current}
              </div>
            </article>
          ))}
        </div>

        <button
          type="button"
          onClick={addAlarm}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-[#f8fafc] py-3.5 text-sm font-semibold text-slate-600 hover:border-emerald-500 hover:bg-emerald-50/30 hover:text-emerald-700 transition-colors"
        >
          <span className="text-base leading-none text-emerald-600">+</span>
          Thêm loại cảnh báo
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="text-[12px] font-semibold tracking-wide text-slate-500 uppercase">
          Lịch sử cấu hình cảnh báo
        </h2>
        <p className="mt-3 text-sm text-slate-400">Chưa có lịch sử thay đổi.</p>
      </section>
        </>
      )}

      <ConfirmDialog
        open={Boolean(categoryToDelete)}
        title="Xác nhận xóa nhóm cảnh báo"
        description={`Bạn có chắc chắn muốn xóa nhóm cảnh báo "${categoryToDelete?.label}" của ${activeUtility} không? Các cấu hình cảnh báo thuộc nhóm này sẽ bị loại bỏ.`}
        confirmText="Xóa nhóm"
        onConfirm={() => {
          if (categoryToDelete) {
            removeCategory(categoryToDelete.id);
            setCategoryToDelete(null);
          }
        }}
        onCancel={() => setCategoryToDelete(null)}
      />
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

function DropIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function SteamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 18h14M8 18V9l4-4 4 4v9M9.5 12h5M9.5 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12V5h7l9 9-7 7-9-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
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
