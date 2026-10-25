import type { Metadata } from "next";
import { VacationsPage } from "@/features/vacations/vacations-page";

export const metadata: Metadata = { title: "Férias · lobby." };

export default function Page() {
  return <VacationsPage />;
}
