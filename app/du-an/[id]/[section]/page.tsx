import { notFound } from "next/navigation";

export default async function ProjectSectionPage({
  params,
}: {
  params: Promise<{ id: string; section: string }>;
}) {
  const { section } = await params;
  if (!section) notFound();
  notFound();
}
