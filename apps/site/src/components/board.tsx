// Whiteboard pieces for the landing: sticky notes, live cursors, org chart, kanban.
import type { ReactNode } from "react";
import { Caveat } from "next/font/google";
import { CursorIcon } from "@phosphor-icons/react/ssr";
import { Avatar } from "@/components/avatar";
import { person, type PersonSlug } from "@/lib/people";

// Handwriting, only for board annotations.
export const hand = Caveat({ subsets: ["latin"], weight: ["600"] });

// Dotted whiteboard canvas.
export const boardBg = "bg-[#f6f7fa] bg-[radial-gradient(#cfd2dc_1.2px,transparent_1.2px)] [background-size:24px_24px]";

export const paper = {
  yellow: "bg-[#ffe066]",
  pink: "bg-[#ffc6e0]",
  mint: "bg-[#c3f5e3]",
  blue: "bg-[#cfdcff]",
  orange: "bg-[#ffd9b0]",
  lilac: "bg-[#e2d9ff]",
} as const;
export type Paper = keyof typeof paper;

export function Note({
  color,
  tilt = 0,
  className = "",
  children,
}: {
  color: Paper;
  tilt?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{ rotate: `${tilt}deg` }}
      className={`rounded-[4px] p-5 text-ink shadow-[0_14px_24px_-14px_rgb(23_21_58/0.45)] ${paper[color]} ${className}`}
    >
      {children}
    </div>
  );
}

const cursorColor = {
  blue: ["text-accent", "bg-accent"],
  pink: ["text-[#e2337d]", "bg-[#e2337d]"],
  green: ["text-[#0e9f6e]", "bg-[#0e9f6e]"],
} as const;

// A teammate's live cursor, as on a multiplayer board.
export function Mate({
  name,
  color,
  className = "",
}: {
  name: string;
  color: keyof typeof cursorColor;
  className?: string;
}) {
  const [text, bg] = cursorColor[color];
  return (
    <div className={`pointer-events-none flex items-start gap-0.5 ${className}`} aria-hidden>
      <CursorIcon size={22} weight="fill" className={text} />
      <span className={`mt-4 rounded-full px-2.5 py-1 text-xs font-semibold text-white ${bg}`}>{name}</span>
    </div>
  );
}

// Example HR moments pinned around the hero headline.
export function HeroNotes() {
  return (
    <>
      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:mt-0 lg:block">
        <Note color="yellow" tilt={-3} className="lg:absolute lg:right-[22%] lg:top-6 lg:w-52">
          <p className="font-bold">Férias da Bruna</p>
          <p className="text-sm">02/02 a 11/02, 10 dias</p>
          <p className="mt-3 text-xs font-semibold text-[#6b5200]">Aguardando Helena</p>
        </Note>
        <Note color="mint" tilt={2.5} className="lg:absolute lg:right-0 lg:top-24 lg:w-52">
          <p className="font-bold">Contrato do Otávio</p>
          <p className="text-sm">Assinado e guardado</p>
        </Note>
        <Note color="pink" tilt={-1.5} className="lg:absolute lg:right-[12%] lg:top-[17rem] lg:w-56">
          <p className="font-bold">Onboarding do Otávio</p>
          <p className="text-sm">3 de 6 tarefas feitas</p>
        </Note>
        <Note color="blue" tilt={3} className="hidden sm:block lg:absolute lg:right-[34%] lg:top-[19rem] lg:w-48">
          <p className="font-bold">Plano de saúde</p>
          <p className="text-sm">Ativo desde 03/2026</p>
        </Note>
      </div>
      <Mate name="Larissa (RH)" color="pink" className="absolute right-[34%] top-36 hidden lg:flex" />
      <Mate name="Helena" color="green" className="absolute right-[6%] top-[23rem] hidden lg:flex" />
    </>
  );
}

export function OrgChart() {
  const lead: PersonSlug = "helena";
  const team: PersonSlug[] = ["tiago", "bruna", "otavio", "jessica"];
  const card = (slug: PersonSlug) => {
    const p = person(slug);
    return (
      <div className="flex items-center gap-3 rounded-xl border border-hairline bg-white p-3 pr-5 text-ink shadow-sm">
        <Avatar slug={slug} size={44} decorative />
        <div className="min-w-0">
          <p className="truncate font-bold">{p.name}</p>
          <p className="truncate text-sm text-slate">{p.role}</p>
        </div>
      </div>
    );
  };
  return (
    <div className="grid justify-items-center">
      {card(lead)}
      <div className="h-8 w-0.5 bg-current opacity-30" aria-hidden />
      <div className="hidden h-0.5 w-[75%] bg-current opacity-30 lg:block" aria-hidden />
      <ul className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {team.map((s) => (
          <li key={s} className="grid justify-items-center">
            <div className="hidden h-6 w-0.5 bg-current opacity-30 lg:block" aria-hidden />
            {card(s)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Kanban() {
  const cols: { label: string; color: Paper; items: string[] }[] = [
    { label: "Pronto", color: "mint", items: ["Planejamento"] },
    { label: "Agora", color: "yellow", items: ["Fundação técnica"] },
    {
      label: "Depois",
      color: "orange",
      items: [
        "Login e permissões",
        "Colaboradores",
        "Documentos",
        "Férias",
        "Benefícios",
        "Onboarding",
        "Ponto",
        "Auditoria e relatórios",
        "Revisão de qualidade",
      ],
    },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1fr_2fr]">
      {cols.map((c) => (
        <div key={c.label} className="grid content-start gap-3 rounded-xl bg-surface p-4">
          <p className="flex items-center justify-between text-sm font-semibold text-slate">
            {c.label} <span className="tabular-nums">{c.items.length}</span>
          </p>
          <ul className={`grid gap-2 ${c.label === "Depois" ? "sm:grid-cols-2" : ""}`}>
            {c.items.map((name) => (
              <li key={name} className={`rounded-[4px] px-3 py-2.5 text-sm font-semibold shadow-sm ${paper[c.color]}`}>
                {name}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
