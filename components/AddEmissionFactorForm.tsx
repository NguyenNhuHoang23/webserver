"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  formatFactorValue,
  loadFactorGroups,
  parseFactorNumber,
  upsertFactorGroup,
  type FactorGroup,
  type GasKey,
} from "@/lib/emission-factors";

type GasRow = {
  key: GasKey;
  label: string;
  value: string;
  unit: string;
};

const defaultRows: GasRow[] = [
  { key: "co2", label: "CO2", value: "74.100", unit: "kg CO2/TJ" },
  { key: "ch4", label: "CH4", value: "3", unit: "kg CH4/TJ" },
  { key: "n2o", label: "N2O", value: "0.6", unit: "kg N2O/TJ" },
];

function rowsFromGroup(group: FactorGroup): GasRow[] {
  return group.gases.map((gas) => ({
    key: gas.key,
    label: gas.key === "co2" ? "CO2" : gas.key === "ch4" ? "CH4" : "N2O",
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

  useEffect(() => {
    if (!editingId) {
      setIsEdit(false);
      return;
    }
    const existing = loadFactorGroups().find((item) => item.id === editingId);
    if (!existing) {
      setIsEdit(false);
      return;
    }
    setIsEdit(true);
    setName(existing.name);
    setSource(existing.source);
    setRows(rowsFromGroup(existing));
  }, [editingId]);

  function updateRow(key: GasKey, patch: Partial<Pick<GasRow, "value" | "unit">>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;

    upsertFactorGroup({
      id: editingId && isEdit ? editingId : `ef-${Date.now()}`,
      name: trimmed,
      source: source.trim(),
      gases: rows.map((row) => ({
        key: row.key,
        label: row.key === "co2" ? "CO₂" : row.key === "ch4" ? "CH₄" : "N₂O",
        value: parseFactorNumber(row.value),
        unit: row.unit,
      })),
    });
    router.push("/he-so-phat-thai");
  }

  return (
    <div className="mx-auto max-w-[980px] p-6 lg:p-8">
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
            Nhập thông tin chi tiết cho nguồn phát thải mới vào hệ thống.
          </p>
        </div>

        <div className="space-y-4">
          <Field label="TÊN HỆ SỐ PHÁT THẢI">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Hệ số phát thải của DO trong công nghiệp."
              className="input"
              required
            />
          </Field>
          <Field label="TÀI LIỆU VIỆN DẪN (NGUỒN)">
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Ví dụ: Quyết định số 2626/QĐ-BTNMT."
              className="input"
            />
          </Field>
        </div>

        <div className="mt-8">
          <h3 className="mb-4 text-[15px] font-semibold text-slate-800">
            Cấu hình thành phần phát thải
          </h3>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-3 border-b border-slate-200 bg-[#f8fafc] px-4 py-2.5 text-[11px] font-semibold tracking-wide text-slate-400">
              <span>THÀNH PHẦN (KHÍ)</span>
              <span>GIÁ TRỊ</span>
              <span>ĐƠN VỊ</span>
            </div>
            {rows.map((row) => (
              <div
                key={row.key}
                className="grid grid-cols-3 gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
              >
                <input
                  value={row.label}
                  readOnly
                  className="h-10 rounded-lg border border-slate-200 bg-[#f1f5f9] px-3 text-sm font-semibold text-slate-600 outline-none"
                />
                <input
                  value={row.value}
                  onChange={(e) => updateRow(row.key, { value: e.target.value })}
                  inputMode="decimal"
                  className="input"
                />
                <input
                  value={row.unit}
                  onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                  className="input"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Link
            href="/he-so-phat-thai"
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Quay lại thư viện
          </Link>
          <button
            type="submit"
            className="h-10 rounded-lg bg-[#1a73e8] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#1666d0]"
          >
            {isEdit ? "Cập nhật hệ số" : "Lưu hệ số"}
          </button>
        </div>
      </form>

      <div className="mt-5 flex gap-3 rounded-xl border border-[#c5daf7] bg-[#f3f8ff] px-4 py-3 text-sm text-slate-600">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1a73e8] text-[11px] font-bold text-white">
          i
        </span>
        <p>
          <span className="font-semibold">Mẹo:</span> Điền đủ 3 thành phần CO2, CH4, N2O theo tài
          liệu viện dẫn để báo cáo khí nhà kính nhất quán.
        </p>
      </div>
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
