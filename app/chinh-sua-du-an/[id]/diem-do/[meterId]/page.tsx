import { AddMeterPointForm } from "@/components/AddMeterPointForm";
import { getClientMeterFromDb } from "@/lib/server-client-meters";
import { getProjectFromDb } from "@/lib/server-projects";
import { projectConfigPath } from "@/lib/project-config";
import { notFound } from "next/navigation";

export default async function EditMeterPointPage({
  params,
}: {
  params: Promise<{ id: string; meterId: string }>;
}) {
  const { id, meterId } = await params;
  const [project, meter] = await Promise.all([
    getProjectFromDb(id),
    getClientMeterFromDb(id, meterId),
  ]);
  if (!project || !meter) notFound();

  return (
    <AddMeterPointForm
      cancelHref={projectConfigPath(id)}
      projectId={id}
      configuredMeterTypes={project.meterTypes ?? []}
      initialMeter={meter}
    />
  );
}
