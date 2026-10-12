"use client";

import { useHealth } from "./queries";

// Temporary home content (Phase 1): proves web → rewrite → API → db/redis end to end.
export function ApiStatus() {
  const { data, isPending, isError, error } = useHealth();

  if (isPending) return <p className="text-muted-foreground">Verificando a API…</p>;
  if (isError) return <p className="text-destructive">API indisponível: {error.message}</p>;

  const items = [
    ["API", data.status === "ok" ? "ok" : "com problemas"],
    ["Banco de dados", data.db],
    ["Redis", data.redis],
  ];
  return (
    <ul className="grid gap-2">
      {items.map(([label, value]) => (
        <li key={label} className="flex justify-between gap-8 rounded-lg border px-4 py-3">
          <span>{label}</span>
          <span className={value === "ok" ? "font-medium text-primary" : "font-medium text-destructive"}>{value}</span>
        </li>
      ))}
    </ul>
  );
}
