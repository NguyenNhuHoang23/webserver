import { notFound } from "next/navigation";
import { ClientDashboard } from "@/components/client/ClientDashboard";
import { getProject } from "@/lib/projects";

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);

  if (!project) notFound();

  return <ClientDashboard project={project} />;
}
