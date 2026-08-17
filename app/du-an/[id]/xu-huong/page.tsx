import { redirect } from "next/navigation";

export default async function TrendsRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/du-an/${id}/bieu-do`);
}
