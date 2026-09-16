import { notFound } from "next/navigation";
import { ClientShell } from "@/components/client/ClientShell";
import { getProjectFromDb } from "@/lib/server-projects";

export default async function ProjectClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectFromDb(id);

  if (!project) notFound();

  return <ClientShell project={project}>{children}</ClientShell>;
}
