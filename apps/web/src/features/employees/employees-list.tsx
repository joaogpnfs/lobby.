"use client";

import { EMPLOYEE_STATUSES, type EmployeeListItem } from "@lobby/types";
import Link from "next/link";
import { DataTable } from "@/components/common/data-table";
import { SelectField } from "@/components/common/form-field";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { SearchInput } from "@/components/common/search-input";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { useCan } from "@/features/auth/api";
import { useOptions } from "@/features/org-structure/api";
import { formatDate, STATUS_LABEL } from "@/lib/labels";
import { useSearchState } from "@/lib/search-params";
import { useEmployees } from "./api";

export function EmployeesList() {
  const can = useCan();
  const { params, set, query } = useSearchState();
  const list = useEmployees(query);
  const departments = useOptions("departments");
  const filtered = ["q", "status", "departmentId"].some((k) => params.has(k));

  const addButton = can("employees:create") && (
    <Link href="/employees/new" className={buttonVariants()}>
      Adicionar colaborador
    </Link>
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Colaboradores"
        description="Todas as pessoas da empresa que você pode ver."
        actions={addButton}
      />

      <div className="flex flex-wrap items-end gap-3">
        <SearchInput
          placeholder="Buscar por nome ou e-mail"
          value={params.get("q") ?? ""}
          onSearch={(q) => set({ q })}
        />
        <div className="w-44">
          <SelectField
            id="filter-status"
            label="Status"
            placeholder="Todos"
            options={EMPLOYEE_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            value={params.get("status") ?? ""}
            onChange={(e) => set({ status: e.target.value })}
          />
        </div>
        <div className="w-52">
          <SelectField
            id="filter-department"
            label="Departamento"
            placeholder="Todos"
            options={departments.data ?? []}
            value={params.get("departmentId") ?? ""}
            onChange={(e) => set({ departmentId: e.target.value })}
          />
        </div>
      </div>

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        filtered ? (
          <EmptyState title="Ninguém encontrado" description="Nenhum colaborador corresponde a estes filtros." />
        ) : (
          <EmptyState
            title="Nenhum colaborador ainda"
            description="Adicione o primeiro colaborador para começar a montar a sua empresa no Lobby."
            action={addButton}
          />
        )
      ) : (
        <>
          <DataTable<EmployeeListItem>
            rows={list.data.items}
            href={(e) => `/employees/${e.id}`}
            columns={[
              { header: "Nome", cell: (e) => e.name },
              { header: "Cargo", cell: (e) => e.position?.name ?? "—" },
              { header: "Departamento", cell: (e) => e.department?.name ?? "—" },
              { header: "Gestor", cell: (e) => e.manager?.name ?? "—" },
              { header: "Admissão", cell: (e) => formatDate(e.hireDate) },
              { header: "Status", cell: (e) => <StatusBadge status={e.status} /> },
            ]}
          />
          <Pagination meta={list.data.meta} onPage={(page) => set({ page })} />
        </>
      )}
    </div>
  );
}
