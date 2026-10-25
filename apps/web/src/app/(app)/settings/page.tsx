import type { Metadata } from "next";
import { SettingsPage } from "@/features/settings/settings-page";

export const metadata: Metadata = { title: "Configurações · lobby." };

export default async function Page({ searchParams }: PageProps<"/settings">) {
  const { linkedin } = await searchParams;
  const enabled = !!process.env.LINKEDIN_CLIENT_ID;
  return (
    <SettingsPage linkedin={enabled ? { result: typeof linkedin === "string" ? linkedin : undefined } : undefined} />
  );
}
