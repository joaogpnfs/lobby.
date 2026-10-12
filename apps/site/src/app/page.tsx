import {
  AirplaneTilt,
  CheckCircle,
  ClockCounterClockwise,
  Clock,
  EyeSlash,
  FileText,
  Gift,
  LockKey,
  MagnifyingGlass,
  ShieldCheck,
  UsersThree,
  Plant,
} from "@phosphor-icons/react/ssr";
import { Avatar } from "@/components/avatar";
import { MotionRoot, PopIn, Reveal } from "@/components/motion";
import { RoleTabs } from "@/components/role-tabs";
import { VacationPreview } from "@/components/vacation-preview";
import { WaitlistForm } from "@/components/waitlist-form";
import { people, type PersonSlug } from "@/lib/people";

const CTA = "Pedir acesso";

export default function Home() {
  return (
    <MotionRoot>
      <Header />
      <main>
        <Hero />
        <Modules />
        <Roles />
        <Security />
        <Progress />
        <Access />
      </main>
      <Footer />
    </MotionRoot>
  );
}

function Logo() {
  return (
    <a href="#" className="flex items-center gap-2 text-lg font-bold tracking-tight">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <rect width="26" height="26" rx="7" className="fill-accent" />
        <circle cx="9.5" cy="10.5" r="3.5" className="fill-canvas" />
        <circle cx="16.5" cy="10.5" r="3.5" className="fill-canvas" opacity="0.6" />
        <rect x="5" y="16" width="16" height="4" rx="2" className="fill-canvas" />
      </svg>
      Lobby
    </a>
  );
}

function Header() {
  const links = [
    ["#produto", "Produto"],
    ["#perfis", "Perfis"],
    ["#seguranca", "Segurança"],
    ["#andamento", "Andamento"],
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Principal" className="hidden gap-7 text-sm text-slate md:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="transition-colors hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <a
          href="#acesso"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition hover:bg-accent-pressed active:scale-[0.98]"
        >
          {CTA}
        </a>
      </div>
    </header>
  );
}

// Faces placed around the headline on large screens.
const heroFaces: { slug: PersonSlug; size: number; pos: string }[] = [
  { slug: "larissa", size: 88, pos: "left-[4%] top-10" },
  { slug: "caio", size: 64, pos: "left-[14%] top-56" },
  { slug: "helena", size: 72, pos: "left-[2%] top-[22rem]" },
  { slug: "tiago", size: 80, pos: "right-[5%] top-12" },
  { slug: "bruna", size: 60, pos: "right-[15%] top-60" },
  { slug: "rafael", size: 76, pos: "right-[3%] top-[21rem]" },
];

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 md:pt-24">
      {heroFaces.map((f, i) => (
        <PopIn key={f.slug} index={i} className={`absolute hidden lg:block ${f.pos}`}>
          <Avatar slug={f.slug} size={f.size} decorative className="shadow-sm" />
        </PopIn>
      ))}

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="mb-8 flex -space-x-3 lg:hidden">
          {heroFaces.slice(0, 5).map((f, i) => (
            <PopIn key={f.slug} index={i}>
              <Avatar slug={f.slug} size={48} decorative />
            </PopIn>
          ))}
        </div>

        <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[4.25rem]">
          O RH da sua empresa, fora da planilha.
        </h1>
        <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-slate">
          Colaboradores, férias, documentos, benefícios e ponto num lugar só. Simples para o RH, claro
          para cada pessoa da equipe.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <a
            href="#acesso"
            className="rounded-lg bg-accent px-5 py-3 font-medium text-on-accent transition hover:bg-accent-pressed active:scale-[0.98]"
          >
            {CTA}
          </a>
          <a
            href="#produto"
            className="rounded-lg border border-hairline-strong px-5 py-3 font-medium transition hover:bg-surface active:scale-[0.98]"
          >
            Ver o produto
          </a>
        </div>
      </div>

      <Reveal className="relative mx-auto mt-16 max-w-3xl md:mt-20">
        <VacationPreview />
        <p className="mt-3 text-center text-sm text-slate">Prévia interativa com dados de exemplo. Experimente aprovar um pedido.</p>
      </Reveal>
    </section>
  );
}

