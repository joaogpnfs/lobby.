"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginInput } from "@lobby/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { authErrorMessage, safeNext, useLogin } from "../api";
import { FormField as Field } from "@/components/common/form-field";

const LINKEDIN_RESULT: Record<string, string> = {
  "not-linked":
    "Este LinkedIn não está conectado a nenhuma conta. Entre com e-mail e senha e conecte em Configurações.",
  error: "Não foi possível entrar com o LinkedIn. Tente de novo.",
};

export function LoginForm({ next, linkedin }: { next?: string; linkedin?: { result?: string } }) {
  const router = useRouter();
  const login = useLogin();
  const { register, handleSubmit, formState } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((values) => login.mutate(values, { onSuccess: () => router.replace(safeNext(next)) }));

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <div className="grid gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="text-muted-foreground">Use o e-mail e a senha da sua conta.</p>
      </div>

      <Field
        id="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        autoFocus
        error={formState.errors.email?.message}
        {...register("email")}
      />
      <Field
        id="password"
        label="Senha"
        type="password"
        autoComplete="current-password"
        error={formState.errors.password?.message}
        {...register("password")}
      />

      {linkedin?.result && LINKEDIN_RESULT[linkedin.result] && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {LINKEDIN_RESULT[linkedin.result]}
        </p>
      )}

      {login.isError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {authErrorMessage(login.error)}
        </p>
      )}

      <Button type="submit" size="lg" className="h-10" disabled={login.isPending}>
        {login.isPending ? "Entrando…" : "Entrar"}
      </Button>

      {linkedin && (
        <a
          href="/api/v1/auth/linkedin/login"
          className={buttonVariants({ variant: "outline", size: "lg", className: "h-10" })}
        >
          Entrar com LinkedIn
        </a>
      )}

      <p className="text-sm text-muted-foreground">
        Ainda não usa o Lobby?{" "}
        <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
          Criar conta da empresa
        </Link>
      </p>
    </form>
  );
}
