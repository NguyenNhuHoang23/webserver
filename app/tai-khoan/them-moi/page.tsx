import { Suspense } from "react";
import { AddAccountForm } from "@/components/AddAccountForm";

export default function AddAccountPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Đang tải biểu mẫu...</div>}>
      <AddAccountForm />
    </Suspense>
  );
}
