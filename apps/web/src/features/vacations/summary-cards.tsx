"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ErrorState } from "@/components/common/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan, useMe } from "@/features/auth/api";
import { formatPeriod } from "@/lib/labels";
import { useVacationSummary } from "./api";
import { VacationStatusBadge } from "./vacations-page";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid content-start gap-2 rounded-xl border p-4">
      <h2 className="text-sm text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function VacationSummaryCards() {
  const can = useCan();
  const me = useMe();
  const summary = useVacationSummary();

  if (summary.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Carregando">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }
  if (summary.isError) return <ErrorState error={summary.error} onRetry={() => summary.refetch()} />;

  const { onVacationToday, awaitingMe, mine } = summary.data;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card title="De férias hoje">
        {onVacationToday.length ? (
          <ul className="grid gap-1 text-sm">
            {onVacationToday.map((p) => (
              <li key={p.id} className="break-words">
                {p.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">Ninguém está de férias.</p>
        )}
      </Card>
      {can("vacations:approve") && (
        <Card title="Aguardando sua aprovação">
          <p className="text-2xl font-semibold tabular-nums">{awaitingMe}</p>
          {awaitingMe > 0 && (
            <Link href="/vacations" className="text-sm underline underline-offset-4">
              Revisar pedidos de férias
            </Link>
          )}
        </Card>
      )}
      {me.data?.employeeId && (
        <Card title="Suas próximas férias">
          {mine.length ? (
            <ul className="grid gap-2 text-sm">
              {mine.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-2">
                  <span className="tabular-nums">{formatPeriod(v.startDate, v.endDate)}</span>
                  <VacationStatusBadge status={v.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">
              Nenhum pedido aberto.{" "}
              <Link href="/vacations" className="underline underline-offset-4">
                Pedir férias
              </Link>
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
