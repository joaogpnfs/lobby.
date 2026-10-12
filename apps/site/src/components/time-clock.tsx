"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Avatar } from "@/components/avatar";
import { formatHours, workedMinutes } from "@/lib/time";

// Example day. Same order rule as the real product: no break without clock-in.
const steps = [
  { label: "Entrada", action: "Registrar entrada", time: "08:58" },
  { label: "Saída para o intervalo", action: "Iniciar intervalo", time: "12:02" },
  { label: "Volta do intervalo", action: "Encerrar intervalo", time: "13:01" },
  { label: "Saída", action: "Registrar saída", time: "18:04" },
] as const;

const status = ["Fora do expediente", "Trabalhando", "Em intervalo", "Trabalhando", "Dia encerrado"];

export function TimeClock() {
  const [n, setN] = useState(1);
  const done = steps.slice(0, n);
  const next = steps[n];
  const worked = workedMinutes(done.map((s) => s.time));

  return (
    <div className="overflow-hidden rounded-[20px] border border-hairline bg-canvas text-left shadow-mock">
      <div className="flex items-center gap-3 border-b border-hairline px-5 py-4 sm:px-6">
        <Avatar slug="bruna" size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Bruna Okamoto</p>
          <p className="text-sm text-slate">Terça, 13 de outubro</p>
        </div>
        <span role="status" className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold">
          {status[n]}
        </span>
      </div>

      <ol className="grid gap-1 px-5 py-4 text-sm tabular-nums sm:px-6">
        <AnimatePresence initial={false}>
          {done.map((s) => (
            <motion.li
              key={s.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex justify-between py-1.5"
            >
              <span className="text-slate">{s.label}</span>
              <span className="font-medium">{s.time}</span>
            </motion.li>
          ))}
        </AnimatePresence>
        {n === 0 && <li className="py-1.5 text-slate">Nenhum registro hoje.</li>}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-5 py-4 sm:px-6">
        <p className="text-sm">
          <span className="text-slate">Trabalhado </span>
          <span className="font-semibold tabular-nums">{formatHours(worked)}</span>
        </p>
        {next ? (
          <button
            type="button"
            onClick={() => setN(n + 1)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition hover:bg-accent-pressed active:scale-[0.98]"
          >
            {next.action}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setN(0)}
            className="rounded-lg border border-hairline-strong px-4 py-2 text-sm font-medium transition hover:bg-surface"
          >
            Recomeçar exemplo
          </button>
        )}
      </div>
    </div>
  );
}
