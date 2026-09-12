"use client";

import { useEffect, useState } from "react";

export function AddGhgSourceButton() {
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    function onFormOpen(event: Event) {
      setFormOpen(Boolean((event as CustomEvent<boolean>).detail));
    }
    window.addEventListener("ems-ghg-form-open", onFormOpen);
    return () => window.removeEventListener("ems-ghg-form-open", onFormOpen);
  }, []);

  if (formOpen) return null;

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("ems-ghg-open-form"))}
      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
    >
      <span className="text-lg leading-none">+</span>
      Thêm mới nguồn phát thải
    </button>
  );
}
