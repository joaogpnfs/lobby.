// Landing as a collaborative board (Miro-like grammar): frames, sticky notes, live cursors.
import type { ReactNode } from "react";
import { EyeSlashIcon, LockKeyIcon, ShieldCheckIcon, ClockCounterClockwiseIcon } from "@phosphor-icons/react/ssr";
import { MotionRoot, Reveal } from "@/components/motion";
import { RoleTabs } from "@/components/role-tabs";
import { TimeClock } from "@/components/time-clock";
import { VacationPreview } from "@/components/vacation-preview";
import { WaitlistForm } from "@/components/waitlist-form";
import { Avatar } from "@/components/avatar";
import { HeroNotes, Kanban, Mate, Note, OrgChart, boardBg, hand } from "@/components/board";

// A board frame: a titled area, like Miro frames.
function Frame({
  label,
  id,
  children,
  className = "",
}: {
  label: string;
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Reveal className={`relative mx-auto w-full max-w-6xl ${className}`}>
      <section
        id={id}
        aria-label={label}
        className="rounded-2xl border border-hairline-strong/70 bg-white/80 p-6 backdrop-blur-[2px] sm:p-10"
      >
        <span className="absolute -top-3.5 left-6 rounded-md bg-ink px-2.5 py-1 text-xs font-semibold text-white">
          {label}
        </span>
        {children}
      </section>
    </Reveal>
  );
}

const h2 = "text-3xl font-extrabold leading-[1.05] tracking-[-0.025em] sm:text-5xl";

export default function Board() {
  return (
    <MotionRoot>
      <div className={`min-h-dvh ${boardBg}`}>
        <Toolbar />
        <main className="grid gap-20 px-4 pb-28 pt-6 sm:px-6">
          <Hero />
          <Frame label="Férias" id="ferias">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <div className="grid gap-5">
                <h2 className={h2}>Pediu, aprovou, pronto.</h2>
                <p className="max-w-md text-lg text-charcoal">
                  O gestor decide aqui mesmo. Datas que se sobrepõem são barradas na hora.
                </p>
                <p className={`${hand.className} -rotate-2 text-3xl text-accent`}>teste: aprove um pedido →</p>
              </div>
              <VacationPreview />
            </div>
          </Frame>
          <Frame label="Equipe">
            <Team />
          </Frame>
          <Frame label="Ponto">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
              <div className="order-2 lg:order-1">
                <TimeClock />
              </div>
              <div className="order-1 grid gap-5 lg:order-2">
                <h2 className={h2}>O dia se soma sozinho.</h2>
                <p className="max-w-md text-lg text-charcoal">Entrada, intervalo e saída com horário do servidor.</p>
              </div>
            </div>
          </Frame>
          <Frame label="Perfis">
            <div className="grid gap-10">
              <h2 className={h2}>Cada pessoa vê o que precisa.</h2>
              <RoleTabs />
            </div>
          </Frame>
          <Security />
          <Progress />
          <Access />
        </main>
        <footer className="px-4 pb-10 text-center text-sm text-slate sm:px-6">
          <span className="font-extrabold text-ink">
            lobby<span className="text-brand-pink">.</span>
          </span>{" "}
          Gestão de pessoas para empresas brasileiras. © 2026
        </footer>
      </div>
    </MotionRoot>
  );
}

function Toolbar() {
  return (
    <header className="sticky top-3 z-30 px-4 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-hairline bg-white px-4 py-2.5 shadow-sm">
          <span className="text-lg font-extrabold tracking-tight">
            lobby<span className="text-brand-pink">.</span>
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-hairline bg-white py-1.5 pl-2 pr-1.5 shadow-sm">
          <div className="hidden -space-x-2 sm:flex">
            {(["larissa", "helena", "tiago"] as const).map((s) => (
              <Avatar key={s} slug={s} size={30} decorative />
            ))}
          </div>
          <a
            href="#acesso"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition hover:bg-accent-pressed active:scale-[0.98]"
          >
            Pedir acesso
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto w-full max-w-6xl pt-10 lg:min-h-[34rem] lg:pt-20">
      <div className="relative z-10 grid max-w-2xl gap-7">
        <h1 className="text-[clamp(3rem,8vw,6.5rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
          Gente em primeiro lugar.
        </h1>
        <p className="max-w-md text-xl text-charcoal">
          Todo o RH da sua empresa num quadro só, à vista de quem precisa.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="#acesso"
            className="rounded-full bg-accent px-6 py-3 font-semibold text-on-accent transition hover:bg-accent-pressed active:scale-[0.98]"
          >
            Pedir acesso
          </a>
          <a
            href="#ferias"
            className="rounded-full border-2 border-ink bg-white px-6 py-3 font-semibold transition hover:bg-surface active:scale-[0.98]"
          >
            Ver o quadro
          </a>
        </div>
      </div>

      <HeroNotes />
    </section>
  );
}

function Team() {
  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className={h2}>Quem lidera quem.</h2>
        <p className={`${hand.className} rotate-1 text-3xl text-accent`}>gestora vê só a própria equipe</p>
      </div>
      <OrgChart />
    </div>
  );
}

function Security() {
  const notes = [
    {
      icon: ShieldCheckIcon,
      title: "Cada empresa isolada",
      text: "Ninguém de fora acessa os dados da sua organização.",
      tilt: -2,
    },
    { icon: LockKeyIcon, title: "Acesso por perfil", text: "Permissões por papel, conferidas a cada ação.", tilt: 1.5 },
    { icon: EyeSlashIcon, title: "CPF mascarado", text: "Dados sensíveis só para quem precisa.", tilt: -1 },
    { icon: ClockCounterClockwiseIcon, title: "Tudo registrado", text: "Quem fez o quê, e quando.", tilt: 2 },
  ];
  return (
    <Frame label="Segurança" id="seguranca">
      <div className="grid gap-10">
        <h2 className={`${h2} max-w-2xl`}>Os dados da sua equipe ficam com a sua empresa.</h2>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {notes.map(({ icon: Icon, title, text, tilt }) => (
            <li key={title}>
              <Note color="lilac" tilt={tilt} className="h-full">
                <Icon size={28} weight="duotone" aria-hidden />
                <p className="mt-3 text-lg font-bold">{title}</p>
                <p className="text-sm text-charcoal">{text}</p>
              </Note>
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}

function Progress() {
  return (
    <Frame label="Andamento" id="andamento">
      <div className="grid gap-10">
        <h2 className={h2}>Em construção, uma parte de cada vez.</h2>
        <Kanban />
      </div>
    </Frame>
  );
}

function Access() {
  return (
    <Reveal className="mx-auto w-full max-w-3xl">
      <div id="acesso" className="relative">
        <Note color="yellow" tilt={-1} className="grid gap-5 p-8 sm:p-12">
          <h2 className={h2}>Quer o Lobby na sua empresa?</h2>
          <p className="text-lg text-charcoal">Deixe seu e-mail. Avisamos quando abrirmos as primeiras vagas.</p>
          <WaitlistForm />
        </Note>
        <Mate name="Você" color="blue" className="absolute -bottom-8 right-10 hidden sm:flex" />
      </div>
    </Reveal>
  );
}
