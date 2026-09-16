import { GreenhouseCharts } from "@/components/client/GreenhouseCharts";

export default async function GreenhousePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GreenhouseCharts projectId={id} />;
}
