"use client";

import { useEffect, useState, type ReactNode } from "react";
import { hydrateProjects, type Project } from "@/lib/projects";

export function ProjectConfigHeader({
  project,
  actions,
}: {
  project: Project;
  actions?: ReactNode;
}) {
  const [resolved, setResolved] = useState(project);

  useEffect(() => {
    let active = true;
    void hydrateProjects().then((projects) => {
      if (active) setResolved(projects.find((item) => item.id === project.id) ?? project);
    });
    return () => {
      active = false;
    };
  }, [project]);

  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold tracking-wide text-slate-400">CẤU HÌNH DỰ ÁN</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{resolved.name}</h1>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
