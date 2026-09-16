"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  flattenFactorGroups,
  formatFactorValue,
  hydrateFactorGroups,
  INITIAL_FACTOR_GROUPS,
  loadFactorGroups,
  type GasKey,
  type LibraryFactor,
} from "@/lib/emission-factors";
import {
  GHG_SCOPES,
  hydrateGhgSources,
  INITIAL_GHG_SOURCES,
  loadGhgSources,
  saveGhgSources,
  type GhgEmissionSource,
  type GhgInputMethod,
  type ScopeId,
} from "@/lib/ghg-sources";
import {
  hydrateClientMeters,
  loadClientMeters,
  type ClientMeter,
} from "@/lib/client-meters";

type InputMethod = GhgInputMethod;
type EmissionSource = GhgEmissionSource;

const SCOPES = GHG_SCOPES.map((item) => ({ id: item.id, label: item.label }));

const METHODS: { id: InputMethod; label: string; hint: string }[] = [
  { id: "meter", label: "Chọn từ điểm đo", hint: "Lấy số liệu realtime" },
  { id: "manual", label: "Nhập thủ công", hint: "Nhập khối lượng nhiên liệu" },
  { id: "file", label: "Tải file", hint: "CSV / Excel phát thải" },
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

type FactorHistoryRow = {
  id: string;
  label: string;
  value: number;
  unit: string;
  validFrom: string;
  validTo: string;
};

const initialSources: EmissionSource[] = INITIAL_GHG_SOURCES;

export function GhgConfig({ projectId }: { projectId: string }) {
  const [activeScope, setActiveScope] = useState<ScopeId>(1);
  const [tableFilter, setTableFilter] = useState<ScopeId>(1);
  const [query, setQuery] = useState("");
  const [factors, setFactors] = useState<LibraryFactor[]>(() =>
    flattenFactorGroups(INITIAL_FACTOR_GROUPS),
  );
  const [sources, setSources] = useState<EmissionSource[]>(initialSources);
  const [sourcesProjectId, setSourcesProjectId] = useState<string | null>(null);
  const [meters, setMeters] = useState<ClientMeter[]>([]);
  const [metersProjectId, setMetersProjectId] = useState<string | null>(null);
  const metersLoading = metersProjectId !== projectId;
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dropHover, setDropHover] = useState(false);
  const formulaRef = useRef<HTMLTextAreaElement>(null);

  const [name, setName] = useState("");
  const [method, setMethod] = useState<InputMethod>("meter");
  const [meterPointId, setMeterPointId] = useState("");
  const [factorId, setFactorId] = useState("");
  const [formula, setFormula] = useState("{Giá trị điểm đo} * {Hệ số phát thải}");
  const [appliedAt, setAppliedAt] = useState("2024-01-01");
  const [formError, setFormError] = useState("");

  const selectedMeter = useMemo(
    () => meters.find((meter) => meter.id === meterPointId),
    [meters, meterPointId],
  );
  const selectedFactor = useMemo(
    () => factors.find((factor) => factor.id === factorId),
    [factors, factorId],
  );
  const factorHistoryRows = useMemo<FactorHistoryRow[]>(() => {
    if (!selectedFactor) return [];
    return [
      {
        id: selectedFactor.id,
        label: `${selectedFactor.name} · ${selectedFactor.gasLabel}`,
        value: selectedFactor.value,
        unit: selectedFactor.unit,
        validFrom: appliedAt,
        validTo: "Đang áp dụng",
      },
    ];
  }, [appliedAt, selectedFactor]);

  function handleMethodChange(nextMethod: InputMethod) {
    setMethod(nextMethod);
    if (nextMethod === "meter") {
      const meter = meters.find((item) => item.id === meterPointId);
      setName(meter?.name ?? "");
      setFormula("{Giá trị điểm đo} * {Hệ số phát thải}");
    } else if (nextMethod === "manual") {
      setFormula("{Giá trị thủ công} * {Hệ số phát thải}");
    }
    setFormError("");
  }

  useEffect(() => {
    let active = true;
    void hydrateClientMeters(projectId)
      .then((rows) => {
        if (active) {
          setMeters(rows);
          setMetersProjectId(projectId);
        }
      })
      .catch(() => {
        if (active) {
          setMeters(loadClientMeters(projectId));
          setMetersProjectId(projectId);
        }
      });
    void Promise.all([hydrateFactorGroups(), hydrateGhgSources(projectId)]).then(([groups, sources]) => {
      if (!active) return;
      setFactors(flattenFactorGroups(groups));
      setSources(sources);
      setSourcesProjectId(projectId);
    }).catch(() => {
      if (!active) return;
      setFactors(flattenFactorGroups(loadFactorGroups()));
      setSources(loadGhgSources());
      setSourcesProjectId(projectId);
    });
    if (window.location.hash === "#them-nguon-phat-thai") {
      const url = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, "", url);
    }
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (sourcesProjectId !== projectId || editingId) return;
    const requestedId = new URLSearchParams(window.location.search).get("edit");
    if (!requestedId) return;
    const source = sources.find((item) => item.id === requestedId);
    if (!source) return;

    handleEdit(source);
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [editingId, projectId, sources, sourcesProjectId]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("ems-ghg-form-open", { detail: formOpen }));
  }, [formOpen]);

  useEffect(() => {
    function startNewSource() {
      setEditingId(null);
      setName("");
      setMethod("meter");
      setMeterPointId("");
      setFactorId("");
      setFormula("{Giá trị điểm đo} * {Hệ số phát thải}");
      setAppliedAt("2024-01-01");
      setFormError("");
      setTableFilter((current) => {
        setActiveScope(current);
        return current;
      });
      setFormOpen(true);
    }
    window.addEventListener("ems-ghg-open-form", startNewSource);
    return () => window.removeEventListener("ems-ghg-open-form", startNewSource);
  }, []);

  function persistSources(next: EmissionSource[]) {
    const withProject = next.map((source) => ({ ...source, projectId }));
    setSources(withProject);
    saveGhgSources(withProject, projectId);
  }

  const filteredFactors = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return factors;
    return factors.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q) ||
        item.gasLabel.toLowerCase().includes(q) ||
        item.unit.toLowerCase().includes(q),
    );
  }, [factors, query]);

  const visibleSources = useMemo(
    () => sources.filter((item) => item.scope === tableFilter),
    [sources, tableFilter],
  );

  function applyFactor(factor: LibraryFactor) {
    setFactorId(factor.id);
    setFormula((current) =>
      current.includes("{Hệ số phát thải}")
        ? current
        : `${current || "{Giá trị điểm đo}"} * {Hệ số phát thải}`,
    );
  }

  function closeForm() {
    setEditingId(null);
    setName("");
    setMethod("meter");
    setMeterPointId("");
    setFactorId("");
    setFormula("{Giá trị điểm đo} * {Hệ số phát thải}");
    setAppliedAt("2024-01-01");
    setFormError("");
    setFormOpen(false);
  }

  function handleCancel() {
    closeForm();
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
    if (!trimmed) {
      setFormError("Vui lòng nhập tên nguồn phát thải.");
      return;
    }
    if (method === "meter" && !meterPointId) {
      setFormError("Vui lòng chọn điểm đo cho nguồn phát thải.");
      return;
    }
    if (!factorId || !selectedFactor) {
      setFormError("Vui lòng chọn hệ số phát thải từ thư viện.");
      return;
    }
    const parsed = selectedFactor.value;
    const existing = editingId ? sources.find((item) => item.id === editingId) : undefined;
    const next: EmissionSource = {
      ...existing,
      id: existing?.id ?? `src-${Date.now()}`,
      scope: activeScope,
      name: trimmed,
      method,
      factorId: factorId || existing?.factorId || factors[0]?.id || "",
      factorValue: Number.isFinite(parsed) ? parsed : 0,
      formula,
      appliedAt,
      meterPointId: method === "meter" ? meterPointId : undefined,
    };
    persistSources(
      editingId
        ? sources.map((item) => (item.id === editingId ? next : item))
        : [next, ...sources],
    );
    setTableFilter(activeScope);
    closeForm();
  }

  function handleEdit(source: EmissionSource) {
    setEditingId(source.id);
    setActiveScope(source.scope);
    setTableFilter(source.scope);
    setName(source.name);
    setMethod(source.method);
    setMeterPointId(source.meterPointId ?? "");
    setFactorId(source.factorId);
    setFormula(source.formula);
    setAppliedAt(source.appliedAt);
    setFormError("");
    setFormOpen(true);
  }

  return (
    <div className="space-y-5">
      {formOpen ? (
      <>
      <div className="flex flex-wrap items-center gap-2">
        {SCOPES.map((scope) => {
          const active = activeScope === scope.id;
          return (
            <div
              key={scope.id}
              className={`inline-flex h-9 items-center rounded-xl pl-3.5 text-sm font-semibold transition-all ${
                active
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900"
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
          id="them-nguon-phat-thai"
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
            const factor = factors.find((item) => item.id === id);
            if (factor) applyFactor(factor);
          }}
          className={`rounded-xl border bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors ${
            dropHover ? "border-emerald-500 ring-2 ring-emerald-500/15" : "border-slate-200"
          }`}
        >
          <div className="mb-5 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shadow-xs">
              <LeafIcon className="h-4 w-4" />
            </span>
            <h2 className="text-[15px] font-semibold text-slate-800">
              {editingId ? "Chỉnh sửa nguồn phát thải" : "Thêm mới nguồn phát thải"}
            </h2>
          </div>

          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <Field label={method === "meter" ? "TÊN NGUỒN PHÁT THẢI (TỰ ĐỘNG)" : "TÊN NGUỒN PHÁT THẢI"}>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (formError) setFormError("");
                }}
                readOnly={method === "meter"}
                placeholder={
                  method === "meter"
                    ? "Tên sẽ tự lấy sau khi chọn điểm đo"
                    : "VD: Tiêu thụ điện sản xuất - Xưởng A"
                }
                className={`input ${method === "meter" ? "bg-slate-50 text-slate-600" : ""}`}
              />
              {method === "meter" ? (
                <p className="mt-1.5 text-xs text-slate-500">
                  Tên nguồn và thông tin điểm đo được tự động lấy từ lựa chọn bên dưới.
                </p>
              ) : null}
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
                      onClick={() => handleMethodChange(item.id)}
                      className={`flex flex-col items-start gap-2 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                        selected
                          ? "border-emerald-600 bg-emerald-50/70 text-emerald-700 shadow-[inset_0_0_0_1px_#059669]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/20"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                          selected ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-50 text-slate-500"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{item.label}</span>
                        <span
                          className={`mt-0.5 block text-[11px] ${
                            selected ? "text-emerald-600 font-medium" : "text-slate-400"
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

            {method === "meter" ? (
              <Field label="CHỌN ĐIỂM ĐO">
                <div className="relative">
                  <select
                    value={meterPointId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setMeterPointId(nextId);
                      const meter = meters.find((item) => item.id === nextId);
                      setName(meter?.name ?? "");
                      if (formError) setFormError("");
                    }}
                    required
                    disabled={metersLoading || meters.length === 0}
                    className="input appearance-none pr-9 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">
                      {metersLoading
                        ? "Đang tải điểm đo..."
                        : meters.length
                          ? "Chọn điểm đo của dự án"
                          : "Dự án chưa có điểm đo"}
                    </option>
                    {meters.map((meter) => (
                      <option key={meter.id} value={meter.id}>
                        {meter.name} · {meter.code} · {meter.utility}
                      </option>
                    ))}
                  </select>
                  <ChevronIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Chọn điểm đo thuộc dự án làm dữ liệu đầu vào cho nguồn phát thải.
                </p>
                {selectedMeter ? (
                  <div className="mt-3 grid gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs sm:grid-cols-3">
                    <div>
                      <span className="block text-slate-500">Mã điểm đo</span>
                      <strong className="mt-0.5 block text-slate-800">{selectedMeter.code}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-500">Loại năng lượng</span>
                      <strong className="mt-0.5 block text-slate-800">{selectedMeter.utility}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-500">Thiết bị</span>
                      <strong className="mt-0.5 block text-slate-800">
                        {selectedMeter.deviceId ? "Đã gắn thiết bị" : "Chưa gắn thiết bị"}
                      </strong>
                    </div>
                  </div>
                ) : null}
              </Field>
            ) : null}

            <Field label="LỰA CHỌN HỆ SỐ PHÁT THẢI">
              <div className="relative">
                <select
                  value={factorId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setFactorId(nextId);
                    if (formError) setFormError("");
                  }}
                  required
                  className="input appearance-none pr-9"
                >
                  <option value="">Chọn hệ số từ thư viện</option>
                  {factors.map((factor) => (
                    <option key={factor.id} value={factor.id}>
                      {factor.name} ({factor.gasLabel}) — {formatFactorValue(factor.value)}{" "}
                      {factor.unit}
                    </option>
                  ))}
                </select>
                <ChevronIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              {selectedFactor ? (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <span className="text-slate-500">Giá trị tự lấy từ thư viện hệ số</span>
                  <strong className="font-mono text-slate-800">
                    {formatFactorValue(selectedFactor.value)} {selectedFactor.unit}
                  </strong>
                </div>
              ) : (
                <p className="mt-1.5 text-xs text-slate-500">
                  Chọn hệ số phù hợp với loại nhiên liệu/năng lượng và đơn vị dữ liệu đầu vào.
                </p>
              )}
            </Field>

            <Field label="NHẬP CÔNG THỨC TÍNH (KG CO₂E)">
              <div className="overflow-hidden rounded-xl border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 transition-all">
                <textarea
                  ref={formulaRef}
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  rows={4}
                  placeholder={`${method === "meter" ? "{Giá trị điểm đo}" : "{Giá trị thủ công}"} * {Hệ số phát thải}`}
                  className="w-full resize-none bg-white px-3 pt-3 pb-2 font-mono text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
                <div className="flex justify-end gap-2 px-3 pb-3">
                  <button
                    type="button"
                    onClick={() =>
                      insertToken(method === "meter" ? "{Giá trị điểm đo}" : "{Giá trị thủ công}")
                    }
                    className="rounded-lg bg-emerald-50 px-2 py-1 font-mono text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    {method === "meter" ? "[Điểm đo]" : "[Giá trị thủ công]"}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertToken("{Hệ số phát thải}")}
                    className="rounded-lg bg-emerald-50 px-2 py-1 font-mono text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    [Hệ số]
                  </button>
                </div>
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="NGÀY BẮT ĐẦU ÁP DỤNG">
                <input
                  type="date"
                  value={appliedAt}
                  onChange={(e) => setAppliedAt(e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Lịch sử áp dụng hệ số</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Khi cập nhật hệ số, phiên bản cũ sẽ kết thúc vào ngày trước ngày bắt đầu của phiên bản mới.
                  </p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
                  Theo thời gian hiệu lực
                </span>
              </div>
              {factorHistoryRows.length ? (
                <>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full min-w-[560px] text-left text-xs">
                      <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Phiên bản</th>
                          <th className="px-3 py-2">Giá trị</th>
                          <th className="px-3 py-2">Từ ngày</th>
                          <th className="px-3 py-2">Đến ngày</th>
                        </tr>
                      </thead>
                      <tbody>
                        {factorHistoryRows.map((row) => (
                          <tr key={row.id} className="border-b border-slate-50 last:border-0">
                            <td className="px-3 py-2.5 font-medium text-slate-700">{row.label}</td>
                            <td className="px-3 py-2.5 font-mono text-slate-700">
                              {formatFactorValue(row.value)} {row.unit}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">{row.validFrom}</td>
                            <td className="px-3 py-2.5">
                              <span className="font-medium text-emerald-700">{row.validTo}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Chưa có phiên bản cũ trong dữ liệu giao diện hiện tại. Khi thư viện phát sinh phiên bản mới,
                    phiên bản cũ sẽ được hiển thị với ngày kết thúc tương ứng.
                  </p>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-400">
                  Chọn một hệ số để xem các phiên bản và thời gian hiệu lực.
                </div>
              )}
            </section>

            {formError ? <p className="text-sm font-medium text-red-500">{formError}</p> : null}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
              >
                <SaveIcon className="h-4 w-4" />
                Lưu
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
              >
                Hủy
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
              className="h-9 w-full rounded-xl border border-slate-200 bg-[#f8fafc] pr-3 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white transition-colors"
            />
          </label>

          <ul className="max-h-[min(640px,70vh)] space-y-2 overflow-y-auto pr-1">
            {filteredFactors.map((factor) => {
              const Icon = factorIcons[factor.gasKey as GasKey] ?? BoltIcon;
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
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3 text-left hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors"
                  >
                    <GripIcon className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {factor.name}
                      </span>
                      <span className="block truncate text-xs text-slate-400">
                        {factor.gasLabel}: {formatFactorValue(factor.value)} {factor.unit}
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
      </>
      ) : (
      <section className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-slate-800">
            Danh sách nguồn phát thải
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {SCOPES.map((scope) => (
              <FilterChip
                key={scope.id}
                active={tableFilter === scope.id}
                onClick={() => {
                  setTableFilter(scope.id);
                  setActiveScope(scope.id);
                }}
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
                      <span className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
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
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-emerald-600"
                          aria-label={`Chỉnh sửa ${source.name}`}
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            persistSources(sources.filter((item) => item.id !== source.id))
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
      )}
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
      className={`h-8 rounded-full px-3 text-sm font-semibold transition-colors ${
        active
          ? "bg-emerald-600 text-white shadow-xs"
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

const factorIcons: Record<string, (props: { className?: string }) => ReactNode> = {
  co2: BoltIcon,
  ch4: FlameIcon,
  n2o: DropIcon,
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
