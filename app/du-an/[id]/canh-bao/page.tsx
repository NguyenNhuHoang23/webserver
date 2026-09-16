import { notFound } from "next/navigation";
import { ClientAlerts } from "@/components/client/ClientAlerts";
import { getProjectFromDb } from "@/lib/server-projects";

export default async function AlertsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectFromDb(id);

  if (!project) notFound();

  return <ClientAlerts project={project} />;
}

