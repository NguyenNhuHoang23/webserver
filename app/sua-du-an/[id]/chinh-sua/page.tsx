import { AddProjectForm } from "@/components/AddProjectForm";
import { getProjectFromDb } from "@/lib/server-projects";
import { notFound } from "next/navigation";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectFromDb(id);
  if (!project) notFound();

  const infoHref = `/sua-du-an/${encodeURIComponent(id)}`;
  return <AddProjectForm initialProject={project} cancelHref={infoHref} successHref={infoHref} />;
}
