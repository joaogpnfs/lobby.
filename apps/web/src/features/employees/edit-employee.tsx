"use client";

import { PageHeader } from "@/components/common/page-header";
import { ErrorState, LoadingState } from "@/components/common/states";
import { useEmployee } from "./api";
import { EmployeeForm } from "./employee-form";

export function EditEmployee({ id }: { id: string }) {
  const employee = useEmployee(id);
  if (employee.isPending) return <LoadingState rows={8} />;
  if (employee.isError) return <ErrorState error={employee.error} onRetry={() => employee.refetch()} />;
  return (
    <div className="grid gap-8">
      <PageHeader title={`Editar ${employee.data.name}`} />
      <EmployeeForm employee={employee.data} />
    </div>
  );
}
