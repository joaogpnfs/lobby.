import type { Metadata } from "next";
import { EmployeesList } from "@/features/employees/employees-list";

export const metadata: Metadata = { title: "Colaboradores · lobby." };

export default function Page() {
  return <EmployeesList />;
}
