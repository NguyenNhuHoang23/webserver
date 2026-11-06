"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { DEFAULT_PASSWORD } from "@/lib/auth-constants";
import {
  BRANCH_ACCOUNT_ROLES,
  CUSTOMER_ACCOUNT_ROLE_META,
  accountManagesProject,
  canEditClientConfig,
  canManageBranchAccounts,
  hydrateCustomerAccounts,
  isBranchRole,
  normalizeCustomerRole,
  removeCustomerAccount,
  upsertCustomerAccount,
  type CustomerAccount,
} from "@/lib/customer-accounts";
import {
  buildMeterDepthMap,
  hydrateClientMeters,
  isMeterDescendant,
  loadClientMeters,
  orderMetersByTree,
  saveClientMeters,
  type ClientMeter,
} from "@/lib/client-meters";
import { loadDevices, type CatalogDevice } from "@/lib/devices";
import { loadProjects, resolveMeterTypes } from "@/lib/projects";
import {
  DEFAULT_VOLTAGE_LEVEL,
  formatTariffPrice,
  parseTariffPrice,
  INDUSTRIAL_SCHEDULE_DECISION,
  INDUSTRIAL_TARIFF_DECISION,
  INDUSTRIAL_VOLTAGE_LEVELS,
  pricesForLevel,
  resolveTouPrices,
  type TouBand,
  type VoltageLevelId,
} from "@/lib/industrial-electricity";
import {
  ALERT_CATEGORY_OPTIONS,
  DEFAULT_SEVERITY_BY_CATEGORY,
  normalizeAlertConfig,
  type AlertCategoryId,
  type AlertConfig,
  type AlertSeverityLevel,
} from "@/lib/alert-config";
import { hydrateProjectSettings, saveProjectSettings, type ProjectSettingsPayload } from "@/lib/project-settings";

type TabId = "project" | "meters" | "cost" | "alerts" | "accounts";
type Utility = string;
type DropPosition = "before" | "after" | "child";
type Meter = ClientMeter;

const NAV: { id: TabId; n: number; label: string; icon: "doc" | "nodes" | "cash" | "warn" | "user" }[] = [
  { id: "project", n: 1, label: "Dự án", icon: "doc" },
  { id: "meters", n: 2, label: "Cụm điểm đo", icon: "nodes" },
  { id: "cost", n: 3, label: "Chi phí", icon: "cash" },
  { id: "alerts", n: 4, label: "Cảnh báo", icon: "warn" },
  { id: "accounts", n: 5, label: "Quản lý tài khoản", icon: "user" },
];

const FALLBACK_UTILITIES = ["Điện", "Nước", "Nhiệt", "Hơi"];

type Slot = { id: string; name: string; color: string; from: string; to: string; price: string };
type TouPriceInputs = Record<TouBand, string>;
type SavedCostConfig = {
  utility?: string;
  applyDate?: string;
  slots?: Slot[];
  flatPrices?: Record<string, string>;
  electricity?: {
    voltageLevel?: VoltageLevelId;
    prices?: Partial<TouPriceInputs>;
  };
};

