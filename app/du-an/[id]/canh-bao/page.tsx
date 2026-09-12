import { notFound } from "next/navigation";
import { ClientAlerts } from "@/components/client/ClientAlerts";
import { getProject } from "@/lib/projects";

export default async function AlertsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);

  if (!project) notFound();

  return <ClientAlerts project={project} />;
}

