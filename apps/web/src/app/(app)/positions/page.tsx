import type { Metadata } from "next";
import { PositionsPage } from "@/features/org-structure/pages";

export const metadata: Metadata = { title: "Cargos · lobby." };

export default function Page() {
  return <PositionsPage />;
}
