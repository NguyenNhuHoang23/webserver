import { redirect } from "next/navigation";
import { AddMeterPointForm } from "@/components/AddMeterPointForm";
import { projectConfigPath } from "@/lib/project-config";

export default async function AddMeterPointPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  if (project) redirect(projectConfigPath(project, "add-meter"));
  return <AddMeterPointForm cancelHref="/" />;
}
