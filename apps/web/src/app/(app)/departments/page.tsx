import type { Metadata } from "next";
import { DepartmentsPage } from "@/features/org-structure/pages";

export const metadata: Metadata = { title: "Departamentos · lobby." };

export default function Page() {
  return <DepartmentsPage />;
}
