"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { loadProjects, type Project } from "@/lib/projects";

export function ProjectConfigHeader({
  project,
  actions,
}: {
  project: Project;
  actions?: ReactNode;
}) {
  const [resolved, setResolved] = useState(project);

  useEffect(() => {
    const stored = loadProjects().find((item) => item.id === project.id);
    setResolved(stored ?? project);
  }, [project]);

  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold tracking-wide text-slate-400">CẤU HÌNH DỰ ÁN</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{resolved.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {resolved.id} · {resolved.customer}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          ← Quay lại danh sách dự án
        </Link>
      </div>
    </div>
  );
}
