import { notFound } from "next/navigation";
import { AddGhgSourceButton } from "@/components/AddGhgSourceButton";
import { GhgConfig } from "@/components/GhgConfig";
import { getProjectFromDb } from "@/lib/server-projects";
import { ProjectConfigHeader } from "@/components/ProjectConfigHeader";

export default async function ProjectGhgConfigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectFromDb(id);
  if (!project) notFound();
  return (
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
      <ProjectConfigHeader project={project} actions={<AddGhgSourceButton />} />
      <GhgConfig projectId={id} />
    </div>
  );
}
