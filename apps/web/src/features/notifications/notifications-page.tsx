"use client";

import type { NotificationDto } from "@lobby/types";
import Link from "next/link";
import { useEffect } from "react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { formatPeriod } from "@/lib/labels";
import { useNotifications, useReadNotifications } from "./api";

const sentAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function notificationText({ type, data }: NotificationDto) {
  const period = formatPeriod(data.startDate, data.endDate);
  switch (type) {
    case "VACATION_REQUESTED":
      return `${data.employeeName} pediu férias de ${period}.`;
    case "VACATION_APPROVED":
      return `Suas férias de ${period} foram aprovadas.`;
    case "VACATION_REJECTED":
      return `Suas férias de ${period} foram recusadas. Veja o motivo em Férias.`;
  }
}

export function NotificationsPage() {
  const list = useNotifications();
  const read = useReadNotifications();
  const unread = list.data?.unread ?? 0;
  const { mutate } = read;

  useEffect(() => {
    if (unread > 0) mutate();
  }, [unread, mutate]);

  return (
    <div className="grid max-w-2xl gap-6">
      <PageHeader title="Notificações" description="Pedidos e respostas que envolvem você." />
      {list.isPending ? (
        <LoadingState rows={3} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          title="Nenhuma notificação"
          description="Quando alguém pedir férias para você aprovar, ou responder um pedido seu, o aviso aparece aqui."
        />
      ) : (
        <ul className="grid divide-y rounded-xl border">
          {list.data.items.map((n) => (
            <li key={n.id}>
              <Link href="/vacations" className="grid gap-1 px-4 py-3 hover:bg-muted/50">
                <span className="flex flex-wrap items-center gap-2">
                  {!n.readAt && <Badge>Nova</Badge>}
                  <span className="text-pretty">{notificationText(n)}</span>
                </span>
                <time dateTime={n.createdAt} className="text-sm text-muted-foreground tabular-nums">
                  {sentAt.format(new Date(n.createdAt))}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
