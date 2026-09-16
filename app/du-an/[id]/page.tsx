import { notFound } from "next/navigation";
import { ClientDashboard } from "@/components/client/ClientDashboard";
import { getProjectFromDb } from "@/lib/server-projects";

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectFromDb(id);

  if (!project) notFound();

  return <ClientDashboard project={project} />;
}
