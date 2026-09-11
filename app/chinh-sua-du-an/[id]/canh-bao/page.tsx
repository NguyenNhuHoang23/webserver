import { notFound } from "next/navigation";
import { AlertConfig } from "@/components/AlertConfig";
import { getProject } from "@/lib/projects";
import { ProjectConfigHeader } from "@/components/ProjectConfigHeader";

export default async function ProjectAlertConfigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();
  return (
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
      <ProjectConfigHeader project={project} />
      <AlertConfig />
    </div>
  );
}
