"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";

type ScopeId = 1 | 2 | 3;
type InputMethod = "meter" | "manual" | "file";

type EmissionFactor = {
  id: string;
  name: string;
  value: number;
  unit: string;
  kind: "electric" | "petrol" | "diesel" | "lpg";
};

type EmissionSource = {
  id: string;
  scope: ScopeId;
  name: string;
  method: InputMethod;
  factorId: string;
  factorValue: number;
  formula: string;
  appliedAt: string;
};

const SCOPES: { id: ScopeId; label: string }[] = [
  { id: 1, label: "Phạm vi 1" },
  { id: 2, label: "Phạm vi 2" },
  { id: 3, label: "Phạm vi 3" },
];

const METHODS: { id: InputMethod; label: string; hint: string }[] = [
  { id: "meter", label: "Chọn từ điểm đo", hint: "Lấy số liệu realtime" },
  { id: "manual", label: "Nhập thủ công", hint: "Nhập khối lượng nhiên liệu" },
  { id: "file", label: "Tải file", hint: "CSV / Excel phát thải" },
];

const FACTORS: EmissionFactor[] = [
  { id: "grid-2024", name: "Điện lưới 2024", value: 0.522, unit: "kg CO₂e / kWh", kind: "electric" },
  { id: "ron95", name: "Xăng RON 95", value: 2.312, unit: "kg CO₂e / Litre", kind: "petrol" },
  { id: "diesel", name: "Dầu Diesel", value: 2.68, unit: "kg CO₂e / Litre", kind: "diesel" },
  { id: "lpg", name: "Khí LPG", value: 1.65, unit: "kg CO₂e / kg", kind: "lpg" },
];

const METHOD_LABEL: Record<InputMethod, string> = {
  meter: "Điểm đo",
  manual: "Thủ công",
  file: "Tải file",
};

