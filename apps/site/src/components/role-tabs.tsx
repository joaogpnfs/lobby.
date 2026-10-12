"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { Avatar } from "@/components/avatar";
import { person, type PersonSlug } from "@/lib/people";

const roles: { id: string; tab: string; who: PersonSlug; panel: string; items: string[] }[] = [
  {
    id: "rh",
    tab: "RH",
    who: "larissa",
    panel: "bg-rose",
    items: [
      "Cadastra colaboradores, departamentos, cargos e filiais.",
      "Guarda contratos e documentos com acesso controlado.",
      "Acompanha férias, onboarding e os números da empresa.",
    ],
  },
  {
    id: "gestor",
    tab: "Gestor",
    who: "helena",
    panel: "bg-lavender",
    items: [
      "Aprova ou recusa as férias da equipe direta.",
      "Acompanha o onboarding de quem acabou de chegar.",
      "Vê apenas as pessoas que lidera.",
    ],
  },
  {
    id: "colaborador",
    tab: "Colaborador",
    who: "otavio",
    panel: "bg-mint",
    items: [
      "Pede férias e acompanha a resposta.",
      "Registra entrada, intervalo e saída.",
      "Consulta os próprios documentos e benefícios.",
    ],
  },
];

export function RoleTabs() {
  const [active, setActive] = useState(roles[0].id);
  const role = roles.find((r) => r.id === active)!;
  const p = person(role.who);

  return (
    <div className="grid gap-8">
      <div role="tablist" aria-label="Perfis" className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <button
            key={r.id}
            role="tab"
            id={`tab-${r.id}`}
            aria-selected={r.id === active}
            aria-controls="role-panel"
            onClick={() => setActive(r.id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              r.id === active ? "border-accent bg-accent text-on-accent" : "border-hairline text-slate hover:text-ink"
            }`}
          >
            {r.tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={role.id}
          id="role-panel"
          role="tabpanel"
          aria-labelledby={`tab-${role.id}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10"
        >
          <div className={`flex items-end gap-4 rounded-xl p-6 ${role.panel}`}>
            <Avatar slug={role.who} size={112} />
            <div className="pb-2">
              <p className="font-semibold text-ink">{p.name.split(" ")[0]}</p>
              <p className="text-sm text-charcoal">{p.role}</p>
            </div>
          </div>
          <ul className="grid content-center gap-4">
            {role.items.map((item) => (
              <li key={item} className="flex gap-3 text-lg leading-snug text-charcoal">
                <CheckCircleIcon size={24} weight="duotone" className="mt-0.5 shrink-0 text-accent" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
