import { notFound } from "next/navigation";
import { AlertConfig } from "@/components/AlertConfig";
import { getProjectFromDb } from "@/lib/server-projects";
import { resolveMeterTypes } from "@/lib/projects";
import { ProjectConfigHeader } from "@/components/ProjectConfigHeader";

export default async function ProjectAlertConfigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectFromDb(id);
  if (!project) notFound();
  return (
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
      <ProjectConfigHeader project={project} />
      <AlertConfig projectId={id} initialUtilities={resolveMeterTypes(project)} />
    </div>
  );
}
