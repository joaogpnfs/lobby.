"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "@phosphor-icons/react";
import { person, type PersonSlug } from "@/lib/people";
import { Avatar } from "@/components/avatar";

type Status = "PENDING" | "APPROVED" | "REJECTED";
type Request = { id: number; who: PersonSlug; period: string; days: number; status: Status };

const initial: Request[] = [
  { id: 1, who: "tiago", period: "05/01 a 19/01", days: 15, status: "PENDING" },
  { id: 2, who: "bruna", period: "02/02 a 11/02", days: 10, status: "PENDING" },
  { id: 3, who: "caio", period: "16/03 a 30/03", days: 15, status: "PENDING" },
  { id: 4, who: "jessica", period: "08/12 a 22/12", days: 15, status: "APPROVED" },
];

const label: Record<Status, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Recusado",
};

const chip: Record<Status, string> = {
  PENDING: "bg-yellow text-yellow-ink",
  APPROVED: "bg-mint text-mint-ink",
  REJECTED: "bg-rose text-rose-ink",
};

export function VacationPreview() {
  const [rows, setRows] = useState(initial);
  const pending = rows.filter((r) => r.status === "PENDING").length;
  const decide = (id: number, status: Status) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));

  return (
    <div className="overflow-hidden rounded-[20px] border border-hairline bg-canvas text-left shadow-mock">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4 sm:px-6">
        <div>
          <p className="font-semibold">Pedidos de férias</p>
          <p className="text-sm text-slate">
            {pending === 0 ? "Tudo decidido por aqui." : `${pending} aguardando sua decisão`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRows(initial)}
          className="rounded-lg px-3 py-1.5 text-sm text-slate transition-colors hover:bg-surface hover:text-ink"
        >
          Recomeçar exemplo
        </button>
      </div>

      <ul className="divide-y divide-hairline">
        {rows.map((r) => {
          const p = person(r.who);
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 sm:flex-nowrap sm:px-6">
              <Avatar slug={r.who} decorative />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-sm text-slate tabular-nums">
                  {r.period}, {r.days} dias
                </p>
              </div>

              <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                <AnimatePresence mode="popLayout" initial={false}>
                  {r.status === "PENDING" ? (
                    <motion.div
                      key="actions"
                      className="flex gap-2"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.18 }}
                    >
                      <button
                        type="button"
                        onClick={() => decide(r.id, "REJECTED")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-hairline-strong px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] hover:bg-surface"
                      >
                        <X size={14} weight="bold" aria-hidden /> Recusar
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(r.id, "APPROVED")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent transition active:scale-[0.98] hover:bg-accent-pressed"
                      >
                        <Check size={14} weight="bold" aria-hidden /> Aprovar
                      </button>
                    </motion.div>
                  ) : (
                    <motion.span
                      key="status"
                      role="status"
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${chip[r.status]}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    >
                      {label[r.status]}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
