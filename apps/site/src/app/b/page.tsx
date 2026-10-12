import type { Metadata } from "next";
import {
  ClockCounterClockwise,
  EyeSlash,
  FileText,
  Gift,
  LinkSimple,
  LockKey,
  Plant,
  ShieldCheck,
} from "@phosphor-icons/react/ssr";
import { Avatar } from "@/components/avatar";
import { MotionRoot, Reveal } from "@/components/motion";
import { ProductSwitcher } from "@/components/product-switcher";
import { RoleTabs } from "@/components/role-tabs";
import { WaitlistForm } from "@/components/waitlist-form";
import { people } from "@/lib/people";
import { phases } from "@/lib/roadmap";

export const metadata: Metadata = { title: "Lobby" };

const CTA = "Pedir acesso";
const h2 = "font-display text-3xl sm:text-5xl sm:leading-[1.05]";

export default function OptionB() {
  return (
    <div className="theme-b min-h-dvh text-ink">
      <MotionRoot>
        <Header />
        <main>
          <Hero />
          <Journey />
          <Features />
          <Roles />
          <Security />
          <Progress />
          <Access />
        </main>
        <Footer />
      </MotionRoot>
    </div>
  );
}

function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <a href="#" className="flex items-center gap-2 font-display text-xl">
      {/* A doorway: the lobby is where people come in. */}
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <rect width="24" height="24" rx="6" className={inverted ? "fill-on-night" : "fill-ink"} />
        <path d="M8 19V9a4 4 0 0 1 8 0v10z" className={inverted ? "fill-night" : "fill-canvas"} />
      </svg>
      lobby
    </a>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Principal" className="hidden gap-7 text-sm font-medium text-slate md:flex">
          {[
            ["#jornada", "Jornada"],
            ["#recursos", "Recursos"],
            ["#seguranca", "Segurança"],
            ["#andamento", "Andamento"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="transition-colors hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <a
          href="#acesso"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition hover:bg-accent-pressed active:scale-[0.98]"
        >
          {CTA}
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="px-4 pb-24 pt-14 sm:px-6 md:pt-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div className="grid justify-items-start gap-6">
          <div className="flex -space-x-2">
            {people.slice(0, 5).map((p) => (
              <Avatar key={p.slug} slug={p.slug} size={36} decorative />
            ))}
          </div>
          <h1 className="font-display text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
            Todo mundo passa pelo Lobby.
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-slate">
            Do primeiro dia ao último, cada pessoa da sua empresa está aqui. Férias, documentos, ponto e benefícios num
            sistema só.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#acesso"
              className="rounded-lg bg-accent px-5 py-3 font-semibold text-on-accent transition hover:bg-accent-pressed active:scale-[0.98]"
            >
              {CTA}
            </a>
            <a
              href="#jornada"
              className="rounded-lg border border-hairline-strong bg-canvas px-5 py-3 font-semibold transition hover:bg-surface active:scale-[0.98]"
            >
              Ver a jornada
            </a>
          </div>
        </div>
        <Reveal>
          <ProductSwitcher />
        </Reveal>
      </div>
    </section>
  );
}

const journey = [
  { title: "Admissão", text: "Cadastro com cargo, departamento, filial e gestor. A conta de acesso sai junto." },
  { title: "Onboarding", text: "Roteiro de tarefas com responsáveis e prazos, do contrato à primeira semana." },
  { title: "Dia a dia", text: "Ponto, férias, documentos e benefícios, cada um com quem pode ver e aprovar." },
  { title: "Desligamento", text: "Data, motivo e acesso encerrado. O histórico continua guardado." },
];

function Journey() {
  return (
    <section id="jornada" className="border-t border-hairline px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className={`${h2} max-w-xl`}>Do primeiro dia ao último.</h2>
        </Reveal>
        <Reveal>
          <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {journey.map((j) => (
              <li key={j.title} className="grid content-start gap-3 border-t-2 border-ink pt-5">
                <h3 className="font-display text-2xl">{j.title}</h3>
                <p className="text-slate">{j.text}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="recursos" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className={`${h2} max-w-2xl`}>O que o RH resolvia em cinco planilhas.</h2>
        </Reveal>
        <div className="mt-12 grid gap-4 lg:grid-cols-3 lg:grid-rows-2">
          <Reveal className="grid content-between gap-8 rounded-xl bg-surface p-8 lg:row-span-2">
            <div className="grid gap-3">
              <FileText size={28} weight="duotone" aria-hidden />
              <h3 className="font-display text-3xl">Documentos</h3>
              <p className="text-slate">
                Contratos, atestados e holerites guardados em armazenamento privado. Para abrir, só com link temporário.
              </p>
            </div>
            <div className="grid gap-2 rounded-lg border border-hairline bg-canvas p-4 text-sm">
              {["Contrato de trabalho.pdf", "ASO admissional.pdf", "Holerite setembro.pdf"].map((f) => (
                <p key={f} className="flex items-center gap-2 py-1">
                  <FileText size={16} className="text-slate" aria-hidden />
                  {f}
                </p>
              ))}
              <p className="mt-2 flex items-center gap-2 rounded-md bg-surface px-3 py-2 text-xs font-medium">
                <LinkSimple size={14} aria-hidden /> Link de download expira em 5 minutos
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.05} className="grid gap-3 rounded-xl bg-surface p-8 lg:col-span-2">
            <Gift size={28} weight="duotone" aria-hidden />
            <h3 className="font-display text-2xl">Benefícios</h3>
            <p className="max-w-lg text-slate">
              Vale-refeição, plano de saúde, odontológico e transporte. Valor por pessoa, data de início e cancelamento
              no mesmo lugar.
            </p>
          </Reveal>

          <Reveal className="grid gap-3 rounded-xl bg-surface p-8">
            <Plant size={28} weight="duotone" aria-hidden />
            <h3 className="font-display text-2xl">Onboarding</h3>
            <p className="text-slate">Templates de tarefas reaproveitáveis para cada nova contratação.</p>
          </Reveal>

          <Reveal delay={0.05} className="grid gap-4 rounded-xl bg-surface p-8">
            <ClockCounterClockwise size={28} weight="duotone" aria-hidden />
            <h3 className="font-display text-2xl">Auditoria</h3>
            <p className="flex items-center gap-2 rounded-md bg-canvas px-3 py-2 text-sm">
              <Avatar slug="larissa" size={24} decorative />
              <span className="min-w-0 truncate">Larissa aprovou as férias de Tiago</span>
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Roles() {
  return (
    <section className="border-y border-hairline bg-surface px-4 py-24 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-12">
        <Reveal>
          <h2 className={`${h2} max-w-2xl`}>Cada pessoa vê o que precisa.</h2>
        </Reveal>
        <RoleTabs />
      </div>
    </section>
  );
}

function Security() {
  const items = [
    { icon: ShieldCheck, title: "Cada empresa isolada", text: "Ninguém de fora acessa os dados da sua organização." },
    { icon: LockKey, title: "Acesso por perfil", text: "Permissões por papel, conferidas a cada ação." },
    { icon: EyeSlash, title: "CPF mascarado", text: "Dados sensíveis aparecem só para quem precisa." },
    { icon: ClockCounterClockwise, title: "Tudo registrado", text: "Um histórico de quem fez o quê, e quando." },
  ];
  return (
    <section id="seguranca" className="px-4 py-24 sm:px-6">
      <Reveal className="mx-auto grid max-w-6xl gap-12 rounded-[24px] bg-night p-8 text-on-night sm:p-14">
        <h2 className={`${h2} max-w-xl`}>Os dados da sua equipe ficam com a sua empresa.</h2>
        <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, text }) => (
            <li key={title} className="grid content-start gap-2">
              <Icon size={28} weight="duotone" aria-hidden />
              <p className="mt-2 font-semibold">{title}</p>
              <p className="text-on-night-soft">{text}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

function Progress() {
  const groups = [
    { label: "Pronto", items: phases.filter((p) => p.state === "done") },
    { label: "Agora", items: phases.filter((p) => p.state === "now") },
    { label: "Depois", items: phases.filter((p) => !p.state) },
  ];
  return (
    <section id="andamento" className="px-4 pb-24 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Reveal>
          <h2 className={h2}>Em construção, uma parte de cada vez.</h2>
        </Reveal>
        <div className="grid gap-8 sm:grid-cols-3">
          {groups.map((g) => (
            <div key={g.label} className="grid content-start gap-3">
              <p className="border-b border-hairline pb-2 text-sm font-semibold text-slate">{g.label}</p>
              <ul className="grid gap-2">
                {g.items.map((p) => (
                  <li key={p.name} className={g.label === "Depois" ? "text-slate" : "font-medium"}>
                    {p.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Access() {
  return (
    <section id="acesso" className="border-t border-hairline px-4 py-24 sm:px-6">
      <Reveal className="mx-auto grid max-w-2xl justify-items-center gap-6 text-center">
        <div className="flex -space-x-3">
          {people.map((p) => (
            <Avatar key={p.slug} slug={p.slug} size={52} decorative />
          ))}
        </div>
        <h2 className={h2}>Abra as portas do Lobby para a sua equipe.</h2>
        <p className="text-lg text-slate">Deixe seu e-mail. Avisamos quando abrirmos as primeiras vagas.</p>
        <div className="flex w-full justify-center text-left">
          <WaitlistForm />
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-night px-4 pb-24 pt-14 text-on-night-soft sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 text-sm">
        <span className="text-on-night">
          <Logo inverted />
        </span>
        <p>Gestão de pessoas para empresas brasileiras.</p>
        <p>© 2026 Lobby</p>
      </div>
    </footer>
  );
}
