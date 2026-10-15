"use client";

import { acceptInvitationSchema, type AcceptInvitationInput } from "@lobby/types";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/common/form-field";
import { LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { authErrorMessage } from "@/features/auth/api";
import { ROLE_LABEL } from "@/lib/labels";
import { useAcceptInvitation, useInvitationPreview } from "./api";

export function AcceptInvitation({ token }: { token: string }) {
  const router = useRouter();
  const preview = useInvitationPreview(token);
  const accept = useAcceptInvitation();
  const { register, handleSubmit, formState } = useForm<AcceptInvitationInput>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { token },
  });

  if (preview.isPending) return <LoadingState rows={3} />;
  if (preview.isError) {
    return (
      <div className="grid gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Convite inválido</h1>
        <p className="text-muted-foreground">
          Este link expirou, já foi usado ou foi cancelado. Peça um novo convite para quem enviou.
        </p>
        <Link href="/login" className="text-sm font-medium underline underline-offset-4">
          Ir para o login
        </Link>
      </div>
    );
  }

  const { organizationName, email, role, hasAccount } = preview.data;
  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={handleSubmit((v) => accept.mutate(v, { onSuccess: () => router.replace("/dashboard") }))}
    >
      <div className="grid gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar em {organizationName}</h1>
        <p className="text-muted-foreground">
          Você foi convidado como {ROLE_LABEL[role].toLowerCase()} com o e-mail {email}.
          {hasAccount ? " Confirme a senha da sua conta Lobby." : " Crie sua senha para começar."}
        </p>
      </div>
      {!hasAccount && (
        <FormField
          id="name"
          label="Seu nome"
          autoComplete="name"
          autoFocus
          error={formState.errors.name?.message}
          {...register("name")}
        />
      )}
      <FormField
        id="password"
        label="Senha"
        type="password"
        autoComplete={hasAccount ? "current-password" : "new-password"}
        hint={hasAccount ? undefined : "Pelo menos 8 caracteres."}
        error={formState.errors.password?.message}
        {...register("password")}
      />
      {accept.isError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {authErrorMessage(accept.error)}
        </p>
      )}
      <Button type="submit" size="lg" className="h-10" disabled={accept.isPending}>
        {accept.isPending ? "Entrando…" : "Aceitar convite"}
      </Button>
    </form>
  );
}