function tariffInputs(levelId: string | undefined): TouPriceInputs {
  const prices = pricesForLevel(levelId);
  return {
    normal: formatTariffPrice(prices.normal),
    off: formatTariffPrice(prices.off),
    peak: formatTariffPrice(prices.peak),
  };
}
export function ClientConfig() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "default";
  const { session } = useAuth();
  const canEditConfig = canEditClientConfig(session);
  const canManageUsers = canManageBranchAccounts(session) || session?.portal === "admin";
  const [tab, setTab] = useState<TabId>("meters");
  const [openParams, setOpenParams] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [utilities, setUtilities] = useState<string[]>(FALLBACK_UTILITIES);
  const [utility, setUtility] = useState<Utility>("Điện");
  const [meters, setMeters] = useState<ClientMeter[]>([]);
  const [devices, setDevices] = useState<CatalogDevice[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [applyDate, setApplyDate] = useState("");
  const [flatPrices, setFlatPrices] = useState<Record<string, string>>({});
  const [voltageLevel, setVoltageLevel] = useState<VoltageLevelId>(DEFAULT_VOLTAGE_LEVEL);
  const [touPrices, setTouPrices] = useState<TouPriceInputs>(() => tariffInputs(DEFAULT_VOLTAGE_LEVEL));
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [adding, setAdding] = useState(false);
  const [accountError, setAccountError] = useState("");

  const [classify, setClassify] = useState("Thông tin chung (Info)");
  const [startTime, setStartTime] = useState("");
  const [warnCount, setWarnCount] = useState("");
  const [warnTimeout, setWarnTimeout] = useState(1);
  const [onlineTimeout, setOnlineTimeout] = useState(10);
  const [gmail, setGmail] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState("Tiếng Việt");
  const [theme, setTheme] = useState<"Sáng" | "Tối" | "Hệ thống">("Sáng");

  const [threshold, setThreshold] = useState("");
  const [dailyLimit, setDailyLimit] = useState(0);
  const [peakWarn, setPeakWarn] = useState(true);
  const [severityByCategory, setSeverityByCategory] = useState(DEFAULT_SEVERITY_BY_CATEGORY);

  function applyCostSettings(settings: ProjectSettingsPayload, types: string[] = utilities) {
    const savedCost = settings.costConfig as SavedCostConfig | undefined;
    if (!savedCost) {
      setApplyDate("");
      setSlots([]);
      setFlatPrices({});
      setVoltageLevel(DEFAULT_VOLTAGE_LEVEL);
      setTouPrices(tariffInputs(DEFAULT_VOLTAGE_LEVEL));
      return;
    }
    setApplyDate(savedCost.applyDate ?? "");
    setSlots(savedCost.slots?.length ? savedCost.slots.map((slot) => ({ ...slot })) : []);
    setFlatPrices(savedCost.flatPrices ? { ...savedCost.flatPrices } : {});
    const tariff = resolveTouPrices(savedCost.electricity?.voltageLevel, savedCost.electricity?.prices);
    setVoltageLevel(tariff.levelId);
    setTouPrices({
      normal: formatTariffPrice(tariff.prices.normal),
      off: formatTariffPrice(tariff.prices.off),
      peak: formatTariffPrice(tariff.prices.peak),
    });
    if (savedCost.utility && types.includes(savedCost.utility)) setUtility(savedCost.utility);
  }

  function applyAlertSettings(settings: ProjectSettingsPayload) {
    const config = normalizeAlertConfig(settings.alertConfig);
    setSeverityByCategory(config.severityByCategory);
    setThreshold(config.overConsumptionKwh ?? "");
    setDailyLimit(config.dailyLimit ?? 0);
    setPeakWarn(config.peakHourWarning ?? true);
  }

  useEffect(() => {
    const project = loadProjects().find((item) => item.id === projectId);
    const types = resolveMeterTypes(project);
    setUtilities(types.length ? types : FALLBACK_UTILITIES);
    setUtility((current) => (types.includes(current) ? current : types[0] ?? "Điện"));
    void hydrateClientMeters(projectId)
      .then(setMeters)
      .catch(() => setMeters(loadClientMeters(projectId)));
    void hydrateProjectSettings(projectId, { force: true })
      .then((settings) => {
        applyCostSettings(settings, types);
        applyAlertSettings(settings);
      })
      .catch(() => undefined);
    setDevices(loadDevices());
  }, [projectId]);

  useEffect(() => {
    let active = true;
    void hydrateCustomerAccounts(projectId)
      .then((rows) => {
        if (!active) return;
        setAccounts(
          rows.filter(
            (item) => isBranchRole(item.role) && accountManagesProject(item, projectId),
          ),
        );
      })
      .catch(() => {
        if (active) setAccounts([]);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  const markSaved = async () => {
    if (!canEditConfig) {
      setSaveError("Tài khoản của bạn chỉ được xem cấu hình, không được chỉnh sửa.");
      return;
    }
    setSaveError("");
    setSaving(true);
    try {
      if (tab === "cost") {
        const stored = await saveProjectSettings(projectId, {
          costConfig: {
            utility,
            applyDate,
            slots,
            flatPrices,
            electricity: {
              voltageLevel,
              prices: touPrices,
            },
          },
        });
        applyCostSettings(stored);
      } else if (tab === "alerts") {
        const payload: AlertConfig = {
          severityByCategory,
          overConsumptionKwh: threshold,
          dailyLimit,
          peakHourWarning: peakWarn,
        };
        const stored = await saveProjectSettings(projectId, { alertConfig: payload });
        applyAlertSettings(stored);
      } else {
        await saveClientMeters(projectId, meters);
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } catch (error) {
      setSaved(false);
      setSaveError(error instanceof Error ? error.message : "Không thể lưu cấu hình. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const visibleMeters = useMemo(
    () => orderMetersByTree(meters.filter((item) => item.utility === utility)),
    [meters, utility],
  );

  const meta = {
    project: { title: "Thông tin dự án", hint: "Quản lý các thiết lập cơ bản cho dự án EMS" },
    meters: {
      title: "Cụm điểm đo",
      hint: `Cấu hình phân cấp cây cha–con của các điểm đo trên Sơ đồ · Dự án ${projectId}`,
    },
    cost: { title: "Cấu hình chi phí", hint: "Quản lý các thiết lập chi phí năng lượng cho nhà máy" },
    alerts: {
      title: "Cấu hình cảnh báo",
      hint: "Chọn mức độ (nghiêm trọng / cảnh báo / thông tin) theo từng loại lỗi. Nhật ký chỉ hiển thị thời điểm phát sinh.",
    },
    accounts: {
      title: "Quản lý tài khoản",
      hint: "Tài khoản nhánh truy cập ứng dụng: Chỉ xem hoặc Xem & chỉnh sửa thông số cấu hình",
    },
  }[tab];

  return (
    <div className="flex h-full min-h-0 bg-[#f4f6f9]">
      <aside className="flex w-[248px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h1 className="text-[16px] font-bold text-slate-800">Danh Sách Cấu Hình</h1>
        </div>
        <div className="px-3 py-3">
          <button
            type="button"
            onClick={() => setOpenParams((v) => !v)}
            className="mb-2 flex w-full items-center justify-between px-2 text-[11px] font-semibold tracking-[0.08em] text-slate-400"
          >
            CẤU HÌNH THÔNG SỐ
            <span className={`text-[10px] ${openParams ? "" : "-rotate-90"}`}>▾</span>
          </button>
          {openParams
            ? NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`mb-1 flex h-10 w-full items-center gap-2.5 rounded-md px-3 text-left text-[13px] font-medium transition-colors ${
                    tab === item.id ? "bg-emerald-600 text-white shadow-xs" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <NavIcon type={item.icon} className="h-4 w-4" />
                  {item.n}. {item.label}
                </button>
              ))
            : null}
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[22px] font-bold text-slate-800">{meta.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{meta.hint}</p>
            </div>
            {tab !== "accounts" ? (
              <button
                type="button"
                title={canEditConfig ? "Lưu" : "Chỉ được xem"}
                onClick={() => void markSaved()}
                disabled={saving || !canEditConfig}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-60"
              >
                <SaveIcon />
              </button>
            ) : null}
          </div>
          {!canEditConfig && tab !== "accounts" ? (
            <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
              Tài khoản của bạn chỉ được xem cấu hình — không thể lưu thay đổi.
            </p>
          ) : null}

          {tab === "project" ? (
            <ProjectForm
              classify={classify}
              onClassify={setClassify}
              startTime={startTime}
              onStartTime={setStartTime}
              warnCount={warnCount}
              onWarnCount={setWarnCount}
              warnTimeout={warnTimeout}
              onWarnTimeout={setWarnTimeout}
              onlineTimeout={onlineTimeout}
              onOnlineTimeout={setOnlineTimeout}
              gmail={gmail}
              onGmail={setGmail}
              password={password}
              onPassword={setPassword}
              language={language}
              onLanguage={setLanguage}
              theme={theme}
              onTheme={setTheme}
            />
          ) : null}

          {tab === "meters" ? (
            <MetersPanel
              utility={utility}
              utilities={utilities}
              onUtility={setUtility}
              meters={visibleMeters}
              devices={devices}
              onMetersChange={(nextVisible) => {
                setMeters((current) => {
                  const other = current.filter((item) => item.utility !== utility);
                  return [...other, ...nextVisible];
                });
              }}
            />
          ) : null}

          {tab === "cost" ? (
            <CostPanel
              utility={utility}
              utilities={utilities}
              onUtility={setUtility}
              applyDate={applyDate}
              onApplyDate={setApplyDate}
              voltageLevel={voltageLevel}
              touPrices={touPrices}
              onVoltageLevel={(levelId) => {
                setVoltageLevel(levelId);
                setTouPrices(tariffInputs(levelId));
              }}
              onTouPrice={(band, value) => setTouPrices((current) => ({ ...current, [band]: value }))}
              flatPrice={flatPrices[utility]}
              onFlatPrice={(value) => setFlatPrices((current) => ({ ...current, [utility]: value }))}
            />
          ) : null}

          {tab === "alerts" ? (
            <AlertsPanel
              severityByCategory={severityByCategory}
              onSeverity={(category, level) =>
                setSeverityByCategory((current) => ({ ...current, [category]: level }))
              }
              threshold={threshold}
              onThreshold={setThreshold}
              dailyLimit={dailyLimit}
              onDailyLimit={setDailyLimit}
              peakWarn={peakWarn}
              onPeakWarn={setPeakWarn}
            />
          ) : null}

          {tab === "accounts" ? (
            <AccountsPanel
              projectId={projectId}
              accounts={accounts}
              adding={adding}
              canManage={canManageUsers}
              error={accountError}
              onAdding={setAdding}
              onAdd={(row) => {
                setAccountError("");
                void upsertCustomerAccount(row)
                  .then((next) => {
                    setAccounts(
                      next.filter(
                        (item) => isBranchRole(item.role) && accountManagesProject(item, projectId),
                      ),
                    );
                    setAdding(false);
                  })
                  .catch((error) => {
                    setAccountError(error instanceof Error ? error.message : "Không tạo được tài khoản.");
                  });
              }}
              onRemove={(id) => {
                setAccountError("");
                void removeCustomerAccount(id)
                  .then((next) => {
                    setAccounts(
                      next.filter(
                        (item) => isBranchRole(item.role) && accountManagesProject(item, projectId),
                      ),
                    );
                  })
                  .catch((error) => {
                    setAccountError(error instanceof Error ? error.message : "Không xóa được tài khoản.");
                  });
              }}
            />
          ) : null}

          {tab !== "accounts" ? (
            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setMeters(loadClientMeters(projectId));
                  void hydrateProjectSettings(projectId, { force: true }).then((settings) => {
                    applyCostSettings(settings);
                  });
                }}
                className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => void markSaved()}
                disabled={saving || !canEditConfig}
                className="h-10 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-60"
              >
                {saving ? "Đang lưu..." : "Lưu cấu hình"}
              </button>
            </div>
          ) : null}
          {saveError ? (
            <p className="mt-3 text-right text-[12px] font-medium text-red-600">{saveError}</p>
          ) : saved ? (
            <p className="mt-3 text-right text-[12px] font-medium text-emerald-600">Đã lưu cấu hình vào database</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function ProjectForm({
  classify,
  onClassify,
  startTime,
  onStartTime,
  warnCount,
  onWarnCount,
  warnTimeout,
  onWarnTimeout,
  onlineTimeout,
  onOnlineTimeout,
  gmail,
  onGmail,
  password,
  onPassword,
  language,
  onLanguage,
  theme,
  onTheme,
}: {
  classify: string;
  onClassify: (v: string) => void;
  startTime: string;
  onStartTime: (v: string) => void;
  warnCount: string;
  onWarnCount: (v: string) => void;
  warnTimeout: number;
  onWarnTimeout: (v: number) => void;
  onlineTimeout: number;
  onOnlineTimeout: (v: number) => void;
  gmail: string;
  onGmail: (v: string) => void;
  password: string;
  onPassword: (v: string) => void;
  language: string;
  onLanguage: (v: string) => void;
  theme: "Sáng" | "Tối" | "Hệ thống";
  onTheme: (v: "Sáng" | "Tối" | "Hệ thống") => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-slate-400">PHÂN LOẠI</p>
      <select
        value={classify}
        onChange={(e) => onClassify(e.target.value)}
        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500"
      >
        <option>Thông tin chung (Info)</option>
        <option>Thông tin kỹ thuật</option>
      </select>
      <div className="mt-2 divide-y divide-slate-100">
        <Field n={1} title="Start Time" hint="Thời gian bắt đầu chu kỳ dữ liệu hệ thống">
          <DateInput value={startTime} onChange={onStartTime} />
        </Field>
        <Field n={2} title="Warning Number" hint="Số lượng cảnh báo tối đa cho phép trong hàng đợi">
          <input
            value={warnCount}
            onChange={(e) => onWarnCount(e.target.value)}
            placeholder="Nhập số lượng (ví dụ: 50)..."
            className="h-10 w-full max-w-xs rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
          />
        </Field>
        <Field n={3} title="Warning Timeout" hint="Thời gian chờ phản hồi cảnh báo (tối thiểu 1 phút)">
          <Stepper value={warnTimeout} min={1} onChange={onWarnTimeout} />
        </Field>
        <Field n={4} title="Online Timeout" hint="Thời gian xác định trạng thái ngoại tuyến (tối thiểu 2 phút)">
          <Stepper value={onlineTimeout} min={2} onChange={onOnlineTimeout} />
        </Field>
        <Field n={7} title="Gmail đăng nhập" hint="Email hệ thống dùng để gửi thông báo và báo cáo tự động">
          <input
            type="email"
            value={gmail}
            onChange={(e) => onGmail(e.target.value)}
            placeholder="example@ems-project.com"
            className="h-10 w-full max-w-sm rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
          />
        </Field>
        <Field n={8} title="Mật khẩu" hint="Mật khẩu bảo mật cho tài khoản hệ thống (đã mã hóa)">
          <input
            type="password"
            value={password}
            onChange={(e) => onPassword(e.target.value)}
            className="h-10 w-full max-w-sm rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
          />
        </Field>
        <Field n={5} title="Ngôn ngữ hệ thống" hint="Ngôn ngữ hiển thị trên toàn bộ giao diện quản trị">
          <select
            value={language}
            onChange={(e) => onLanguage(e.target.value)}
            className="h-10 min-w-[180px] rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
          >
            <option>Tiếng Việt</option>
            <option>English</option>
          </select>
        </Field>
        <Field n={6} title="Màu sắc giao diện" hint="Lựa chọn chủ đề sáng hoặc tối để phù hợp với môi trường làm việc">
          <div className="inline-flex overflow-hidden rounded-md border border-slate-200">
            {(["Sáng", "Tối", "Hệ thống"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onTheme(item)}
                className={`h-9 px-4 text-[13px] font-medium transition-colors ${
                  theme === item ? "bg-emerald-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}

function MetersPanel({
  utility,
  utilities,
  onUtility,
  meters,
  devices,
  onMetersChange,
}: {
  utility: Utility;
  utilities: string[];
  onUtility: (v: Utility) => void;
  meters: Meter[];
  devices: CatalogDevice[];
  onMetersChange: (rows: Meter[]) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{ id: string; position: DropPosition } | null>(null);

  const depthMap = useMemo(() => buildMeterDepthMap(meters), [meters]);

  function resolveDropPosition(event: DragEvent<HTMLTableRowElement>): DropPosition {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const ratio = offsetY / rect.height;
    if (ratio < 0.28) return "before";
    if (ratio > 0.72) return "after";
    return "child";
  }

  function handleDrop(targetId: string, position: DropPosition) {
    if (!dragId) return;
    const next = applyMeterDrop(meters, dragId, targetId, position);
    if (next) onMetersChange(next);
    setDragId(null);
    setDropHint(null);
  }

  function changeParent(id: string, parentId: string | null) {
    if (parentId === id) return;
    if (parentId && isMeterDescendant(meters, id, parentId)) return;
    const ordered = orderMetersByTree(meters);
    const drag = ordered.find((meter) => meter.id === id);
    if (!drag) return;
    const without = ordered.filter((meter) => meter.id !== id);
    const moved: Meter = { ...drag, parentId };
    if (!parentId) {
      onMetersChange([...without, moved]);
      return;
    }
    const insertAt = findChildInsertIndex(without, parentId);
    const next = [...without.slice(0, insertAt), moved, ...without.slice(insertAt)];
    const depth = buildMeterDepthMap(next).get(id) ?? 0;
    if (depth > 2) return;
    onMetersChange(next);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <UtilityTabs value={utility} options={utilities} onChange={onUtility} />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-600/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          Kéo thả hoặc chọn điểm cha để phân cấp
        </span>
      </div>
      <p className="mt-3 text-[12px] text-slate-500">
        Kéo thả các hàng hoặc chọn trong cột <span className="font-semibold text-slate-700">ĐIỂM CHA</span> để thiết lập quan hệ cây phân cấp cha–con. Cấu trúc cây sẽ tự động đồng bộ và hiển thị trên <span className="font-semibold text-emerald-700">Sơ đồ hệ thống</span>.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[840px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wide text-slate-400">
              <th className="py-2.5 pr-2 font-semibold">TÊN ĐIỂM ĐO</th>
              <th className="py-2.5 pr-2 font-semibold">MÃ ID</th>
              <th className="py-2.5 pr-2 font-semibold">ĐIỂM CHA</th>
              <th className="py-2.5 pr-2 font-semibold">THIẾT BỊ ĐÃ GÁN</th>
              <th className="py-2.5 pr-2 font-semibold">LOẠI THIẾT BỊ</th>
            </tr>
          </thead>
          <tbody>
            {meters.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                  Chưa có điểm đo loại {utility}.
                </td>
              </tr>
            ) : (
              meters.map((item) => {
                const depth = depthMap.get(item.id) ?? 0;
                const isDragging = dragId === item.id;
                const hint = dropHint?.id === item.id ? dropHint.position : null;
                const assigned = devices.find((device) => device.id === item.deviceId);
                return (
                  <tr
                    key={item.id}
                    draggable
                    onDragStart={(event) => {
                      setDragId(item.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", item.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (!dragId || dragId === item.id) return;
                      if (isMeterDescendant(meters, dragId, item.id)) return;
                      event.dataTransfer.dropEffect = "move";
                      setDropHint({ id: item.id, position: resolveDropPosition(event) });
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!dragId || dragId === item.id) return;
                      handleDrop(item.id, resolveDropPosition(event));
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setDropHint(null);
                    }}
                    className={`border-b border-slate-50 text-slate-700 transition-colors ${
                      isDragging ? "opacity-40" : ""
                    } ${
                      hint === "child"
                        ? "bg-emerald-50 ring-1 ring-inset ring-emerald-500/30"
                        : hint
                          ? "bg-slate-50"
                          : "hover:bg-slate-50/70"
                    }`}
                  >
                    <td className="relative py-3 pr-2">
                      {hint === "before" ? (
                        <span className="absolute inset-x-0 top-0 h-0.5 bg-emerald-600" />
                      ) : null}
                      {hint === "after" ? (
                        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-600" />
                      ) : null}
                      <span
                        className="inline-flex w-full items-center gap-2"
                        style={{ paddingLeft: depth * 22 }}
                      >
                        <span
                          className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing"
                          title="Kéo thả để sắp xếp phân cấp"
                        >
                          <DragHandle />
                        </span>
                        {depth > 0 ? <span className="font-bold text-slate-300">↳</span> : null}
                        <span className="truncate text-[13px] font-semibold text-slate-800">
                          {item.name}
                        </span>
                        {hint === "child" ? (
                          <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                            Làm con
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="py-3 pr-2">
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 font-mono text-[12px] font-semibold text-slate-700">
                        {item.code}
                      </span>
                    </td>
                    <td className="py-3 pr-2">
                      <select
                        value={item.parentId ?? ""}
                        onChange={(e) => changeParent(item.id, e.target.value || null)}
                        className="h-8 max-w-[200px] rounded-md border border-slate-200 bg-white px-2 text-[12px] font-medium text-slate-700 outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
                      >
                        <option value="">Không có điểm đo cha (Gốc)</option>
                        {meters
                          .filter((meter) => meter.id !== item.id && !isMeterDescendant(meters, item.id, meter.id))
                          .map((meter) => (
                            <option key={meter.id} value={meter.id}>
                              Con của: {meter.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="py-3 pr-2">
                      {assigned ? (
                        <div>
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[12px] font-medium text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {assigned.name} · {assigned.sn}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                            ID: {assigned.id}
                          </span>
                        </div>
                      ) : item.serialNumber ? (
                        <div>
                          <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[12px] font-medium text-amber-700">
                            Serial: {item.serialNumber}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-slate-400">
                            Chờ ghép nối đồng hồ
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[12px] font-medium text-amber-700">
                          Chưa gán thiết bị
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-2 text-[12px] text-slate-600">{item.type}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function findChildInsertIndex(ordered: Meter[], parentId: string) {
  const parentIndex = ordered.findIndex((meter) => meter.id === parentId);
  if (parentIndex < 0) return ordered.length;

  const parentDepth = buildMeterDepthMap(ordered).get(parentId) ?? 0;
  let index = parentIndex + 1;
  const depths = buildMeterDepthMap(ordered);
  while (index < ordered.length && (depths.get(ordered[index].id) ?? 0) > parentDepth) {
    index += 1;
  }
  return index;
}

function applyMeterDrop(
  meters: Meter[],
  dragId: string,
  targetId: string,
  position: DropPosition,
): Meter[] | null {
  if (dragId === targetId) return null;
  if (isMeterDescendant(meters, dragId, targetId)) return null;

  const drag = meters.find((meter) => meter.id === dragId);
  const target = meters.find((meter) => meter.id === targetId);
  if (!drag || !target) return null;

  const ordered = orderMetersByTree(meters);
  const without = ordered.filter((meter) => meter.id !== dragId);
  const depths = buildMeterDepthMap(without);
  const targetDepth = depths.get(targetId) ?? 0;

  let parentId: string | null;
  let insertAt: number;

  if (position === "child") {
    if (targetDepth >= 2) return null;
    parentId = targetId;
    insertAt = findChildInsertIndex(without, targetId);
  } else {
    parentId = target.parentId;
    const targetIndex = without.findIndex((meter) => meter.id === targetId);
    insertAt = position === "before" ? targetIndex : targetIndex + 1;
  }

  const moved: Meter = { ...drag, parentId };
  const next = [...without.slice(0, insertAt), moved, ...without.slice(insertAt)];

  for (const meter of next) {
    const depth = buildMeterDepthMap(next).get(meter.id) ?? 0;
    if (depth > 2) return null;
  }

  return next;
}

function CostPanel({
  utility,
  utilities,
  onUtility,
  applyDate,
  onApplyDate,
  voltageLevel,
  touPrices,
  onVoltageLevel,
  onTouPrice,
  flatPrice,
  onFlatPrice,
}: {
  utility: Utility;
  utilities: string[];
  onUtility: (v: Utility) => void;
  applyDate: string;
  onApplyDate: (v: string) => void;
  voltageLevel: VoltageLevelId;
  touPrices: TouPriceInputs;
  onVoltageLevel: (levelId: VoltageLevelId) => void;
  onTouPrice: (band: TouBand, value: string) => void;
  flatPrice?: string;
  onFlatPrice: (value: string) => void;
}) {
  const isElectric = utility === "Điện";
  const unitMeta: Record<string, { title: string; hint: string; unit: string; defaultPrice: string }> = {
    Điện: {
      title: "Giá điện sản xuất theo khung giờ",
      hint: `Đơn giá chưa gồm VAT theo ${INDUSTRIAL_TARIFF_DECISION}. Khung giờ theo ${INDUSTRIAL_SCHEDULE_DECISION}.`,
      unit: "đồng/kWh",
      defaultPrice: "0",
    },
    Nước: {
      title: "Đơn giá nước",
      hint: "Cấu hình đơn giá tiêu thụ nước (VNĐ/m³)",
      unit: "VNĐ/m³",
      defaultPrice: "12,500",
    },
    Nhiệt: {
      title: "Đơn giá nhiệt",
      hint: "Cấu hình đơn giá năng lượng nhiệt (VNĐ/kWh)",
      unit: "VNĐ/kWh",
      defaultPrice: "2,100",
    },
    Hơi: {
      title: "Đơn giá hơi",
      hint: "Cấu hình đơn giá hơi công nghệ (VNĐ/tấn)",
      unit: "VNĐ/tấn",
      defaultPrice: "850,000",
    },
  };
  const meta = unitMeta[utility] ?? {
    title: `Đơn giá ${utility}`,
    hint: `Cấu hình đơn giá cho ${utility}`,
    unit: "VNĐ",
    defaultPrice: "0",
  };
  const flatPriceValue = flatPrice ?? meta.defaultPrice;

  return (
    <div>
      <UtilityTabs value={utility} options={utilities} onChange={onUtility} />
      <div className="mt-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
        <div>
          <p className="text-[15px] font-semibold text-slate-800">Ngày bắt đầu áp dụng</p>
          <p className="mt-1 text-[12px] text-slate-500">
            Thời gian chi phí mới bắt đầu có hiệu lực trong hệ thống
          </p>
        </div>
        <DateInput value={applyDate} onChange={onApplyDate} />
      </div>

      {isElectric ? (
        <div className="mt-5 space-y-5">
          <div>
            <p className="text-[15px] font-semibold text-slate-800">{meta.title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{meta.hint}</p>
            <p className="mt-2 text-[12px] text-slate-500">
              Tiền điện năng = sản lượng bình thường × đơn giá bình thường + sản lượng thấp điểm × đơn giá thấp điểm + sản lượng cao điểm × đơn giá cao điểm.
            </p>
          </div>

          <label className="block max-w-md">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-400">
              CẤP ĐIỆN ÁP
            </span>
            <select
              value={voltageLevel}
              onChange={(e) => onVoltageLevel(e.target.value as VoltageLevelId)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500"
            >
              {INDUSTRIAL_VOLTAGE_LEVELS.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["normal", "Giờ bình thường", "#27ae60"],
                ["off", "Giờ thấp điểm", "#7ec8e3"],
                ["peak", "Giờ cao điểm", "#e67e22"],
              ] as const
            ).map(([band, label, color]) => (
              <label key={band} className="rounded-md border border-slate-200 p-3">
                <span className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-slate-400">
                  <span className="h-4 w-1 rounded-full" style={{ backgroundColor: color }} />
                  {label.toUpperCase()}
                </span>
                <span className="relative block">
                  <input
                    value={touPrices[band]}
                    onChange={(e) => onTouPrice(band, e.target.value)}
                    inputMode="decimal"
                    className="h-10 w-full rounded-md border border-slate-200 pr-16 pl-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-slate-400">
                    đ/kWh
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div className="overflow-hidden rounded-md border border-slate-200">
            <div className="grid grid-cols-4 bg-slate-50 px-4 py-2 text-[11px] font-semibold tracking-wide text-slate-400">
              <span>CẤP ĐIỆN ÁP</span>
              <span>BÌNH THƯỜNG</span>
              <span>THẤP ĐIỂM</span>
              <span>CAO ĐIỂM</span>
            </div>
            {INDUSTRIAL_VOLTAGE_LEVELS.map((level) => {
              const selected = level.id === voltageLevel;
              const normal = selected ? parseTariffPrice(touPrices.normal) : level.normal;
              const off = selected ? parseTariffPrice(touPrices.off) : level.off;
              const peak = selected ? parseTariffPrice(touPrices.peak) : level.peak;
              return (
                <div
                  key={level.id}
                  className={`grid grid-cols-4 border-t border-slate-100 px-4 py-2.5 text-sm ${
                    selected ? "bg-emerald-50/70 font-semibold text-slate-800" : "text-slate-600"
                  }`}
                >
                  <span>{level.label}{selected ? " · đang dùng" : ""}</span>
                  <span className="font-mono">{formatTariffPrice(normal)}</span>
                  <span className="font-mono">{formatTariffPrice(off)}</span>
                  <span className="font-mono">{formatTariffPrice(peak)}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[12px] text-slate-400">
            Dòng được tô là đơn giá đang áp dụng và sẽ ghi vào database khi bấm Lưu cấu hình. Các dòng còn lại là biểu giá nhà nước để đối chiếu. Đổi cấp điện áp sẽ điền lại đơn giá theo biểu giá đó.
          </p>

          <div className="grid gap-2 text-[12px] text-slate-600 sm:grid-cols-3">
            <p className="rounded-md bg-slate-50 px-3 py-2">
              <span className="block font-semibold text-slate-700">Giờ thấp điểm</span>
              00:00 – 06:00, tất cả các ngày trong tuần.
            </p>
            <p className="rounded-md bg-slate-50 px-3 py-2">
              <span className="block font-semibold text-slate-700">Giờ bình thường</span>
              06:00 – 17:30 và 22:30 – 24:00 từ thứ Hai đến thứ Bảy. Chủ nhật: 06:00 – 24:00.
            </p>
            <p className="rounded-md bg-slate-50 px-3 py-2">
              <span className="block font-semibold text-slate-700">Giờ cao điểm</span>
              17:30 – 22:30 từ thứ Hai đến thứ Bảy. Chủ nhật không có giờ cao điểm.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <p className="text-[15px] font-semibold text-slate-800">{meta.title}</p>
          <p className="mt-1 text-[12px] text-slate-500">{meta.hint}</p>
          <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
            {utility} không dùng khung giờ cao điểm / thấp điểm — chỉ cấu hình đơn giá cố định.
          </p>
          <div className="mt-4 max-w-md rounded-md border border-slate-200 p-4">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-400">
                ĐƠN GIÁ ({meta.unit})
              </span>
              <span className="relative block">
                <input
                  value={flatPriceValue}
                  onChange={(e) => onFlatPrice(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-200 pr-14 pl-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-slate-400">
                  VNĐ
                </span>
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertsPanel({
  severityByCategory,
  onSeverity,
  threshold,
  onThreshold,
  dailyLimit,
  onDailyLimit,
  peakWarn,
  onPeakWarn,
}: {
  severityByCategory: Record<AlertCategoryId, AlertSeverityLevel>;
  onSeverity: (category: AlertCategoryId, level: AlertSeverityLevel) => void;
  threshold: string;
  onThreshold: (v: string) => void;
  dailyLimit: number;
  onDailyLimit: (v: number) => void;
  peakWarn: boolean;
  onPeakWarn: (v: boolean) => void;
}) {
  return (
    <div>
      <p className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
        Trang Cảnh báo chỉ ghi nhận thời điểm phát sinh. Chọn mức độ cho từng loại lỗi bên dưới — loại đánh dấu
        <span className="font-semibold text-rose-700"> Nghiêm trọng </span>
        sẽ được thống kê riêng.
      </p>

      <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-slate-400">
        MỨC ĐỘ THEO DANH MỤC LỖI
      </p>
      <div className="mb-5 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
        {ALERT_CATEGORY_OPTIONS.map((option) => (
          <div
            key={option.id}
            className="flex flex-wrap items-center justify-between gap-3 bg-white px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{option.label}</p>
              <p className="text-[11px] text-slate-400">{option.hint}</p>
            </div>
            <select
              value={severityByCategory[option.id]}
              onChange={(e) => onSeverity(option.id, e.target.value as AlertSeverityLevel)}
              className={`h-9 rounded-lg border px-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-emerald-500 ${
                severityByCategory[option.id] === "critical"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : severityByCategory[option.id] === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <option value="critical">Nghiêm trọng</option>
              <option value="warning">Cảnh báo</option>
              <option value="info">Thông tin</option>
            </select>
          </div>
        ))}
      </div>

      <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-slate-400">NGƯỠNG VẬN HÀNH</p>
      <div className="divide-y divide-slate-100">
        <Field title="Over-consumption threshold" hint="Ngưỡng tiêu thụ vượt mức cho phép (kWh)">
          <input
            value={threshold}
            onChange={(e) => onThreshold(e.target.value)}
            className="h-10 w-28 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
          />
        </Field>
        <Field title="Daily limit" hint="Giới hạn tiêu thụ hàng ngày tối đa">
          <Stepper value={dailyLimit} min={0} onChange={onDailyLimit} />
        </Field>
        <Field title="Peak Hour Warning" hint="Cảnh báo khi tiêu thụ cao trong giờ cao điểm">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <button
              type="button"
              role="switch"
              aria-checked={peakWarn}
              onClick={() => onPeakWarn(!peakWarn)}
              className={`relative h-6 w-11 rounded-full transition-colors ${peakWarn ? "bg-emerald-600" : "bg-slate-300"}`}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition"
                style={{ left: peakWarn ? 22 : 2 }}
              />
            </button>
            Kích hoạt
          </label>
        </Field>
      </div>
    </div>
  );
}

function AccountsPanel({
  projectId,
  accounts,
  adding,
  canManage,
  error,
  onAdding,
  onAdd,
  onRemove,
}: {
  projectId: string;
  accounts: CustomerAccount[];
  adding: boolean;
  canManage: boolean;
  error: string;
  onAdding: (v: boolean) => void;
  onAdd: (row: CustomerAccount) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState({
    username: "",
    fullName: "",
    role: "View" as "View" | "Edit",
    email: "",
    password: "",
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-slate-800">Tài khoản nhánh truy cập ứng dụng</h3>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Chỉ xem thông số, hoặc xem và chỉnh sửa trong phần cấu hình.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={() => onAdding(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 text-sm font-medium text-white hover:bg-emerald-700 shadow-xs transition-colors"
          >
            <UserPlusIcon />
            + Thêm tài khoản nhánh
          </button>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
            Chỉ Admin được thêm/xóa
          </span>
        )}
      </div>
      {adding && canManage ? (
        <div className="mb-4 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-3 lg:grid-cols-6">
          <input
            value={draft.username}
            onChange={(e) => setDraft({ ...draft, username: e.target.value })}
            placeholder="Tên đăng nhập"
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
          />
          <input
            value={draft.fullName}
            onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
            placeholder="Họ tên"
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
          />
          <input
            value={draft.email}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            placeholder="Email"
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
          />
          <select
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value as "View" | "Edit" })}
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
          >
            {BRANCH_ACCOUNT_ROLES.map((role) => (
              <option key={role} value={role}>
                {CUSTOMER_ACCOUNT_ROLE_META[role].label}
              </option>
            ))}
          </select>
          <input
            type="password"
            value={draft.password}
            onChange={(e) => setDraft({ ...draft, password: e.target.value })}
            placeholder="Mật khẩu"
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (!draft.username.trim() || !draft.email.trim() || !draft.password.trim()) return;
                onAdd({
                  id: `cus-${Date.now()}`,
                  username: draft.username.trim(),
                  displayName: draft.fullName.trim() || draft.username.trim(),
                  email: draft.email.trim(),
                  role: draft.role,
                  projectId,
                  projectIds: [projectId],
                  password: draft.password.trim() || DEFAULT_PASSWORD,
                });
                setDraft({ username: "", fullName: "", role: "View", email: "", password: "" });
              }}
              className="h-9 rounded-md bg-emerald-600 px-3 text-sm text-white hover:bg-emerald-700 shadow-xs transition-colors"
            >
              Thêm
            </button>
            <button type="button" onClick={() => onAdding(false)} className="h-9 rounded-md border px-3 text-sm">
              Hủy
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="mb-3 text-[12px] text-rose-600">{error}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wide text-slate-400">
              <th className="py-2">TÊN NGƯỜI DÙNG / HỌ TÊN</th>
              <th className="py-2">QUYỀN CẤU HÌNH</th>
              <th className="py-2">EMAIL</th>
              <th className="py-2 text-right">THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((row) => {
              const role = normalizeCustomerRole(row.role);
              return (
                <tr key={row.id} className="border-b border-slate-50">
                  <td className="py-3">
                    <p className="font-medium text-slate-800">{row.username}</p>
                    <p className="text-[12px] text-slate-500">{row.displayName}</p>
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        role === "Edit"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                      title={CUSTOMER_ACCOUNT_ROLE_META[role].hint}
                    >
                      {CUSTOMER_ACCOUNT_ROLE_META[role].label}
                    </span>
                  </td>
                  <td className="py-3 text-slate-600">{row.email}</td>
                  <td className="py-3">
                    {canManage ? (
                      <span className="flex justify-end gap-1 text-slate-400">
                        <IconBtn label="Xóa" onClick={() => onRemove(row.id)}>
                          <TrashIcon />
                        </IconBtn>
                      </span>
                    ) : (
                      <span className="block text-right text-[11px] text-slate-400">Chỉ xem</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-[12px] text-slate-400">
                  Chưa có tài khoản nhánh. Admin hãy thêm tài khoản Chỉ xem hoặc Xem &amp; chỉnh sửa.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UtilityTabs({
  value,
  options,
  onChange,
}: {
  value: Utility;
  options: string[];
  onChange: (v: Utility) => void;
}) {
  return (
    <div className="flex gap-5 border-b border-slate-200">
      {options.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`h-10 text-[14px] font-medium transition-colors ${
            value === item ? "border-b-2 border-emerald-600 text-emerald-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function Field({
  n,
  title,
  hint,
  children,
}: {
  n?: number;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div>
        <p className="text-[14px] font-medium text-slate-800">
          {n ? `${n}. ` : ""}
          {title}
        </p>
        <p className="mt-0.5 text-[12px] text-slate-500">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [y, m, d] = value.split("-");
  const label = y && m && d ? `${d}/${m}/${y}` : value;
  return (
    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
      {label}
      <CalendarIcon />
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="sr-only" />
    </label>
  );
}

function Stepper({ value, min, onChange }: { value: number; min: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-slate-200">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="h-10 w-10 text-slate-500 hover:bg-slate-50">
        −
      </button>
      <span className="flex h-10 min-w-[52px] items-center justify-center border-x border-slate-200 text-sm font-semibold">
        {value}
      </span>
      <button type="button" onClick={() => onChange(value + 1)} className="h-10 w-10 text-slate-500 hover:bg-slate-50">
        +
      </button>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 hover:text-slate-700"
    >
      {children}
    </button>
  );
}

function NavIcon({ type, className }: { type: "doc" | "nodes" | "cash" | "warn" | "user"; className?: string }) {
  if (type === "nodes") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="6" cy="12" r="2" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="18" cy="6" r="2" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="18" cy="18" r="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8 12h8M16.3 7.6 8 11M16.3 16.4 8 13" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (type === "cash") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (type === "warn") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 4 3.5 19h17L12 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M12 10v5M12 17.4v.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "user") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="9" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="16" cy="9" r="1.8" stroke="currentColor" strokeWidth="1.7" />
        <path d="M4.5 18c.8-2.5 2.6-4 5.5-4s4.7 1.5 5.5 4M14 14.2c1.7.2 3.1 1.2 4 3.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 3.5h7l5 5V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14 3.5V9h5.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M5 5h11l3 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 5v5h8M8 19v-6h8v6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M7 3.5h7l5 5V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function DragHandle() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-slate-300" aria-hidden>
      <circle cx="5" cy="4" r="1.1" fill="currentColor" />
      <circle cx="11" cy="4" r="1.1" fill="currentColor" />
      <circle cx="5" cy="8" r="1.1" fill="currentColor" />
      <circle cx="11" cy="8" r="1.1" fill="currentColor" />
      <circle cx="5" cy="12" r="1.1" fill="currentColor" />
      <circle cx="11" cy="12" r="1.1" fill="currentColor" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M5 7h14M10 11v6M14 11v6M9 7V5h6v2M7 7l1 12h8l1-12"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M4 20h4l11-11-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <circle cx="10" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4.8 18c.7-2.6 2.6-4 5.2-4s4.5 1.4 5.2 4M17 8v6M14 11h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5V7M16 3.5V7M4 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
