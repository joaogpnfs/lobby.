"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Avatar } from "@/components/avatar";
import { TimeClock } from "@/components/time-clock";
import { VacationPreview } from "@/components/vacation-preview";
import { people } from "@/lib/people";

const status: Record<string, [string, string]> = {
  tiago: ["Férias", "bg-sky text-sky-ink"],
  otavio: ["Em onboarding", "bg-yellow text-yellow-ink"],
};

function PeopleTable() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-hairline bg-canvas text-left shadow-mock">
      <div className="border-b border-hairline px-5 py-4 sm:px-6">
        <p className="font-semibold">Colaboradores</p>
        <p className="text-sm text-slate">Engenharia, Produto e Comercial</p>
      </div>
      <ul className="divide-y divide-hairline text-sm">
        {people.slice(0, 6).map((p) => {
          const [label, cls] = status[p.slug] ?? ["Ativo", "bg-mint text-mint-ink"];
          return (
            <li key={p.slug} className="flex items-center gap-3 px-5 py-3 sm:px-6">
              <Avatar slug={p.slug} size={32} decorative />
              <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
              <span className="hidden w-40 truncate text-slate sm:block">{p.role}</span>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const views = [
  { id: "ferias", label: "Férias", node: <VacationPreview /> },
  { id: "ponto", label: "Ponto", node: <TimeClock /> },
  { id: "pessoas", label: "Pessoas", node: <PeopleTable /> },
];

export function ProductSwitcher() {
  const [active, setActive] = useState(views[0].id);
  const view = views.find((v) => v.id === active)!;

  return (
    <div className="grid gap-4 rounded-[24px] border border-hairline bg-surface p-3 sm:p-4">
      <div role="tablist" aria-label="Telas do produto" className="flex gap-1 self-start rounded-full bg-canvas p-1 text-sm justify-self-start">
        {views.map((v) => (
          <button
            key={v.id}
            role="tab"
            id={`view-${v.id}`}
            aria-selected={v.id === active}
            aria-controls="view-panel"
            onClick={() => setActive(v.id)}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
              v.id === active ? "bg-ink text-canvas" : "text-slate hover:text-ink"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view.id}
          id="view-panel"
          role="tabpanel"
          aria-labelledby={`view-${view.id}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {view.node}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
