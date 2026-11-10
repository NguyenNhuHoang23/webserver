import { Suspense } from "react";
import { CustomerAccountDetailForm } from "@/components/CustomerAccountDetailForm";

export default function CustomerAccountDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Đang tải chi tiết tài khoản...</div>}>
      <CustomerAccountDetailForm />
    </Suspense>
  );
}
