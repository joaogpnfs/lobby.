import type { Metadata } from "next";
import { NotificationsPage } from "@/features/notifications/notifications-page";

export const metadata: Metadata = { title: "Notificações · lobby." };

export default function Page() {
  return <NotificationsPage />;
}
