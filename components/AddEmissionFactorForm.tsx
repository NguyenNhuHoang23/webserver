"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  formatFactorValue,
  hydrateFactorGroups,
  parseFactorNumber,
  upsertFactorGroup,
  type FactorGroup,
} from "@/lib/emission-factors";

type GasRow = {
  id: string;
  key: string;
  label: string;
  value: string;
  unit: string;
};

const defaultRows: GasRow[] = [
  { id: "row-co2", key: "co2", label: "CO2", value: "74.100", unit: "kg CO2/TJ" },
  { id: "row-ch4", key: "ch4", label: "CH4", value: "3", unit: "kg CH4/TJ" },
  { id: "row-n2o", key: "n2o", label: "N2O", value: "0.6", unit: "kg N2O/TJ" },
];

function rowsFromGroup(group: FactorGroup): GasRow[] {
  return group.gases.map((gas, index) => ({
    id: `row-${gas.key || "gas"}-${index}-${Date.now()}`,
    key: gas.key,
    label:
      gas.label ||
      (gas.key === "co2"
        ? "CO2"
        : gas.key === "ch4"
          ? "CH4"
          : gas.key === "n2o"
            ? "N2O"
            : gas.key),
    value: formatFactorValue(gas.value),
    unit: gas.unit.replaceAll("₂", "2").replaceAll("₄", "4"),
  }));
}

export function AddEmissionFactorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("id");

  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [rows, setRows] = useState<GasRow[]>(defaultRows);
  const [isEdit, setIsEdit] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<GasRow | null>(null);

  useEffect(() => {
    if (!editingId) {
      setIsEdit(false);
      return;
    }
    let active = true;
    void hydrateFactorGroups().then((groups) => {
      if (!active) return;
      const existing = groups.find((item) => item.id === editingId);
      if (!existing) {
        setIsEdit(false);
        return;
      }
      setIsEdit(true);
      setName(existing.name);
      setSource(existing.source);
      setRows(rowsFromGroup(existing));
    });
    return () => {
      active = false;
    };
  }, [editingId]);

  function updateRow(id: string, patch: Partial<Omit<GasRow, "id">>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function addRow() {
    const newId = `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setRows((current) => [
      ...current,
      {
        id: newId,
        key: "",
        label: "",
        value: "",
        unit: "kg/TJ",
      },
    ]);
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;

    const validRows = rows.filter((r) => r.label.trim() !== "");
    if (validRows.length === 0) {
      alert("Vui lòng nhập ít nhất một thành phần phát thải.");
      return;
    }

    upsertFactorGroup({
      id: editingId && isEdit ? editingId : `ef-${Date.now()}`,
      name: trimmed,
      source: source.trim(),
      gases: validRows.map((row, idx) => {
        const cleanLabel = row.label.trim();
        const cleanKey =
          (row.key && row.key.trim()) ||
          cleanLabel.toLowerCase().replace(/[^a-z0-9]/g, "") ||
          `gas_${idx + 1}`;
        return {
          key: cleanKey,
          label: cleanLabel,
          value: parseFactorNumber(row.value),
          unit: row.unit.trim() || "kg/TJ",
        };
      }),
    });
    router.push("/he-so-phat-thai");
  }

  return (
    <div className="mx-auto max-w-[980px] p-6 lg:p-8 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isEdit ? "Cập nhật hệ số phát thải" : "Thêm hệ số phát thải"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Quản lý thư viện hệ số phát thải</p>
      </div>

      <form
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="mb-6">
          <h2 className="text-[15px] font-semibold text-slate-800">
            {isEdit ? "Cập nhật hệ số phát thải" : "Thêm hệ số phát thải mới"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Nhập thông tin chi tiết cho nguồn phát thải vào hệ thống.
          </p>
        </div>

        <div className="space-y-4">
          <Field label="TÊN HỆ SỐ PHÁT THẢI">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Hệ số phát thải của than antraxit*"
              className="input"
              required
            />
          </Field>
          <Field label="TÀI LIỆU VIỆN DẪN (NGUỒN)">
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Ví dụ: Quyết định số 2626/QĐ-BTNMT ngày 10/10/2022, Phụ lục I"
              className="input"
            />
          </Field>
        </div>

        {/* Dynamic Emission Components Configuration */}
        <div className="mt-8">
          <div className="mb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-slate-800">
                Cấu hình thành phần phát thải
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Thêm, bớt hoặc tùy chỉnh các thành phần khí phát thải và định lượng hệ số tương ứng
              </p>
            </div>
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-emerald-200/80 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-colors shadow-xs"
            >
              <span className="text-sm font-bold leading-none">+</span>
              Thêm thành phần
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="grid grid-cols-[1.3fr_1fr_1fr_44px] sm:grid-cols-[1.3fr_1fr_1fr_48px] items-center border-b border-slate-200 bg-[#f8fafc] px-4 py-2.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              <span>THÀNH PHẦN (KHÍ)</span>
              <span>GIÁ TRỊ</span>
              <span>ĐƠN VỊ</span>
              <span className="text-center">XÓA</span>
            </div>

            {rows.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-slate-500">
                <p className="font-medium text-slate-600">Chưa có thành phần phát thải nào trong danh sách.</p>
                <p className="mt-1 text-slate-400">Nhấn nút bên dưới để thêm thành phần khí phát thải mới.</p>
                <button
                  type="button"
                  onClick={addRow}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  <span className="text-sm font-bold leading-none">+</span>
                  Thêm thành phần đầu tiên
                </button>
              </div>
            ) : (
              rows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[1.3fr_1fr_1fr_44px] sm:grid-cols-[1.3fr_1fr_1fr_48px] items-center gap-2 sm:gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50/50 transition-colors"
                >
                  <div>
                    <input
                      value={row.label}
                      onChange={(e) => updateRow(row.id, { label: e.target.value })}
                      placeholder="VD: CO2, CH4, N2O, SF6..."
                      className="input font-semibold text-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <input
                      value={row.value}
                      onChange={(e) => updateRow(row.id, { value: e.target.value })}
                      inputMode="decimal"
                      placeholder="0"
                      className="input"
                    />
                  </div>
                  <div>
                    <input
                      value={row.unit}
                      onChange={(e) => updateRow(row.id, { unit: e.target.value })}
                      placeholder="kg/TJ"
                      className="input"
                    />
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setRowToDelete(row)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Xóa thành phần này"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Link
            href="/he-so-phat-thai"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
          >
            Quay lại thư viện
          </Link>
          <button
            type="submit"
            className="h-10 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
          >
            {isEdit ? "Cập nhật hệ số" : "Lưu hệ số"}
          </button>
        </div>
      </form>

      <div className="mt-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm text-slate-700">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white shadow-xs">
          i
        </span>
        <p>
          <span className="font-semibold text-emerald-900">Mẹo:</span> Bạn có thể thêm, bớt hoặc chỉnh sửa bất kỳ thành phần phát thải nào (CO2, CH4, N2O, SF6...) theo đúng quy định và tài liệu viện dẫn kỹ thuật của cơ sở.
        </p>
      </div>

      <ConfirmDialog
        open={Boolean(rowToDelete)}
        title="Xác nhận xóa thành phần phát thải"
        description={`Bạn có chắc chắn muốn xóa thành phần "${rowToDelete?.label || "này"}" khỏi hệ số phát thải không?`}
        confirmText="Xác nhận xóa"
        onConfirm={() => {
          if (rowToDelete) {
            removeRow(rowToDelete.id);
            setRowToDelete(null);
          }
        }}
        onCancel={() => setRowToDelete(null)}
      />
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
