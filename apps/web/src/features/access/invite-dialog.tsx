"use client";

import {
  createInvitationSchema,
  ROLES,
  type CreatedInvitation,
  type CreateInvitationInput,
  type Role,
} from "@lobby/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { FormField, SelectField } from "@/components/common/form-field";
import { errorMessage } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMe } from "@/features/auth/api";
import { ROLE_LABEL } from "@/lib/labels";
import { useInvite } from "./api";

export function InviteDialog({
  trigger,
  employee,
}: {
  trigger: ReactElement;
  employee?: { id: string; email: string; name: string };
}) {
  const me = useMe();
  const invite = useInvite();
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [copied, setCopied] = useState(false);
  const roles = ROLES.filter((r) => r !== "ORG_ADMIN" || me.data?.role === "ORG_ADMIN");

  const { register, handleSubmit, formState, reset } = useForm<CreateInvitationInput>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: { email: employee?.email ?? "", role: "EMPLOYEE" satisfies Role, employeeId: employee?.id },
  });

  const onOpenChange = (open: boolean) => {
    if (open) return;
    setCreated(null);
    setCopied(false);
    invite.reset();
    reset();
  };

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger}>{employee ? "Dar acesso" : "Convidar pessoa"}</DialogTrigger>
      <DialogContent>
        {created ? (
          <div className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Convite criado</DialogTitle>
              <DialogDescription>
                Envie este link para {created.email}. Ele vale por 7 dias e só pode ser usado uma vez.
              </DialogDescription>
            </DialogHeader>
            <Input readOnly value={created.url} aria-label="Link do convite" onFocus={(e) => e.target.select()} />
            <DialogFooter>
              <Button onClick={() => navigator.clipboard.writeText(created.url).then(() => setCopied(true))}>
                {copied ? "Link copiado" : "Copiar link"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            noValidate
            className="grid gap-4"
            onSubmit={handleSubmit((values) => invite.mutate(values, { onSuccess: setCreated }))}
          >
            <DialogHeader>
              <DialogTitle>{employee ? `Dar acesso a ${employee.name}` : "Convidar pessoa"}</DialogTitle>
              <DialogDescription>A pessoa recebe um link para criar a senha e entrar.</DialogDescription>
            </DialogHeader>
            <FormField
              id="invite-email"
              label="E-mail"
              type="email"
              readOnly={!!employee}
              error={formState.errors.email?.message}
              {...register("email")}
            />
            <SelectField
              id="invite-role"
              label="Papel"
              hint="Define o que a pessoa pode ver e fazer."
              options={roles.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
              {...register("role")}
            />
            {invite.isError && (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage(invite.error)}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending ? "Criando…" : "Criar convite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
