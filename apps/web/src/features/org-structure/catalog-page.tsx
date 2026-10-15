"use client";

import type { Permission } from "@lobby/types";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable, type Column } from "@/components/common/data-table";
import { FormField, SelectField, TextareaField } from "@/components/common/form-field";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { SearchInput } from "@/components/common/search-input";
import { EmptyState, ErrorState, LoadingState, errorMessage } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCan } from "@/features/auth/api";
import { emptyAsNull } from "@/lib/forms";
import { useSearchState } from "@/lib/search-params";
import { useCatalog, useDeleteCatalog, useOptions, useSaveCatalog, type CatalogResource } from "./api";

export type CatalogField = {
  name: string;
  label: string;
  kind?: "text" | "textarea" | "employee";
  hint?: string;
};

export type CatalogConfig<T> = {
  resource: CatalogResource;
  title: string;
  description: string;
  singular: string;
  empty: { title: string; description: string };
  fields: CatalogField[];
  schema: z.ZodType;
  columns: Column<T>[];
  // Form values for editing an existing row.
  toForm: (row: T) => Record<string, string>;
};

const MANAGE: Permission = "org-structure:manage";

// Departments, positions and branches share one screen: searchable list, create/edit dialog, delete.
export function CatalogPage<T extends { id: string; name: string; employeeCount: number }>({
  config,
}: {
  config: CatalogConfig<T>;
}) {
  const can = useCan();
  const { params, set, query } = useSearchState();
  const list = useCatalog<T>(config.resource, query);
  const remove = useDeleteCatalog(config.resource);
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const canManage = can(MANAGE);

  const addButton = canManage && <Button onClick={() => setEditing("new")}>Adicionar {config.singular}</Button>;

  return (
    <div className="grid gap-6">
      <PageHeader title={config.title} description={config.description} actions={addButton} />
      <SearchInput placeholder="Buscar pelo nome" value={params.get("q") ?? ""} onSearch={(q) => set({ q })} />

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        params.get("q") ? (
          <EmptyState title="Nada encontrado" description="Nenhum resultado para esta busca." />
        ) : (
          <EmptyState title={config.empty.title} description={config.empty.description} action={addButton} />
        )
      ) : (
        <>
          <DataTable
            rows={list.data.items}
            columns={[
              ...config.columns,
              { header: "Pessoas", cell: (r) => r.employeeCount, className: "w-24 text-right" },
            ]}
            actions={
              canManage
                ? (row) => (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>
                        Editar
                      </Button>
                      <ConfirmDialog
                        trigger={<Button variant="ghost" size="sm" className="text-destructive" />}
                        triggerLabel="Excluir"
                        title={`Excluir ${row.name}?`}
                        description={
                          row.employeeCount > 0
                            ? `${row.employeeCount} colaborador(es) ainda usam este registro. Mude-os antes de excluir.`
                            : "Esta ação não pode ser desfeita."
                        }
                        confirmLabel="Excluir"
                        pending={remove.isPending}
                        onConfirm={() => remove.mutate(row.id)}
                      />
                    </>
                  )
                : undefined
            }
          />
          <Pagination meta={list.data.meta} onPage={(page) => set({ page })} />
        </>
      )}
      {remove.isError && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(remove.error)}
        </p>
      )}

      {editing && (
        <CatalogForm config={config} row={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function CatalogForm<T extends { id: string }>({
  config,
  row,
  onClose,
}: {
  config: CatalogConfig<T>;
  row: T | null;
  onClose: () => void;
}) {
  const save = useSaveCatalog(config.resource);
  const employees = useOptions("employees");
  const { register, handleSubmit, formState } = useForm<Record<string, string>>({
    resolver: emptyAsNull(config.schema),
    defaultValues: row ? config.toForm(row) : {},
  });

  const onSubmit = handleSubmit((body) => save.mutate({ id: row?.id, body }, { onSuccess: onClose }));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{row ? `Editar ${config.singular}` : `Novo ${config.singular}`}</DialogTitle>
          </DialogHeader>
          {config.fields.map((f) => {
            const error = formState.errors[f.name]?.message;
            const id = `${config.resource}-${f.name}`;
            if (f.kind === "textarea")
              return <TextareaField key={f.name} id={id} label={f.label} error={error} {...register(f.name)} />;
            if (f.kind === "employee") {
              return (
                <SelectField
                  key={f.name}
                  id={id}
                  label={f.label}
                  hint={f.hint}
                  error={error}
                  placeholder="Ninguém"
                  options={employees.data ?? []}
                  {...register(f.name)}
                />
              );
            }
            return <FormField key={f.name} id={id} label={f.label} hint={f.hint} error={error} {...register(f.name)} />;
          })}
          {save.isError && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(save.error)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
