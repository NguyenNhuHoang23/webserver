import { ProjectInfoView } from "@/components/ProjectInfoView";
import { getProjectFromDb } from "@/lib/server-projects";
import { notFound } from "next/navigation";

export default async function ProjectInfoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectFromDb(id);
  if (!project) notFound();

  return <ProjectInfoView project={project} />;
}
