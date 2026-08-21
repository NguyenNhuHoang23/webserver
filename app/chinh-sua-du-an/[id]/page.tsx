import { notFound } from "next/navigation";
import { ProjectMeterConfig } from "@/components/ProjectMeterConfig";
import { getProject } from "@/lib/projects";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();
  return <ProjectMeterConfig project={project} />;
}
