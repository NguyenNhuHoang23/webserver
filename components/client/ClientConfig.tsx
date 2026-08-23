"use client";

import { useMemo, useState, type DragEvent } from "react";

type TabId = "project" | "meters" | "cost" | "alerts" | "accounts";
type Utility = "Điện" | "Nước" | "Nhiệt" | "Hơi";
type DropPosition = "before" | "after" | "child";

const NAV: { id: TabId; n: number; label: string; icon: "doc" | "nodes" | "cash" | "warn" | "user" }[] = [
  { id: "project", n: 1, label: "Dự án", icon: "doc" },
  { id: "meters", n: 2, label: "Cụm điểm đo", icon: "nodes" },
  { id: "cost", n: 3, label: "Chi phí", icon: "cash" },
  { id: "alerts", n: 4, label: "Cảnh báo", icon: "warn" },
  { id: "accounts", n: 5, label: "Quản lý tài khoản", icon: "user" },
];

const UTILITIES: Utility[] = ["Điện", "Nước", "Nhiệt", "Hơi"];

const ALERT_TAGS = ["Energy", "U/I", "Tần số", "Công suất", "Sóng hài", "Mất cân bằng pha"];

type Meter = {
  id: string;
  name: string;
  code: string;
  type: string;
  parentId: string | null;
  utility: Utility;
};
type Slot = { id: string; name: string; color: string; from: string; to: string; price: string };
type AccountRow = {
  id: string;
  username: string;
  fullName: string;
  role: string;
  email: string;
  status: "Đang hoạt động" | "Ngoại tuyến";
};

const INITIAL_METERS: Meter[] = [
  { id: "m1", name: "Main Feed (Tổng trạm)", code: "MF-001", type: "Đồng hồ tổng 3 pha", parentId: null, utility: "Điện" },
  { id: "m2", name: "Production Line A", code: "PLA-01", type: "Smart Meter V3", parentId: "m1", utility: "Điện" },
  { id: "m3", name: "HVAC System", code: "HVAC-02", type: "Power Analyzer", parentId: "m1", utility: "Điện" },
  { id: "m4", name: "Chiller Unit 1", code: "CHL-01-A", type: "Sub-meter Modbus", parentId: "m2", utility: "Điện" },
  { id: "m5", name: "Nhà máy nước", code: "WTR-01", type: "Đồng hồ lưu lượng", parentId: null, utility: "Nước" },
  { id: "m6", name: "Lò hơi trung tâm", code: "STM-01", type: "Cảm biến hơi", parentId: null, utility: "Hơi" },
  { id: "m7", name: "Bộ trao đổi nhiệt", code: "HT-01", type: "Nhiệt kế IoT", parentId: null, utility: "Nhiệt" },
];

const INITIAL_SLOTS: Slot[] = [
  { id: "s1", name: "Giờ cao điểm", color: "#ef4444", from: "09:30", to: "11:30", price: "4,581" },
  { id: "s2", name: "Giờ bình thường", color: "#f59e0b", from: "11:30", to: "17:00", price: "2,666" },
  { id: "s3", name: "Giờ thấp điểm", color: "#22c55e", from: "22:00", to: "04:00", price: "1,828" },
];

const INITIAL_ACCOUNTS: AccountRow[] = [
  {
    id: "a1",
    username: "nguyen.van.a",
    fullName: "Nguyễn Văn A",
    role: "Quản trị viên",
    email: "vana.nguyen@fujikin.vn",
    status: "Đang hoạt động",
  },
  {
    id: "a2",
    username: "tran.thi.b",
    fullName: "Trần Thị B",
    role: "Kỹ thuật viên",
    email: "thib.tran@fujikin.vn",
    status: "Đang hoạt động",
  },
  {
    id: "a3",
    username: "le.van.c",
    fullName: "Lê Văn C",
    role: "Người xem",
    email: "vanc.le@fujikin.vn",
    status: "Ngoại tuyến",
  },
];

