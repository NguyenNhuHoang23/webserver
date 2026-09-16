import { notFound } from "next/navigation";
import { ProjectMeterConfig } from "@/components/ProjectMeterConfig";
import { getProjectFromDb } from "@/lib/server-projects";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectFromDb(id);
  if (!project) notFound();
  return <ProjectMeterConfig project={project} />;
}
