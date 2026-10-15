import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/login" className="w-fit text-xl font-bold tracking-tight">
          lobby<span className="text-primary">.</span>
        </Link>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</main>
      </div>
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-end lg:p-14">
        <p
          aria-hidden
          className="absolute -top-10 -right-6 text-[16rem] leading-none font-bold tracking-tighter opacity-15"
        >
          lobby.
        </p>
        <p className="max-w-md text-3xl leading-tight font-semibold tracking-tight">
          Admissão, férias, documentos e ponto da sua equipe, num lugar só.
        </p>
        <p className="mt-4 max-w-sm text-primary-foreground/75">
          Cada empresa vê só os próprios dados, e cada pessoa vê só o que o papel dela permite.
        </p>
      </aside>
    </div>
  );
}
