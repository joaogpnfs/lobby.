import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { EmployeeForm } from "@/features/employees/employee-form";

export const metadata: Metadata = { title: "Novo colaborador · lobby." };

export default function Page() {
  return (
    <div className="grid gap-8">
      <PageHeader
        title="Novo colaborador"
        description="Só nome, e-mail e admissão são obrigatórios. O resto pode vir depois."
      />
      <EmployeeForm />
    </div>
  );
}
