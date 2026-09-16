import { AddProjectForm } from "@/components/AddProjectForm";
import { getProjectFromDb } from "@/lib/server-projects";
import { notFound } from "next/navigation";

export default async function EditProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectFromDb(id);
  if (!project) notFound();

  return <AddProjectForm initialProject={project} />;
}