export function ClientConfig() {
  const [tab, setTab] = useState<TabId>("meters");
  const [openParams, setOpenParams] = useState(true);
  const [saved, setSaved] = useState(false);
  const [utility, setUtility] = useState<Utility>("Điện");
  const [meters, setMeters] = useState(INITIAL_METERS);
  const [slots, setSlots] = useState(INITIAL_SLOTS);
  const [applyDate, setApplyDate] = useState("2025-10-01");
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [adding, setAdding] = useState(false);

  const [classify, setClassify] = useState("Thông tin chung (Info)");
  const [startTime, setStartTime] = useState("2025-09-29");
  const [warnCount, setWarnCount] = useState("");
  const [warnTimeout, setWarnTimeout] = useState(1);
  const [onlineTimeout, setOnlineTimeout] = useState(10);
  const [gmail, setGmail] = useState("");
  const [password, setPassword] = useState("********");
  const [language, setLanguage] = useState("Tiếng Việt");
  const [theme, setTheme] = useState<"Sáng" | "Tối" | "Hệ thống">("Sáng");

  const [tags, setTags] = useState(ALERT_TAGS);
  const [activeTag, setActiveTag] = useState("Energy");
  const [threshold, setThreshold] = useState("5000");
  const [dailyLimit, setDailyLimit] = useState(150);
  const [peakWarn, setPeakWarn] = useState(true);

  const markSaved = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const visibleMeters = useMemo(
    () => orderMetersByTree(meters.filter((item) => item.utility === utility)),
    [meters, utility],
  );

  const meta = {
    project: { title: "Thông tin dự án", hint: "Quản lý các thiết lập cơ bản cho dự án EMS" },
    meters: { title: "Cụm điểm đo", hint: "Quản lý các thiết lập cơ bản cho dự án EMS" },
    cost: { title: "Cấu hình chi phí", hint: "Quản lý các thiết lập chi phí năng lượng cho nhà máy" },
    alerts: { title: "Cấu hình cảnh báo", hint: "Quản lý các thiết lập cơ bản cho dự án EMS" },
    accounts: { title: "Quản lý tài khoản", hint: "Quản lý các thiết lập cơ bản cho dự án EMS" },
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
                  className={`mb-1 flex h-10 w-full items-center gap-2.5 rounded-md px-3 text-left text-[13px] font-medium ${
                    tab === item.id ? "bg-[#3b82f6] text-white" : "text-slate-700 hover:bg-slate-50"
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
            <button
              type="button"
              title="Lưu"
              onClick={markSaved}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-[#3b82f6] text-white hover:bg-[#2563eb]"
            >
              {tab === "accounts" ? <FileIcon /> : <SaveIcon />}
            </button>
          </div>

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
              onUtility={setUtility}
              meters={visibleMeters}
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
              onUtility={setUtility}
              applyDate={applyDate}
              onApplyDate={setApplyDate}
              slots={slots}
              onSlots={setSlots}
            />
          ) : null}

          {tab === "alerts" ? (
            <AlertsPanel
              classify={classify}
              onClassify={setClassify}
              tags={tags}
              activeTag={activeTag}
              onActive={setActiveTag}
              onRemoveTag={(tag) => {
                setTags((list) => list.filter((item) => item !== tag));
                if (activeTag === tag) setActiveTag(tags.find((item) => item !== tag) ?? "");
              }}
              onAddTag={() => {
                const next = `Mới ${tags.length + 1}`;
                setTags((list) => [...list, next]);
                setActiveTag(next);
              }}
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
              accounts={accounts}
              adding={adding}
              onAdding={setAdding}
              onAdd={(row) => {
                setAccounts((list) => [...list, row]);
                setAdding(false);
              }}
              onRemove={(id) => setAccounts((list) => list.filter((item) => item.id !== id))}
            />
          ) : null}

          {tab !== "accounts" ? (
            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setMeters(INITIAL_METERS);
                  setSlots(INITIAL_SLOTS);
                  setAccounts(INITIAL_ACCOUNTS);
                }}
                className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={markSaved}
                className="h-10 rounded-md bg-[#2563eb] px-4 text-sm font-medium text-white hover:bg-[#1d4ed8]"
              >
                Lưu cấu hình
              </button>
            </div>
          ) : null}
          {saved ? <p className="mt-3 text-right text-[12px] font-medium text-emerald-600">Đã lưu cấu hình</p> : null}
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
        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#3b82f6]"
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
            className="h-10 w-full max-w-xs rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#3b82f6]"
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
            className="h-10 w-full max-w-sm rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#3b82f6]"
          />
        </Field>
        <Field n={8} title="Mật khẩu" hint="Mật khẩu bảo mật cho tài khoản hệ thống (đã mã hóa)">
          <input
            type="password"
            value={password}
            onChange={(e) => onPassword(e.target.value)}
            className="h-10 w-full max-w-sm rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#3b82f6]"
          />
        </Field>
        <Field n={5} title="Ngôn ngữ hệ thống" hint="Ngôn ngữ hiển thị trên toàn bộ giao diện quản trị">
          <select
            value={language}
            onChange={(e) => onLanguage(e.target.value)}
            className="h-10 min-w-[180px] rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#3b82f6]"
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
                className={`h-9 px-4 text-[13px] font-medium ${
                  theme === item ? "bg-[#3b82f6] text-white" : "bg-white text-slate-500 hover:bg-slate-50"
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
  onUtility,
  meters,
  onMetersChange,
}: {
  utility: Utility;
  onUtility: (v: Utility) => void;
  meters: Meter[];
  onMetersChange: (rows: Meter[]) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{ id: string; position: DropPosition } | null>(null);

  const depthMap = useMemo(() => buildDepthMap(meters), [meters]);

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

  return (
    <div>
      <UtilityTabs value={utility} onChange={onUtility} />
      <p className="mt-3 text-[12px] text-slate-500">
        Kéo thả để sắp xếp thứ tự. Thả vào giữa dòng để đặt làm điểm đo con.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wide text-slate-400">
              <th className="py-2 font-semibold">TÊN ĐIỂM ĐO</th>
              <th className="py-2 font-semibold">MÃ ID</th>
              <th className="py-2 font-semibold">LOẠI THIẾT BỊ</th>
              <th className="py-2 text-right font-semibold">THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {meters.map((item) => {
              const depth = depthMap.get(item.id) ?? 0;
              const isDragging = dragId === item.id;
              const hint = dropHint?.id === item.id ? dropHint.position : null;
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
                    if (isDescendant(meters, dragId, item.id)) return;
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
                      ? "bg-[#eef5ff] ring-1 ring-inset ring-[#3b82f6]/30"
                      : hint
                        ? "bg-slate-50"
                        : "hover:bg-slate-50/70"
                  }`}
                >
                  <td className="relative py-3">
                    {hint === "before" ? (
                      <span className="absolute inset-x-0 top-0 h-0.5 bg-[#3b82f6]" />
                    ) : null}
                    {hint === "after" ? (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#3b82f6]" />
                    ) : null}
                    <span className="inline-flex items-center gap-2" style={{ paddingLeft: depth * 22 }}>
                      <span className="cursor-grab active:cursor-grabbing">
                        <DragHandle />
                      </span>
                      {depth > 0 ? <span className="text-slate-300">↳</span> : null}
                      <span className="font-medium">{item.name}</span>
                      {hint === "child" ? (
                        <span className="rounded bg-[#dbeafe] px-1.5 py-0.5 text-[10px] font-semibold text-[#2563eb]">
                          Làm con
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500">{item.code}</td>
                  <td className="py-3">{item.type}</td>
                  <td className="py-3">
                    <span className="flex justify-end gap-1 text-slate-400">
                      {depth > 0 && depth < 2 ? (
                        <IconBtn label="Xem">
                          <EyeIcon />
                        </IconBtn>
                      ) : null}
                      <IconBtn label="Chi tiết">
                        <ListIcon />
                      </IconBtn>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function orderMetersByTree(meters: Meter[]) {
  const byParent = new Map<string | null, Meter[]>();
  for (const meter of meters) {
    const key = meter.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(meter);
  }
  for (const group of byParent.values()) {
    group.sort((a, b) => meters.indexOf(a) - meters.indexOf(b));
  }

  const ordered: Meter[] = [];
  function walk(parentId: string | null) {
    for (const meter of byParent.get(parentId) ?? []) {
      ordered.push(meter);
      walk(meter.id);
    }
  }
  walk(null);
  return ordered;
}

function buildDepthMap(meters: Meter[]) {
  const map = new Map<string, Meter>(meters.map((meter) => [meter.id, meter]));
  const depths = new Map<string, number>();

  function depthFor(id: string): number {
    if (depths.has(id)) return depths.get(id)!;
    const meter = map.get(id);
    if (!meter?.parentId || !map.has(meter.parentId)) {
      depths.set(id, 0);
      return 0;
    }
    const next = depthFor(meter.parentId) + 1;
    depths.set(id, next);
    return next;
  }

  for (const meter of meters) depthFor(meter.id);
  return depths;
}

function isDescendant(meters: Meter[], ancestorId: string, nodeId: string) {
  const map = new Map(meters.map((meter) => [meter.id, meter]));
  let current = map.get(nodeId);
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = map.get(current.parentId);
  }
  return false;
}

function findChildInsertIndex(ordered: Meter[], parentId: string) {
  const parentIndex = ordered.findIndex((meter) => meter.id === parentId);
  if (parentIndex < 0) return ordered.length;

  const parentDepth = buildDepthMap(ordered).get(parentId) ?? 0;
  let index = parentIndex + 1;
  const depths = buildDepthMap(ordered);
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
  if (isDescendant(meters, dragId, targetId)) return null;

  const drag = meters.find((meter) => meter.id === dragId);
  const target = meters.find((meter) => meter.id === targetId);
  if (!drag || !target) return null;

  const ordered = orderMetersByTree(meters);
  const without = ordered.filter((meter) => meter.id !== dragId);
  const depths = buildDepthMap(without);
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
    const depth = buildDepthMap(next).get(meter.id) ?? 0;
    if (depth > 2) return null;
  }

  return next;
}

function CostPanel({
  utility,
  onUtility,
  applyDate,
  onApplyDate,
  slots,
  onSlots,
}: {
  utility: Utility;
  onUtility: (v: Utility) => void;
  applyDate: string;
  onApplyDate: (v: string) => void;
  slots: Slot[];
  onSlots: (rows: Slot[]) => void;
}) {
  return (
    <div>
      <UtilityTabs value={utility} onChange={onUtility} />
      <div className="mt-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
        <div>
          <p className="text-[15px] font-semibold text-slate-800">Ngày bắt đầu áp dụng</p>
          <p className="mt-1 text-[12px] text-slate-500">Thời gian chi phí mới bắt đầu có hiệu lực trong hệ thống</p>
        </div>
        <DateInput value={applyDate} onChange={onApplyDate} />
      </div>
      <div className="mt-5">
        <p className="text-[15px] font-semibold text-slate-800">Giá điện theo khung giờ</p>
        <p className="mt-1 text-[12px] text-slate-500">Cấu hình đơn giá cho từng khung giờ tiêu thụ (VNĐ/kWh)</p>
        <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
          <div className="grid grid-cols-[1.2fr_1.2fr_1fr_40px] bg-slate-50 px-4 py-2 text-[11px] font-semibold tracking-wide text-slate-400">
            <span>TÊN KHUNG GIỜ</span>
            <span>KHOẢNG THỜI GIAN</span>
            <span>ĐƠN GIÁ (VNĐ/KWH)</span>
            <span />
          </div>
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="grid grid-cols-[1.2fr_1.2fr_1fr_40px] items-center gap-2 border-t border-slate-100 px-4 py-3"
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <span className="h-8 w-1 rounded-full" style={{ backgroundColor: slot.color }} />
                {slot.name}
              </span>
              <span className="flex items-center gap-2">
                <input
                  type="time"
                  value={slot.from}
                  onChange={(e) =>
                    onSlots(slots.map((item) => (item.id === slot.id ? { ...item, from: e.target.value } : item)))
                  }
                  className="h-9 w-[108px] rounded-md border border-slate-200 px-2 text-sm"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="time"
                  value={slot.to}
                  onChange={(e) =>
                    onSlots(slots.map((item) => (item.id === slot.id ? { ...item, to: e.target.value } : item)))
                  }
                  className="h-9 w-[108px] rounded-md border border-slate-200 px-2 text-sm"
                />
              </span>
              <span className="relative">
                <input
                  value={slot.price}
                  onChange={(e) =>
                    onSlots(slots.map((item) => (item.id === slot.id ? { ...item, price: e.target.value } : item)))
                  }
                  className="h-9 w-full rounded-md border border-slate-200 pr-12 pl-3 text-sm font-semibold"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-slate-400">
                  VNĐ
                </span>
              </span>
              <button
                type="button"
                title="Xóa"
                onClick={() => onSlots(slots.filter((item) => item.id !== slot.id))}
                className="flex h-8 w-8 items-center justify-center text-slate-400 hover:text-red-500"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            onSlots([
              ...slots,
              {
                id: `s${Date.now()}`,
                name: `Khung giờ ${slots.length + 1}`,
                color: "#64748b",
                from: "00:00",
                to: "01:00",
                price: "0",
              },
            ])
          }
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 text-sm font-medium text-slate-500 hover:bg-slate-50"
        >
          + Thêm khung giờ
        </button>
      </div>
    </div>
  );
}

function AlertsPanel({
  classify,
  onClassify,
  tags,
  activeTag,
  onActive,
  onRemoveTag,
  onAddTag,
  threshold,
  onThreshold,
  dailyLimit,
  onDailyLimit,
  peakWarn,
  onPeakWarn,
}: {
  classify: string;
  onClassify: (v: string) => void;
  tags: string[];
  activeTag: string;
  onActive: (v: string) => void;
  onRemoveTag: (v: string) => void;
  onAddTag: () => void;
  threshold: string;
  onThreshold: (v: string) => void;
  dailyLimit: number;
  onDailyLimit: (v: number) => void;
  peakWarn: boolean;
  onPeakWarn: (v: boolean) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-slate-400">PHÂN LOẠI</p>
      <select
        value={classify}
        onChange={(e) => onClassify(e.target.value)}
        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#3b82f6]"
      >
        <option>Thông tin chung (Info)</option>
        <option>Ngưỡng vận hành</option>
      </select>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {tags.map((tag) => {
          const active = tag === activeTag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onActive(tag)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium ${
                active ? "bg-[#3b82f6] text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {tag}
              <span
                role="presentation"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTag(tag);
                }}
                className="text-[11px] opacity-70 hover:opacity-100"
              >
                ×
              </span>
            </button>
          );
        })}
        <button type="button" onClick={onAddTag} className="text-[12px] font-semibold text-[#3b82f6] hover:underline">
          + Thêm mới
        </button>
      </div>
      <div className="mt-2 divide-y divide-slate-100">
        <Field title="Over-consumption threshold" hint="Ngưỡng tiêu thụ vượt mức cho phép (kWh)">
          <input
            value={threshold}
            onChange={(e) => onThreshold(e.target.value)}
            className="h-10 w-28 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#3b82f6]"
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
              className={`relative h-6 w-11 rounded-full ${peakWarn ? "bg-[#3b82f6]" : "bg-slate-300"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${peakWarn ? "left-5.5" : "left-0.5"}`}
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
  accounts,
  adding,
  onAdding,
  onAdd,
  onRemove,
}: {
  accounts: AccountRow[];
  adding: boolean;
  onAdding: (v: boolean) => void;
  onAdd: (row: AccountRow) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState({ username: "", fullName: "", role: "Người xem", email: "" });
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-slate-800">Danh sách tài khoản phụ</h3>
        <button
          type="button"
          onClick={() => onAdding(true)}
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#3b82f6] px-3.5 text-sm font-medium text-white hover:bg-[#2563eb]"
        >
          <UserPlusIcon />
          + Thêm mới tài khoản
        </button>
      </div>
      {adding ? (
        <div className="mb-4 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (!draft.username || !draft.email) return;
                onAdd({
                  id: `a${Date.now()}`,
                  username: draft.username,
                  fullName: draft.fullName || draft.username,
                  role: draft.role,
                  email: draft.email,
                  status: "Đang hoạt động",
                });
                setDraft({ username: "", fullName: "", role: "Người xem", email: "" });
              }}
              className="h-9 rounded-md bg-[#3b82f6] px-3 text-sm text-white"
            >
              Thêm
            </button>
            <button type="button" onClick={() => onAdding(false)} className="h-9 rounded-md border px-3 text-sm">
              Hủy
            </button>
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wide text-slate-400">
              <th className="py-2">TÊN NGƯỜI DÙNG / HỌ TÊN</th>
              <th className="py-2">VAI TRÒ</th>
              <th className="py-2">EMAIL</th>
              <th className="py-2">TRẠNG THÁI</th>
              <th className="py-2 text-right">THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((row) => (
              <tr key={row.id} className="border-b border-slate-50">
                <td className="py-3">
                  <p className="font-medium text-slate-800">{row.username}</p>
                  <p className="text-[12px] text-slate-500">{row.fullName}</p>
                </td>
                <td className="py-3 text-slate-600">{row.role}</td>
                <td className="py-3 text-slate-600">{row.email}</td>
                <td className="py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      row.status === "Đang hoạt động" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="py-3">
                  <span className="flex justify-end gap-1 text-slate-400">
                    <IconBtn label="Sửa">
                      <PencilIcon />
                    </IconBtn>
                    <IconBtn label="Xóa" onClick={() => onRemove(row.id)}>
                      <TrashIcon />
                    </IconBtn>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UtilityTabs({ value, onChange }: { value: Utility; onChange: (v: Utility) => void }) {
  return (
    <div className="flex gap-5 border-b border-slate-200">
      {UTILITIES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`h-10 text-[14px] font-medium ${
            value === item ? "border-b-2 border-[#3b82f6] text-[#3b82f6]" : "text-slate-400 hover:text-slate-600"
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
  const label = y && m && d ? `${m}/${d}/${y}` : value;
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

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M5 7h14M10 7V5h4v2M8 7v12h8V7" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
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
