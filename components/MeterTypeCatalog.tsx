"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  hydrateMeterTypeDefs,
  loadMeterTypeDefs,
  removeMeterTypeDef,
  upsertMeterTypeDef,
  type MeterTypeDef,
  type MeterTypeIconId,
} from "@/lib/meter-types";

export function MeterTypeCatalog() {
  const [catalog, setCatalog] = useState<MeterTypeDef[]>(loadMeterTypeDefs);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<"add" | string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<MeterTypeDef | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void hydrateMeterTypeDefs().then(setCatalog).catch(() => setCatalog(loadMeterTypeDefs()));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q),
    );
  }, [catalog, query]);

  function openAdd() {
    setEditor("add");
    setDraftName("");
    setDraftDescription("");
    setError("");
  }

  function openEdit(item: MeterTypeDef) {
    setEditor(item.name);
    setDraftName(item.name);
    setDraftDescription(item.description);
    setError("");
  }

  function cancelEditor() {
    setEditor(null);
    setDraftName("");
    setDraftDescription("");
    setError("");
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const previous = editor === "add" ? undefined : editor ?? undefined;
      const next = await upsertMeterTypeDef(
        { name: draftName, description: draftDescription },
        previous,
      );
      setCatalog(next);
      cancelEditor();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu loại điểm đo.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setSaving(true);
    setError("");
    try {
      const next = await removeMeterTypeDef(toDelete.name);
      setCatalog(next);
      if (editor === toDelete.name) cancelEditor();
      setToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa loại điểm đo.");
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
              Loại điểm đo
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {catalog.length} loại
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Thêm, sửa, xóa thư viện loại điểm đo dùng chung. Khi tạo dự án chỉ chọn từ danh sách này.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors shrink-0"
        >
          <span className="text-base leading-none font-bold">+</span>
          Thêm loại điểm đo
        </button>
      </div>

      <div className="relative mb-5 max-w-md">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
          <SearchIcon className="h-4 w-4" />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên hoặc mô tả..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-xs"
        />
      </div>

      {editor ? (
        <div className="mb-5 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 sm:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500">
              TÊN LOẠI ĐIỂM ĐO
            </span>
            <input
              value={draftName}
              onChange={(e) => {
                setDraftName(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void save();
                }
                if (e.key === "Escape") cancelEditor();
              }}
              placeholder="VD: Khí nén"
              className="input"
              disabled={editor !== "add" && catalog.find((item) => item.name === editor)?.builtin}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500">
              MÔ TẢ
            </span>
            <input
              value={draftDescription}
              onChange={(e) => {
                setDraftDescription(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void save();
                }
                if (e.key === "Escape") cancelEditor();
              }}
              placeholder="VD: Áp suất và lưu lượng khí nén"
              className="input"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-60"
            >
              {editor === "add" ? "Thêm" : "Lưu"}
            </button>
            <button
              type="button"
              onClick={cancelEditor}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mb-4 text-sm font-medium text-red-500">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((item) => (
          <div
            key={item.name}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <MeterTypeIcon type={item.icon} className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                {item.builtin ? (
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    Mặc định
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                onClick={() => openEdit(item)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-emerald-600"
                aria-label={`Sửa ${item.name}`}
                title="Sửa"
              >
                <EditIcon className="h-3.5 w-3.5" />
              </button>
              {item.builtin ? null : (
                <button
                  type="button"
                  onClick={() => setToDelete(item)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
                  aria-label={`Xóa ${item.name}`}
                  title="Xóa"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!filtered.length ? (
        <p className="mt-8 text-center text-sm text-slate-500">Không tìm thấy loại điểm đo phù hợp.</p>
      ) : null}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Xác nhận xóa loại điểm đo"
        description={`Bạn có chắc chắn muốn xóa loại điểm đo "${toDelete?.name}" không?`}
        confirmText="Xác nhận xóa"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function MeterTypeIcon({ type, className }: { type: MeterTypeIconId; className?: string }) {
  if (type === "drop") {
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
  if (type === "thermo") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M10 14.5V6.5a2 2 0 1 1 4 0v8a3.5 3.5 0 1 1-4 0Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 9v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "steam") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 17h14M7 14h10M9 11h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 8c0-2 1.5-3.5 4-3.5S16 6 16 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "air") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 9h11a3 3 0 1 0 0-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 13h14a3 3 0 1 1 0 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 17h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "generic") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v4l2.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 4.5 13.5h6.2L9.2 22 19.5 10h-6.2L13 2Z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
        d="M5 7h14M9 7V5h6v2M8 7l.8 12h6.4L16 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
