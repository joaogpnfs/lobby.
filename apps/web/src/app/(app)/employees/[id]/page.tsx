import type { Metadata } from "next";
import { EmployeeDetail } from "@/features/employees/employee-detail";

export const metadata: Metadata = { title: "Colaborador · lobby." };

export default async function Page({ params }: PageProps<"/employees/[id]">) {
  const { id } = await params;
  return <EmployeeDetail id={id} />;
}
