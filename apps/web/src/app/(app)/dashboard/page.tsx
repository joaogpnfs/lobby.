import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Início · lobby." };

export default function DashboardPage() {
  return (
    <div className="grid max-w-xl gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Início</h1>
      <p className="text-muted-foreground">Para montar a empresa no Lobby, o caminho mais curto é:</p>
      <ol className="grid list-decimal gap-2 pl-5">
        <li>
          Criar os{" "}
          <Link href="/departments" className="underline underline-offset-4">
            departamentos
          </Link>
          ,{" "}
          <Link href="/positions" className="underline underline-offset-4">
            cargos
          </Link>{" "}
          e{" "}
          <Link href="/branches" className="underline underline-offset-4">
            filiais
          </Link>
          .
        </li>
        <li>
          Adicionar os{" "}
          <Link href="/employees" className="underline underline-offset-4">
            colaboradores
          </Link>{" "}
          e quem é gestor de quem.
        </li>
        <li>
          Convidar o RH e os gestores em{" "}
          <Link href="/settings" className="underline underline-offset-4">
            Configurações
          </Link>
          .
        </li>
      </ol>
    </div>
  );
}
