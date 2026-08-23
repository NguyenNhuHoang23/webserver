import { Suspense } from "react";
import { AddCustomDeviceForm } from "@/components/AddCustomDeviceForm";

export default function AddDevicePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Đang tải biểu mẫu...</div>}>
      <AddCustomDeviceForm />
    </Suspense>
  );
}
