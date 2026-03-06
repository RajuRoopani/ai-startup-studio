import { notFound } from "next/navigation";
import { getSession } from "@/lib/api";
import OutputClient from "./OutputClient";

export default async function OutputPage({ params }: { params: { id: string } }) {
  let session;
  try {
    session = await getSession(params.id);
  } catch {
    notFound();
  }

  return <OutputClient session={session} />;
}
