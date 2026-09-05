import { AddMeterPointForm } from "@/components/AddMeterPointForm";

export default async function AddMeterPointPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  const cancelHref = project ? `/chinh-sua-du-an/${project}` : "/";
  return <AddMeterPointForm cancelHref={cancelHref} />;
}
