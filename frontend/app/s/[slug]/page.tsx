import { notFound } from "next/navigation";
import { getSessionBySlug } from "@/lib/api";
import OutputClient from "@/app/output/[id]/OutputClient";

export default async function SharePage({ params }: { params: { slug: string } }) {
  let session;
  try {
    session = await getSessionBySlug(params.slug);
  } catch {
    notFound();
  }

  return <OutputClient session={session} />;
}
