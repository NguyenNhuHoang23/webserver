"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  hydrateMeterModels,
  loadMeterModels,
  removeMeterModel,
  upsertMeterModel,
  type MeterModelDef,
} from "@/lib/meter-models";

export function MeterModelCatalog() {
  const [catalog, setCatalog] = useState<MeterModelDef[]>(loadMeterModels);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<"add" | string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftCode, setDraftCode] = useState("");
  const [draftSerials, setDraftSerials] = useState<string[]>([]);
  const [serialInput, setSerialInput] = useState("");
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<MeterModelDef | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void hydrateMeterModels().then(setCatalog).catch(() => setCatalog(loadMeterModels()));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.serials.some((serial) => serial.toLowerCase().includes(q)),
    );
  }, [catalog, query]);

  function openAdd() {
    setEditor("add");
    setDraftName("");
    setDraftDescription("");
    setDraftCode("");
    setDraftSerials([]);
    setSerialInput("");
    setError("");
  }

  function openEdit(item: MeterModelDef) {
    setEditor(item.name);
    setDraftName(item.name);
    setDraftDescription(item.description);
    setDraftCode(item.code == null ? "" : String(item.code));
    setDraftSerials([...item.serials]);
    setSerialInput("");
    setError("");
  }

  function cancelEditor() {
    setEditor(null);
    setDraftName("");
    setDraftDescription("");
    setDraftCode("");
    setDraftSerials([]);
    setSerialInput("");
    setError("");
  }

  function addSerial() {
    const value = serialInput.trim();
    if (!value) return;
    setDraftSerials((current) =>
      current.includes(value) ? current : [...current, value].sort(),
    );
    setSerialInput("");
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const previous = editor === "add" ? undefined : editor ?? undefined;
      const codeRaw = draftCode.trim();
      const code = codeRaw === "" ? null : Number(codeRaw);
      if (codeRaw && !Number.isInteger(code)) {
        throw new Error("Mã gateway (MM) phải là số nguyên.");
      }
      const next = await upsertMeterModel(
        {
          name: draftName,
          description: draftDescription,
          code,
          serials: draftSerials,
        },
        previous,
      );
      setCatalog(next);
      cancelEditor();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu Category.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setSaving(true);
    setError("");
    try {
      const next = await removeMeterModel(toDelete.name);
      setCatalog(next);
      if (editor === toDelete.name) cancelEditor();
      setToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa Category.");
      setToDelete(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] p-4 sm:p-6 lg:p-8 font-sans">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Category / meterModel
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {catalog.length} model
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Thêm, sửa, xóa danh mục Category trùng `meterModel` gateway và serial cho từng model.
            Form thêm loại đồng hồ chỉ chọn từ danh sách này.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors shrink-0"
        >
          <span className="text-base leading-none font-bold">+</span>
          Thêm Category
        </button>
      </div>

      <div className="relative mb-5 max-w-md">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
          ⌕
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo Category, mô tả hoặc serial..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
        />
      </div>

      {error && !editor ? (
        <p className="mb-4 text-sm font-medium text-red-500">{error}</p>
      ) : null}

      {editor ? (
        <section className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
          <h2 className="text-sm font-semibold text-slate-800">
            {editor === "add" ? "Thêm Category mới" : `Sửa Category: ${editor}`}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500">
                TÊN CATEGORY (meterModel)
              </span>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="VD: PM2230"
                className="input"
                disabled={Boolean(editor !== "add" && catalog.find((item) => item.name === editor)?.builtin)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500">
                MÃ GATEWAY (MM)
              </span>
              <input
                value={draftCode}
                onChange={(e) => setDraftCode(e.target.value)}
                placeholder="VD: 0"
                className="input"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500">
                MÔ TẢ
              </span>
              <input
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder="Mô tả ngắn"
                className="input"
              />
            </label>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-500">
              SERIAL THUỘC MODEL NÀY
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSerial();
                  }
                }}
                placeholder="Nhập serial rồi Enter"
                className="input max-w-xs"
              />
              <button
                type="button"
                onClick={addSerial}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Thêm serial
              </button>
            </div>
            {draftSerials.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {draftSerials.map((serial) => (
                  <li
                    key={serial}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    {serial}
                    <button
                      type="button"
                      className="text-slate-400 hover:text-rose-600"
                      onClick={() =>
                        setDraftSerials((current) => current.filter((item) => item !== serial))
                      }
                      aria-label={`Xóa serial ${serial}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-400">Chưa có serial — form thêm đồng hồ sẽ không chọn được SN.</p>
            )}
          </div>

          {error ? <p className="mt-3 text-sm font-medium text-red-500">{error}</p> : null}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Lưu
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={cancelEditor}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Mã MM</th>
                <th className="px-5 py-3">Serial</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                    Chưa có Category nào.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.name} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{item.description}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-600">
                      {item.code == null ? "—" : item.code}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {item.serials.length
                        ? item.serials.join(", ")
                        : <span className="text-slate-400">Chưa có</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Sửa
                        </button>
                        {!item.builtin ? (
                          <button
                            type="button"
                            onClick={() => setToDelete(item)}
                            className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            Xóa
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Xác nhận xóa Category"
        description={`Xóa "${toDelete?.name}" và toàn bộ serial thuộc model này?`}
        confirmText="Xác nhận xóa"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