function ModuleTitle({ icon, children, ink }: { icon: React.ReactNode; children: React.ReactNode; ink: string }) {
  return (
    <h3 className={`flex items-center gap-2 text-xl font-semibold ${ink}`}>
      {icon}
      {children}
    </h3>
  );
}

const january = Array.from({ length: 31 }, (_, i) => i + 1);

function Modules() {
  return (
    <section id="produto" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-[2.75rem] sm:leading-[1.1]">
            Tudo que o RH faz, num lugar só.
          </h2>
          <p className="mt-4 text-lg text-slate">
            Cada módulo tem a sua cor. A mesma cor aparece dentro do produto, para você se achar rápido.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {/* Colaboradores */}
          <Reveal className="grid gap-6 rounded-xl bg-rose p-7 md:col-span-2">
            <div className="grid gap-2">
              <ModuleTitle ink="text-rose-ink" icon={<UsersThree size={24} weight="duotone" aria-hidden />}>
                Colaboradores
              </ModuleTitle>
              <p className="max-w-md text-charcoal">
                Ficha completa com gestor, departamento, cargo e filial. Busca e filtros que respondem na hora.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex -space-x-2.5">
                {people.map((p) => (
                  <Avatar key={p.slug} slug={p.slug} size={44} />
                ))}
              </div>
              <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-hairline bg-canvas px-3 text-sm text-slate sm:max-w-xs">
                <MagnifyingGlass size={16} aria-hidden />
                <span className="truncate">Buscar por nome, cargo ou filial</span>
              </div>
            </div>
          </Reveal>

          {/* Onboarding */}
          <Reveal delay={0.05} className="grid content-start gap-5 rounded-xl bg-mint p-7 md:row-span-2">
            <ModuleTitle ink="text-mint-ink" icon={<Plant size={24} weight="duotone" aria-hidden />}>
              Onboarding
            </ModuleTitle>
            <p className="text-charcoal">Um roteiro para cada nova contratação, com responsáveis e prazos.</p>
            <div className="rounded-lg bg-canvas p-4">
              <div className="flex items-center gap-3">
                <Avatar slug="otavio" size={36} />
                <div className="text-sm">
                  <p className="font-medium">Otávio Lins</p>
                  <p className="text-slate">3 de 6 tarefas</p>
                </div>
              </div>
              <ul className="mt-4 grid gap-2.5 text-sm">
                {[
                  ["Criar conta", true],
                  ["Enviar documentos", true],
                  ["Assinar contrato", true],
                  ["Escolher benefícios", false],
                  ["Completar perfil", false],
                  ["Conversa com a gestora", false],
                ].map(([task, done]) => (
                  <li key={task as string} className={`flex items-center gap-2 ${done ? "text-slate line-through" : ""}`}>
                    <CheckCircle
                      size={18}
                      weight={done ? "fill" : "regular"}
                      className={done ? "text-mint-ink" : "text-hairline-strong"}
                      aria-hidden
                    />
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Férias */}
          <Reveal className="grid content-start gap-5 rounded-xl bg-sky p-7">
            <ModuleTitle ink="text-sky-ink" icon={<AirplaneTilt size={24} weight="duotone" aria-hidden />}>
              Férias
            </ModuleTitle>
            <p className="text-charcoal">Pedido, aprovação e retorno. Períodos que se sobrepõem são bloqueados.</p>
            <div className="rounded-lg bg-canvas p-4 text-center text-xs tabular-nums">
              <p className="mb-3 text-left text-sm font-medium">Janeiro de 2027</p>
              <div className="grid grid-cols-7 gap-y-1 text-slate">
                {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                  <span key={i} className="pb-1 font-medium">
                    {d}
                  </span>
                ))}
                {/* 1 Jan 2027 is a Friday */}
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={`b${i}`} />
                ))}
                {january.map((d) => {
                  const on = d >= 5 && d <= 19;
                  return (
                    <span
                      key={d}
                      className={`py-1 ${on ? "bg-sky font-semibold text-sky-ink" : ""} ${d === 5 ? "rounded-l-full" : ""} ${d === 19 ? "rounded-r-full" : ""}`}
                    >
                      {d}
                    </span>
                  );
                })}
              </div>
            </div>
          </Reveal>

          {/* Documentos */}
          <Reveal delay={0.05} className="grid content-start gap-5 rounded-xl bg-peach p-7">
            <ModuleTitle ink="text-peach-ink" icon={<FileText size={24} weight="duotone" aria-hidden />}>
              Documentos
            </ModuleTitle>
            <p className="text-charcoal">Contratos, atestados e holerites com acesso controlado e link temporário.</p>
            <ul className="grid gap-2 text-sm">
              {[
                ["Contrato de trabalho.pdf", null],
                ["ASO admissional.pdf", "Vence em 12 dias"],
                ["RG e CPF.pdf", null],
              ].map(([file, note]) => (
                <li key={file} className="flex items-center gap-3 rounded-lg bg-canvas px-3 py-2.5">
                  <FileText size={18} className="shrink-0 text-peach-ink" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{file}</span>
                  {note && <span className="shrink-0 rounded-full bg-peach px-2 py-0.5 text-xs font-semibold text-peach-ink">{note}</span>}
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Ponto */}
          <Reveal className="grid content-start gap-5 rounded-xl bg-lavender p-7">
            <ModuleTitle ink="text-lavender-ink" icon={<Clock size={24} weight="duotone" aria-hidden />}>
              Ponto
            </ModuleTitle>
            <p className="text-charcoal">Entrada, intervalo e saída com horário do servidor. O dia se soma sozinho.</p>
            <div className="rounded-lg bg-canvas p-4 text-sm tabular-nums">
              {[
                ["Entrada", "08:58"],
                ["Saída para o intervalo", "12:02"],
                ["Volta do intervalo", "13:01"],
                ["Saída", "18:04"],
              ].map(([label, time]) => (
                <p key={label} className="flex justify-between py-1">
                  <span className="text-slate">{label}</span>
                  <span className="font-medium">{time}</span>
                </p>
              ))}
              <p className="mt-2 flex justify-between border-t border-hairline pt-3 font-semibold">
                <span>Trabalhado</span>
                <span className="text-lavender-ink">8h07</span>
              </p>
            </div>
          </Reveal>

          {/* Benefícios */}
          <Reveal
            delay={0.05}
            className="grid items-center gap-8 rounded-xl bg-yellow p-7 md:col-span-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          >
            <div className="grid gap-5">
              <ModuleTitle ink="text-yellow-ink" icon={<Gift size={24} weight="duotone" aria-hidden />}>
                Benefícios
              </ModuleTitle>
              <p className="text-charcoal">
                Monte o catálogo da empresa, defina o valor de cada pessoa e a data de início. Para cancelar, basta um clique.
              </p>
              <ul className="flex flex-wrap gap-2">
                {["Vale-refeição", "Vale-alimentação", "Plano de saúde", "Plano odontológico", "Vale-transporte"].map((b) => (
                  <li key={b} className="rounded-full bg-canvas px-3.5 py-1.5 text-sm font-medium">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-canvas p-4 text-sm">
              <div className="flex items-center gap-3">
                <Avatar slug="bruna" size={36} />
                <div>
                  <p className="font-medium">Bruna Okamoto</p>
                  <p className="text-slate">Valores de exemplo</p>
                </div>
              </div>
              <ul className="mt-4 grid gap-1 tabular-nums">
                {[
                  ["Vale-refeição", "R$ 38,00 por dia", "desde 03/2026"],
                  ["Plano de saúde", "R$ 412,90 por mês", "desde 03/2026"],
                  ["Vale-transporte", "R$ 9,40 por dia", "desde 05/2026"],
                ].map(([name, value, since]) => (
                  <li key={name} className="flex items-baseline justify-between gap-3 py-1.5">
                    <span>
                      {name}
                      <span className="block text-xs text-slate">{since}</span>
                    </span>
                    <span className="font-medium">{value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Roles() {
  return (
    <section id="perfis" className="border-y border-hairline bg-surface px-4 py-24 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-12">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-[2.75rem] sm:leading-[1.1]">
            Cada pessoa vê o que precisa.
          </h2>
          <p className="mt-4 text-lg text-slate">
            O RH vê a empresa toda. O gestor vê a própria equipe. O colaborador vê o que é dele.
          </p>
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
      <Reveal className="mx-auto grid max-w-6xl gap-10 rounded-[20px] bg-banner p-8 text-banner-ink sm:p-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl sm:leading-[1.1]">
          Os dados da sua equipe ficam com a sua empresa.
        </h2>
        <ul className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
          {items.map(({ icon: Icon, title, text }) => (
            <li key={title} className="grid gap-1.5">
              <Icon size={28} weight="duotone" aria-hidden />
              <p className="mt-1 font-semibold">{title}</p>
              <p className="opacity-80">{text}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

const phases: { name: string; state?: "done" | "now" }[] = [
  { name: "Planejamento", state: "done" },
  { name: "Fundação técnica", state: "now" },
  { name: "Login e permissões" },
  { name: "Colaboradores" },
  { name: "Documentos" },
  { name: "Férias" },
  { name: "Benefícios" },
  { name: "Onboarding" },
  { name: "Ponto" },
  { name: "Auditoria e relatórios" },
  { name: "Revisão de qualidade" },
];

function Progress() {
  return (
    <section id="andamento" className="px-4 py-24 sm:px-6">
      <Reveal className="mx-auto max-w-6xl">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-[2.75rem] sm:leading-[1.1]">
          Em construção, uma parte de cada vez.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-slate">Veja o que já está pronto e o que vem a seguir.</p>
      </Reveal>
      <ol
        aria-label="Etapas do projeto"
        className="mx-auto mt-10 flex max-w-6xl snap-x snap-mandatory gap-3 overflow-x-auto pb-4"
      >
        {phases.map((p) => (
          <li
            key={p.name}
            className={`grid w-44 shrink-0 snap-start content-between gap-6 rounded-xl border p-5 ${
              p.state === "now" ? "border-accent bg-canvas ring-4 ring-accent/15" : "border-hairline bg-canvas"
            }`}
          >
            <p className={`font-semibold leading-snug ${p.state ? "" : "text-slate"}`}>{p.name}</p>
            {p.state === "done" && (
              <span className="justify-self-start rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-mint-ink">
                Pronto
              </span>
            )}
            {p.state === "now" && (
              <span className="justify-self-start rounded-full bg-sky px-2.5 py-1 text-xs font-semibold text-sky-ink">
                Em andamento
              </span>
            )}
            {!p.state && <span className="text-xs text-slate">A seguir</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Access() {
  return (
    <section id="acesso" className="px-4 pb-24 sm:px-6">
      <Reveal className="mx-auto grid max-w-6xl items-center gap-12 rounded-[20px] border border-hairline bg-surface p-8 sm:p-12 md:grid-cols-2">
        <div className="grid gap-6">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl sm:leading-[1.1]">
            Quer usar o Lobby na sua empresa?
          </h2>
          <p className="text-lg text-slate">Deixe seu e-mail. Avisamos quando abrirmos as primeiras vagas.</p>
          <WaitlistForm />
        </div>
        <div className="grid grid-cols-4 justify-items-center gap-4" aria-hidden>
          {people.map((p, i) => (
            <div key={p.slug} className={i % 2 ? "translate-y-6" : ""}>
              <Avatar slug={p.slug} size={84} decorative />
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-hairline px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-slate">
        <Logo />
        <p>Gestão de pessoas para empresas brasileiras.</p>
        <p>© 2026 Lobby</p>
      </div>
    </footer>
  );
}
