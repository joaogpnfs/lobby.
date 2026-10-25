"use client";

import { rejectVacationSchema, VACATION_STATUSES, type RejectVacationInput, type VacationDto } from "@lobby/types";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable } from "@/components/common/data-table";
import { SelectField, TextareaField } from "@/components/common/form-field";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { EmptyState, ErrorState, LoadingState, errorMessage } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCan, useMe } from "@/features/auth/api";
import { formatPeriod, VACATION_STATUS_LABEL } from "@/lib/labels";
import { useSearchState } from "@/lib/search-params";
import { useApproveVacation, useCancelVacation, useRejectVacation, useVacations } from "./api";
import { RequestVacationDialog } from "./request-dialog";

const badge = {
  PENDING: "outline",
  APPROVED: "secondary",
  REJECTED: "destructive",
  CANCELLED: "outline",
  COMPLETED: "secondary",
} as const;

export function VacationStatusBadge({ status }: { status: VacationDto["status"] }) {
  return <Badge variant={badge[status]}>{VACATION_STATUS_LABEL[status]}</Badge>;
}

export function VacationsPage() {
  const can = useCan();
  const me = useMe();
  const { params, set, query } = useSearchState();
  const canRequest = can("vacations:request") && !!me.data?.employeeId;
  const requestButton = canRequest && <RequestVacationDialog trigger={<Button />} />;

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Férias"
        description={
          can("vacations:approve")
            ? "Pedidos da sua equipe e os seus."
            : "Peça férias e acompanhe a resposta do seu gestor."
        }
        actions={requestButton}
      />
      {can("vacations:approve") && (
        <section className="grid gap-3">
          <h2 className="font-medium">Aguardando sua aprovação</h2>
          <VacationsTable
            query="awaitingMe=true&pageSize=100"
            empty={<p className="text-sm text-muted-foreground">Nenhum pedido esperando por você.</p>}
          />
        </section>
      )}
      <section className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-medium">Todos os pedidos</h2>
          <div className="w-52">
            <SelectField
              id="filter-status"
              label="Situação"
              placeholder="Todas"
              options={VACATION_STATUSES.map((s) => ({ value: s, label: VACATION_STATUS_LABEL[s] }))}
              value={params.get("status") ?? ""}
              onChange={(e) => set({ status: e.target.value })}
            />
          </div>
        </div>
        <VacationsTable
          query={query}
          onPage={(page) => set({ page })}
          empty={
            params.has("status") ? (
              <EmptyState title="Nada encontrado" description="Nenhum pedido está nesta situação." />
            ) : (
              <EmptyState
                title="Nenhum pedido ainda"
                description={
                  canRequest
                    ? "Quando você pedir férias, o pedido e a resposta aparecem aqui."
                    : "Os pedidos de férias da equipe aparecem aqui."
                }
                action={requestButton}
              />
            )
          }
        />
      </section>
    </div>
  );
}

function VacationsTable({
  query,
  onPage,
  empty,
}: {
  query: string;
  onPage?: (page: number) => void;
  empty: ReactNode;
}) {
  const list = useVacations(query);
  const approve = useApproveVacation();
  const cancel = useCancelVacation();

  if (list.isPending) return <LoadingState rows={3} />;
  if (list.isError) return <ErrorState error={list.error} onRetry={() => list.refetch()} />;
  if (list.data.items.length === 0) return empty;

  const error = approve.error ?? cancel.error;
  return (
    <>
      <DataTable<VacationDto>
        rows={list.data.items}
        columns={[
          { header: "Colaborador", cell: (v) => <span className="font-medium">{v.employee.name}</span> },
          { header: "Período", cell: (v) => formatPeriod(v.startDate, v.endDate), className: "tabular-nums" },
          { header: "Dias", cell: (v) => v.days, className: "tabular-nums" },
          { header: "Situação", cell: (v) => <VacationStatusBadge status={v.status} /> },
          {
            header: "Observação",
            cell: (v) => (
              <span className="text-pretty text-muted-foreground">
                {v.decisionNote ? `Resposta: ${v.decisionNote}` : (v.reason ?? "—")}
              </span>
            ),
          },
        ]}
        actions={(v) => (
          <>
            {v.canDecide && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Aprovar férias de ${v.employee.name}`}
                  disabled={approve.isPending}
                  onClick={() => approve.mutate(v.id)}
                >
                  Aprovar
                </Button>
                <RejectDialog vacation={v} />
              </>
            )}
            {v.canCancel && (
              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Cancelar pedido de ${formatPeriod(v.startDate, v.endDate)}`}
                  />
                }
                triggerLabel="Cancelar pedido"
                title="Cancelar este pedido de férias?"
                description={`O período de ${formatPeriod(v.startDate, v.endDate)} fica livre de novo. Para tirar estas férias depois, faça outro pedido.`}
                confirmLabel="Cancelar pedido"
                cancelLabel="Manter pedido"
                pending={cancel.isPending}
                onConfirm={() => cancel.mutate(v.id)}
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

function RejectDialog({ vacation: v }: { vacation: VacationDto }) {
  const [open, setOpen] = useState(false);
  const reject = useRejectVacation();
  const { register, handleSubmit, formState, reset } = useForm<RejectVacationInput>({
    resolver: zodResolver(rejectVacationSchema),
    defaultValues: { note: "" },
  });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) return;
    reject.reset();
    reset();
  };

  const submit = handleSubmit(({ note }) =>
    reject.mutate({ id: v.id, note }, { onSuccess: () => onOpenChange(false) }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            aria-label={`Recusar férias de ${v.employee.name}`}
          />
        }
      >
        Recusar
      </DialogTrigger>
      <DialogContent>
        <form noValidate className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Recusar as férias de {v.employee.name}?</DialogTitle>
            <DialogDescription>
              {formatPeriod(v.startDate, v.endDate)}, {v.days} dias. A pessoa recebe o motivo e pode pedir outro
              período.
            </DialogDescription>
          </DialogHeader>
          <TextareaField
            id={`reject-note-${v.id}`}
            label="Motivo"
            rows={3}
            error={formState.errors.note?.message}
            {...register("note")}
          />
          {reject.isError && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(reject.error)}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={reject.isPending}>
              {reject.isPending ? "Recusando…" : "Recusar pedido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
