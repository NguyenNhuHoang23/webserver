import { notFound } from "next/navigation";
import { ClientShell } from "@/components/client/ClientShell";
import { getProject } from "@/lib/projects";

export default async function ProjectClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);

  if (!project) notFound();

  return <ClientShell project={project}>{children}</ClientShell>;
}
