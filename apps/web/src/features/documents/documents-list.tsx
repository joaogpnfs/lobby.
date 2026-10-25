"use client";

import { DOCUMENT_TYPES, type DocumentDto } from "@lobby/types";
import type { ReactNode } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable } from "@/components/common/data-table";
import { SelectField } from "@/components/common/form-field";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { SearchInput } from "@/components/common/search-input";
import { EmptyState, ErrorState, LoadingState, errorMessage } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useCan } from "@/features/auth/api";
import { DOCUMENT_TYPE_LABEL, formatDate, formatSize } from "@/lib/labels";
import { useSearchState } from "@/lib/search-params";
import { useDeleteDocument, useDocuments, useDownloadDocument } from "./api";
import { UploadDialog } from "./upload-dialog";

export function DocumentsPage() {
  const can = useCan();
  const { params, set, query } = useSearchState();
  const filtered = ["q", "type"].some((k) => params.has(k));
  const uploadButton = can("documents:create") && <UploadDialog trigger={<Button />} />;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Documentos"
        description={
          can("documents:create")
            ? "Contratos, atestados e demais arquivos dos colaboradores."
            : "Seus documentos guardados pelo RH."
        }
        actions={uploadButton}
      />
      <div className="flex flex-wrap items-end gap-3">
        <SearchInput placeholder="Buscar por nome" value={params.get("q") ?? ""} onSearch={(q) => set({ q })} />
        <div className="w-52">
          <SelectField
            id="filter-type"
            label="Tipo"
            placeholder="Todos"
            options={DOCUMENT_TYPES.map((t) => ({ value: t, label: DOCUMENT_TYPE_LABEL[t] }))}
            value={params.get("type") ?? ""}
            onChange={(e) => set({ type: e.target.value })}
          />
        </div>
      </div>
      <DocumentsTable
        query={query}
        showEmployee
        onPage={(page) => set({ page })}
        empty={
          filtered ? (
            <EmptyState title="Nada encontrado" description="Nenhum documento corresponde a estes filtros." />
          ) : (
            <EmptyState
              title="Nenhum documento ainda"
              description={
                can("documents:create")
                  ? "Envie o primeiro contrato ou documento de um colaborador."
                  : "Quando o RH guardar um documento seu, ele aparece aqui."
              }
              action={uploadButton}
            />
          )
        }
      />
    </div>
  );
}

export function EmployeeDocuments({ employee }: { employee: { id: string; name: string } }) {
  const can = useCan();
  return (
    <section className="grid content-start gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Documentos</h2>
        {can("documents:create") && (
          <UploadDialog trigger={<Button variant="outline" size="sm" />} employee={employee} />
        )}
      </div>
      <DocumentsTable
        query={`employeeId=${employee.id}&pageSize=100`}
        empty={<p className="text-sm text-muted-foreground">Nenhum documento guardado.</p>}
      />
    </section>
  );
}

function DocumentsTable({
  query,
  showEmployee,
  onPage,
  empty,
}: {
  query: string;
  showEmployee?: boolean;
  onPage?: (page: number) => void;
  empty: ReactNode;
}) {
  const can = useCan();
  const list = useDocuments(query);
  const download = useDownloadDocument();
  const remove = useDeleteDocument();

  if (list.isPending) return <LoadingState rows={3} />;
  if (list.isError) return <ErrorState error={list.error} onRetry={() => list.refetch()} />;
  if (list.data.items.length === 0) return empty;

  const error = download.error ?? remove.error;
  return (
    <>
      <DataTable<DocumentDto>
        rows={list.data.items}
        columns={[
          { header: "Nome", cell: (d) => <span className="font-medium">{d.name}</span> },
          ...(showEmployee ? [{ header: "Colaborador", cell: (d: DocumentDto) => d.employee.name }] : []),
          { header: "Tipo", cell: (d) => DOCUMENT_TYPE_LABEL[d.type] },
          { header: "Tamanho", cell: (d) => formatSize(d.size), className: "tabular-nums" },
          { header: "Vencimento", cell: (d) => formatDate(d.expiresAt), className: "tabular-nums" },
          { header: "Enviado em", cell: (d) => formatDate(d.createdAt.slice(0, 10)), className: "tabular-nums" },
        ]}
        actions={(d) => (
          <>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Baixar ${d.name}`}
              disabled={download.isPending}
              onClick={() => download.mutate(d.id)}
            >
              Baixar
            </Button>
            {can("documents:delete") && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="sm" className="text-destructive" aria-label={`Excluir ${d.name}`} />
                }
                triggerLabel="Excluir"
                title={`Excluir ${d.name}?`}
                description="O arquivo é apagado do armazenamento. A exclusão fica registrada na auditoria."
                confirmLabel="Excluir"
                pending={remove.isPending}
                onConfirm={() => remove.mutate(d.id)}
              />
            )}
          </>
        )}
      />
      {onPage && <Pagination meta={list.data.meta} onPage={onPage} />}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(error)}
        </p>
      )}
    </>
  );
}
