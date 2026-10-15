import type { Metadata } from "next";
import { BranchesPage } from "@/features/org-structure/pages";

export const metadata: Metadata = { title: "Filiais · lobby." };

export default function Page() {
  return <BranchesPage />;
}
