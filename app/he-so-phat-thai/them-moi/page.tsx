import { Suspense } from "react";
import { AddEmissionFactorForm } from "@/components/AddEmissionFactorForm";

export default function AddEmissionFactorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Đang tải biểu mẫu...</div>}>
      <AddEmissionFactorForm />
    </Suspense>
  );
}
