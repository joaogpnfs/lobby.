import { ApiStatus } from "@/features/health/api-status";

export default function Home() {
  return (
    <main className="mx-auto grid w-full max-w-md gap-6 px-4 py-24">
      <h1 className="text-3xl font-bold tracking-tight">
        lobby<span className="text-primary">.</span>
      </h1>
      <p className="text-muted-foreground">Fundação técnica pronta. As telas chegam a partir da Fase 2.</p>
      <ApiStatus />
    </main>
  );
}
