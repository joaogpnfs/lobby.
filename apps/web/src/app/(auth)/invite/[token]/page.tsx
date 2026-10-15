import type { Metadata } from "next";
import { AcceptInvitation } from "@/features/access/accept-invitation";

// The token is in this page's URL: keep it out of the Referer sent to anything the page links to.
export const metadata: Metadata = { title: "Convite · lobby.", referrer: "no-referrer" };

export default async function Page({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  return <AcceptInvitation token={token} />;
}
