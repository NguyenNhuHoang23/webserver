import { notFound } from "next/navigation";
import { AddMeterPointForm } from "@/components/AddMeterPointForm";
import { getProjectFromDb } from "@/lib/server-projects";
import { projectConfigPath } from "@/lib/project-config";

export default async function ProjectAddMeterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectFromDb(id);
  if (!project) notFound();
  return (
    <AddMeterPointForm
      cancelHref={projectConfigPath(id)}
      projectId={id}
      configuredMeterTypes={project.meterTypes ?? []}
    />
  );
}
