"use client";

import { useState, type FormEvent } from "react";
import { ArrowRightIcon, CircleNotchIcon } from "@phosphor-icons/react";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

export function WaitlistForm() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email");
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json: { success: boolean; error?: { message: string } } = await res.json();
      setState(json.success ? { kind: "done" } : { kind: "error", message: json.error?.message ?? "Tente de novo." });
    } catch {
      setState({ kind: "error", message: "Sem conexão. Tente de novo em instantes." });
    }
  }

  if (state.kind === "done") {
    return (
      <p role="status" className="rounded-lg bg-mint px-4 py-3 font-medium text-mint-ink">
        Pronto. Avisamos você assim que abrirmos as primeiras vagas.
      </p>
    );
  }

  const error = state.kind === "error" ? state.message : null;

  return (
    <form onSubmit={onSubmit} className="grid w-full max-w-md gap-2">
      <label htmlFor="waitlist-email" className="text-sm font-medium text-charcoal">
        E-mail de trabalho
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="waitlist-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "waitlist-error" : undefined}
          className="h-11 min-w-0 flex-1 rounded-lg border border-hairline-strong bg-canvas px-3.5 text-ink placeholder:text-slate focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="voce@empresa.com.br"
        />
        <button
          type="submit"
          disabled={state.kind === "sending"}
          className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent px-5 font-medium text-on-accent transition hover:bg-accent-pressed active:scale-[0.98] disabled:opacity-70"
        >
          {state.kind === "sending" ? (
            <CircleNotchIcon size={18} className="animate-spin" aria-hidden />
          ) : (
            <ArrowRightIcon size={18} weight="bold" aria-hidden />
          )}
          Pedir acesso
        </button>
      </div>
      {error && (
        <p id="waitlist-error" className="text-sm font-medium text-rose-ink">
          {error}
        </p>
      )}
    </form>
  );
}
