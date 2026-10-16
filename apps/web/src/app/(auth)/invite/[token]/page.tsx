import type { Metadata } from "next";
import { AcceptInvitation } from "@/features/access/accept-invitation";

export const metadata: Metadata = { title: "Convite · lobby.", referrer: "no-referrer" };

export default async function Page({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  return <AcceptInvitation token={token} />;
}