function formatFactor(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

const initialSources: EmissionSource[] = [
  {
    id: "src-1",
    scope: 1,
    name: "Tiêu thụ điện Xưởng A",
    method: "meter",
    factorId: "grid-2024",
    factorValue: 0.7221,
    formula: "{Giá trị điểm đo} * {Hệ số phát thải}",
    appliedAt: "2024-01-01",
  },
  {
    id: "src-2",
    scope: 1,
    name: "Máy phát Diesel dự phòng",
    method: "manual",
    factorId: "diesel",
    factorValue: 2.68,
    formula: "{Giá trị thủ công} * {Hệ số phát thải}",
    appliedAt: "2024-01-01",
  },
  {
    id: "src-3",
    scope: 2,
    name: "Điện lưới mua ngoài",
    method: "meter",
    factorId: "grid-2024",
    factorValue: 0.522,
    formula: "{Giá trị điểm đo} * {Hệ số phát thải}",
    appliedAt: "2024-03-01",
  },
  {
    id: "src-4",
    scope: 3,
    name: "Vận tải hàng hóa đầu vào",
    method: "file",
    factorId: "ron95",
    factorValue: 2.312,
    formula: "{Giá trị điểm đo} * {Hệ số phát thải}",
    appliedAt: "2024-02-15",
  },
];

export function GhgConfig() {
  const [activeScope, setActiveScope] = useState<ScopeId>(1);
  const [tableFilter, setTableFilter] = useState<"all" | ScopeId>(1);
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<EmissionSource[]>(initialSources);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dropHover, setDropHover] = useState(false);
  const formulaRef = useRef<HTMLTextAreaElement>(null);

  const [name, setName] = useState("");
  const [method, setMethod] = useState<InputMethod>("meter");
  const [factorId, setFactorId] = useState("");
  const [formula, setFormula] = useState("{Giá trị điểm đo} * {Hệ số phát thải}");
  const [factorValue, setFactorValue] = useState("0.7221");
  const [appliedAt, setAppliedAt] = useState("2024-01-01");

  const filteredFactors = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FACTORS;
    return FACTORS.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.unit.toLowerCase().includes(q),
    );
  }, [query]);

  const visibleSources = useMemo(
    () =>
      tableFilter === "all"
        ? sources
        : sources.filter((item) => item.scope === tableFilter),
    [sources, tableFilter],
  );

  function applyFactor(factor: EmissionFactor) {
    setFactorId(factor.id);
    setFactorValue(String(factor.value));
    setFormula((current) =>
      current.includes("{Hệ số phát thải}")
        ? current
        : `${current || "{Giá trị điểm đo}"} * {Hệ số phát thải}`,
    );
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setMethod("meter");
    setFactorId("");
    setFormula("{Giá trị điểm đo} * {Hệ số phát thải}");
    setFactorValue("0.7221");
    setAppliedAt("2024-01-01");
  }

  function insertToken(token: string) {
    const el = formulaRef.current;
    if (!el) {
      setFormula((current) => `${current}${current ? " " : ""}${token}`);
      return;
    }
    const start = el.selectionStart ?? formula.length;
    const end = el.selectionEnd ?? formula.length;
    const next = `${formula.slice(0, start)}${token}${formula.slice(end)}`;
    setFormula(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + token.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const parsed = Number(factorValue);
    const next: EmissionSource = {
      id: editingId ?? `src-${Date.now()}`,
      scope: activeScope,
      name: trimmed,
      method,
      factorId: factorId || "grid-2024",
      factorValue: Number.isFinite(parsed) ? parsed : 0,
      formula,
      appliedAt,
    };
    setSources((current) =>
      editingId
        ? current.map((item) => (item.id === editingId ? next : item))
        : [next, ...current],
    );
    setTableFilter(activeScope);
    resetForm();
  }

  function handleEdit(source: EmissionSource) {
    setEditingId(source.id);
    setActiveScope(source.scope);
    setName(source.name);
    setMethod(source.method);
    setFactorId(source.factorId);
    setFormula(source.formula);
    setFactorValue(String(source.factorValue));
    setAppliedAt(source.appliedAt);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {SCOPES.map((scope) => {
          const active = activeScope === scope.id;
          return (
            <div
              key={scope.id}
              className={`inline-flex h-9 items-center rounded-lg pl-3.5 text-sm font-medium ${
                active
                  ? "bg-[#1a73e8] text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              <button type="button" onClick={() => setActiveScope(scope.id)} className="pr-1">
                {scope.label}
              </button>
              <span
                className={`px-2 text-base leading-none ${active ? "text-white/80" : "text-slate-400"}`}
                aria-hidden
              >
                ×
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setDropHover(true);
          }}
          onDragLeave={() => setDropHover(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDropHover(false);
            const id = e.dataTransfer.getData("text/plain");
            const factor = FACTORS.find((item) => item.id === id);
            if (factor) applyFactor(factor);
          }}
          className={`rounded-xl border bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${
            dropHover ? "border-[#1a73e8] ring-2 ring-[#1a73e8]/15" : "border-slate-200"
          }`}
        >
          <div className="mb-5 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f1fd] text-[#1a73e8]">
              <LeafIcon className="h-4 w-4" />
            </span>
            <h2 className="text-[15px] font-semibold text-slate-800">
              Thiết lập Nguồn phát thải &amp; Hệ số
            </h2>
          </div>

          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <Field label="TÊN NGUỒN PHÁT THẢI">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Tiêu thụ điện sản xuất - Xưởng A"
                className="input"
              />
            </Field>

            <fieldset>
              <legend className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500">
                PHƯƠNG THỨC NHẬP SỐ LIỆU
              </legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {METHODS.map((item) => {
                  const selected = method === item.id;
                  const Icon = methodIcons[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMethod(item.id)}
                      className={`flex flex-col items-start gap-2 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                        selected
                          ? "border-[#1a73e8] bg-[#f3f8ff] text-[#1a73e8] shadow-[inset_0_0_0_1px_#1a73e8]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-[#c5daf7] hover:bg-[#f7fbff]"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          selected ? "bg-white text-[#1a73e8]" : "bg-slate-50 text-slate-500"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{item.label}</span>
                        <span
                          className={`mt-0.5 block text-[11px] ${
                            selected ? "text-[#5b9cf0]" : "text-slate-400"
                          }`}
                        >
                          {item.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <Field label="LỰA CHỌN HỆ SỐ PHÁT THẢI">
              <div className="relative">
                <select
                  value={factorId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setFactorId(nextId);
                    const factor = FACTORS.find((item) => item.id === nextId);
                    if (factor) setFactorValue(String(factor.value));
                  }}
                  className="input appearance-none pr-9"
                >
                  <option value="">Chọn hệ số từ thư viện</option>
                  {FACTORS.map((factor) => (
                    <option key={factor.id} value={factor.id}>
                      {factor.name} — {factor.value} {factor.unit}
                    </option>
                  ))}
                </select>
                <ChevronIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </Field>

            <Field label="NHẬP CÔNG THỨC TÍNH (KG CO₂E)">
              <div className="overflow-hidden rounded-lg border border-slate-200 focus-within:border-[#1a73e8] focus-within:ring-2 focus-within:ring-[#1a73e8]/15">
                <textarea
                  ref={formulaRef}
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  rows={4}
                  placeholder="{Giá trị điểm đo} * {Hệ số phát thải}"
                  className="w-full resize-none bg-white px-3 pt-3 pb-2 font-mono text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
                <div className="flex justify-end gap-2 px-3 pb-3">
                  <button
                    type="button"
                    onClick={() => insertToken("{Giá trị điểm đo}")}
                    className="rounded-md bg-[#e8f1fd] px-2 py-1 font-mono text-[11px] font-semibold text-[#1a73e8] hover:bg-[#d7e8fb]"
                  >
                    [Điểm đo]
                  </button>
                  <button
                    type="button"
                    onClick={() => insertToken("{Hệ số phát thải}")}
                    className="rounded-md bg-[#e8f1fd] px-2 py-1 font-mono text-[11px] font-semibold text-[#1a73e8] hover:bg-[#d7e8fb]"
                  >
                    [Hệ số]
                  </button>
                </div>
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="GIÁ TRỊ HỆ SỐ ÁP DỤNG">
                <input
                  value={factorValue}
                  onChange={(e) => setFactorValue(e.target.value)}
                  inputMode="decimal"
                  className="input font-mono"
                />
              </Field>
              <Field label="NGÀY ÁP DỤNG">
                <input
                  type="date"
                  value={appliedAt}
                  onChange={(e) => setAppliedAt(e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1a73e8] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#1666d0]"
              >
                <SaveIcon className="h-4 w-4" />
                {editingId ? "Cập nhật cấu hình" : "Lưu cấu hình"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="text-sm font-medium text-slate-500 hover:text-slate-700 hover:underline"
              >
                Hủy bỏ
              </button>
            </div>
          </form>
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:sticky lg:top-6">
          <h2 className="mb-4 text-[13px] font-semibold tracking-wide text-slate-700 uppercase">
            Thư viện hệ số phát thải
          </h2>

          <label className="relative mb-4 flex items-center">
            <span className="pointer-events-none absolute left-3 text-slate-400">
              <SearchIcon className="h-4 w-4" />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm hệ số..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-[#f8fafc] pr-3 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-[#1a73e8] focus:bg-white"
            />
          </label>

          <ul className="space-y-2">
            {filteredFactors.map((factor) => {
              const Icon = factorIcons[factor.kind];
              return (
                <li key={factor.id}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", factor.id);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => applyFactor(factor)}
                    className="flex w-full items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-3 text-left hover:border-[#c5daf7] hover:bg-[#f7fbff]"
                  >
                    <GripIcon className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f1fd] text-[#1a73e8]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {factor.name}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {factor.value} {factor.unit}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {filteredFactors.length === 0 && (
              <li className="py-6 text-center text-sm text-slate-400">Không tìm thấy hệ số</li>
            )}
          </ul>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
            Kéo thả thẻ vào form để tự động điền thông tin
          </p>
        </aside>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-slate-800">
            Danh sách nguồn phát thải đã thêm
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={tableFilter === "all"} onClick={() => setTableFilter("all")}>
              Tất cả
            </FilterChip>
            {SCOPES.map((scope) => (
              <FilterChip
                key={scope.id}
                active={tableFilter === scope.id}
                onClick={() => setTableFilter(scope.id)}
              >
                {scope.label}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wide text-slate-400">
                <th className="px-5 py-3">PHẠM VI</th>
                <th className="px-5 py-3">TÊN NGUỒN PHÁT THẢI</th>
                <th className="px-5 py-3">PHƯƠNG THỨC</th>
                <th className="px-5 py-3">GIÁ TRỊ HỆ SỐ</th>
                <th className="px-5 py-3 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {visibleSources.map((source) => {
                const MethodIcon = methodIcons[source.method];
                return (
                  <tr
                    key={source.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-md bg-[#e8f1fd] px-2 py-1 text-xs font-semibold text-[#1a73e8]">
                        Scope {source.scope}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{source.name}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-2 text-slate-600">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-50 text-slate-500">
                          <MethodIcon className="h-3.5 w-3.5" />
                        </span>
                        {METHOD_LABEL[source.method]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-800">
                      {formatFactor(source.factorValue)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(source)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-[#1a73e8]"
                          aria-label={`Chỉnh sửa ${source.name}`}
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSources((current) => current.filter((item) => item.id !== source.id))
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
                          aria-label={`Xóa ${source.name}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleSources.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                    Chưa có nguồn phát thải trong phạm vi này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 rounded-full px-3 text-sm font-medium ${
        active
          ? "bg-[#1a73e8] text-white"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

const methodIcons: Record<InputMethod, (props: { className?: string }) => ReactNode> = {
  meter: GaugeIcon,
  manual: KeyboardIcon,
  file: UploadIcon,
};

const factorIcons: Record<
  EmissionFactor["kind"],
  (props: { className?: string }) => ReactNode
> = {
  electric: BoltIcon,
  petrol: FuelIcon,
  diesel: DropIcon,
  lpg: FlameIcon,
};

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 18c2.5-1 4-3.2 4-6 0-2.2-1.2-3.8-2-4 1.8.2 4.5 1.8 4.5 5.2 0 1.7-.6 3-1.4 4.1C10.8 13.8 13 11 13 8c0-2-.8-3.5-1.6-4.2 2.4.6 5.6 3 5.6 7.4 0 4.4-3.4 7.8-8.8 8.8H4v-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
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

function KeyboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="7" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M7 11h.01M11 11h.01M15 11h.01M17 14H7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5M12 4v11M8 8l4-4 4 4"
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
      <path
        d="M7 10l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function GripIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="5" cy="4" r="1.1" />
      <circle cx="11" cy="4" r="1.1" />
      <circle cx="5" cy="8" r="1.1" />
      <circle cx="11" cy="8" r="1.1" />
      <circle cx="5" cy="12" r="1.1" />
      <circle cx="11" cy="12" r="1.1" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 4.5 13.5h6.2L9.2 22 19.5 10h-6.2L13 2Z" />
    </svg>
  );
}

function FuelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="10" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M14 8h2.5a2 2 0 0 1 2 2V16a2 2 0 0 0 2 2M7 8h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DropIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3c1.5 3 5 5.2 5 10a5 5 0 1 1-10 0c0-2 1-4.2 2.2-6C10 9 11 10.5 12 10.5c0-2.2.5-5 0-7.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 5h11l3 3v11H5V5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8 5v5h8V5M8 19v-5h8v5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 17.5V20h2.5L18 8.5 15.5 6 4 17.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M13.8 7.7 16.3 10.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 7h14M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M8 7l.7 12.2A1.5 1.5 0 0 0 10.2 21h3.6a1.5 1.5 0 0 0 1.5-1.8L16 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
