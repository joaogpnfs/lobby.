"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { registerSchema, type RegisterInput } from "@lobby/types";
import { Button } from "@/components/ui/button";
import { authErrorMessage, useRegister } from "../api";
import { FormField as Field } from "@/components/common/form-field";

export function RegisterForm() {
  const router = useRouter();
  const registration = useRegister();
  const { register, handleSubmit, formState } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) =>
    registration.mutate(values, { onSuccess: () => router.replace("/dashboard") }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <div className="grid gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Criar conta da empresa</h1>
        <p className="text-muted-foreground">Você entra como administrador e convida o RH depois.</p>
      </div>

      <Field
        id="organizationName"
        label="Nome da empresa"
        autoComplete="organization"
        autoFocus
        error={errors.organizationName?.message}
        {...register("organizationName")}
      />
      <Field id="name" label="Seu nome" autoComplete="name" error={errors.name?.message} {...register("name")} />
      <Field
        id="email"
        label="E-mail de trabalho"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Field
        id="password"
        label="Senha"
        type="password"
        autoComplete="new-password"
        hint="Pelo menos 8 caracteres."
        error={errors.password?.message}
        {...register("password")}
      />

      {registration.isError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {authErrorMessage(registration.error)}
        </p>
      )}

      <Button type="submit" size="lg" className="h-10" disabled={registration.isPending}>
        {registration.isPending ? "Criando conta…" : "Criar conta"}
      </Button>

      <p className="text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </form>
  );
}
