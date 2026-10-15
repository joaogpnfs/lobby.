"use client";

import { updateOrganizationSchema, type OrganizationDto, type Role } from "@lobby/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable } from "@/components/common/data-table";
import { FormField } from "@/components/common/form-field";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingState, errorMessage } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useInvitations, useMembers, useRevokeInvitation, useUpdateMember } from "@/features/access/api";
import { InviteDialog } from "@/features/access/invite-dialog";
import { meKey, useCan, useMe } from "@/features/auth/api";
import { apiFetch } from "@/lib/api-client";
import { emptyAsNull } from "@/lib/forms";
import { ROLE_LABEL, formatDate } from "@/lib/labels";

export function SettingsPage() {
  const can = useCan();
  return (
    <div className="grid max-w-4xl gap-10">
      <PageHeader title="Configurações" description="Dados da empresa e quem tem acesso ao Lobby." />
      <OrganizationSection />
      {can("users:invite") && <AccessSection />}
    </div>
  );
}

function OrganizationSection() {
  const can = useCan();
  const org = useQuery({ queryKey: ["organization"], queryFn: () => apiFetch<OrganizationDto>("/organizations/me") });
  if (org.isPending) return <LoadingState rows={3} />;
  if (org.isError) return <ErrorState error={org.error} onRetry={() => org.refetch()} />;
  return <OrganizationForm org={org.data} readOnly={!can("organization:update")} />;
}

function OrganizationForm({ org, readOnly }: { org: OrganizationDto; readOnly: boolean }) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (body: object) =>
      apiFetch<OrganizationDto>("/organizations/me", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (data) => {
      queryClient.setQueryData(["organization"], data);
      void queryClient.invalidateQueries({ queryKey: meKey });
    },
  });
  const { register, handleSubmit, formState } = useForm<Record<string, string>>({
    resolver: emptyAsNull(updateOrganizationSchema),
    defaultValues: {
      name: org.name,
      legalName: org.legalName ?? "",
      document: org.document ?? "",
      email: org.email ?? "",
      phone: org.phone ?? "",
    },
  });
  const e = formState.errors;

  return (
    <section className="grid gap-4">
      <h2 className="text-lg font-medium">Empresa</h2>
      <form noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
          <FormField id="org-name" label="Nome" error={e.name?.message} {...register("name")} />
          <FormField id="org-legalName" label="Razão social" error={e.legalName?.message} {...register("legalName")} />
          <FormField id="org-document" label="CNPJ" error={e.document?.message} {...register("document")} />
          <FormField
            id="org-email"
            label="E-mail de contato"
            type="email"
            error={e.email?.message}
            {...register("email")}
          />
          <FormField id="org-phone" label="Telefone" type="tel" error={e.phone?.message} {...register("phone")} />
        </fieldset>
        {save.isError && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(save.error)}
          </p>
        )}
        {!readOnly && (
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar"}
            </Button>
            {save.isSuccess && !formState.isDirty && <span className="text-sm text-muted-foreground">Salvo.</span>}
          </div>
        )}
      </form>
    </section>
  );
}

function AccessSection() {
  const can = useCan();
  const me = useMe();
  const members = useMembers();
  const invitations = useInvitations();
  const update = useUpdateMember();
  const revoke = useRevokeInvitation();
  const canManage = can("users:manage");

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Acessos</h2>
          <p className="text-sm text-muted-foreground">Quem entra no Lobby e com qual papel.</p>
        </div>
        <InviteDialog trigger={<Button />} />
      </div>

      {members.isPending ? (
        <LoadingState rows={3} />
      ) : members.isError ? (
        <ErrorState error={members.error} onRetry={() => members.refetch()} />
      ) : (
        <DataTable
          rows={members.data.items}
          columns={[
            { header: "Nome", cell: (m) => m.name },
            { header: "E-mail", cell: (m) => m.email },
            {
              header: "Papel",
              cell: (m) =>
                canManage && m.email !== me.data?.user.email ? (
                  <select
                    aria-label={`Papel de ${m.name}`}
                    className="h-8 rounded-md border bg-transparent px-2 text-sm"
                    value={m.role}
                    onChange={(ev) => update.mutate({ id: m.id, role: ev.target.value as Role })}
                  >
                    {Object.entries(ROLE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : (
                  ROLE_LABEL[m.role]
                ),
            },
            {
              header: "Situação",
              cell: (m) => (
                <Badge variant={m.status === "ACTIVE" ? "secondary" : "outline"}>
                  {m.status === "ACTIVE" ? "Ativo" : "Sem acesso"}
                </Badge>
              ),
            },
          ]}
          actions={
            canManage
              ? (m) =>
                  m.email === me.data?.user.email ? null : m.status === "ACTIVE" ? (
                    <ConfirmDialog
                      trigger={<Button variant="ghost" size="sm" className="text-destructive" />}
                      triggerLabel="Remover acesso"
                      title={`Remover o acesso de ${m.name}?`}
                      description="A pessoa sai do Lobby na hora. O cadastro de colaborador, se houver, continua."
                      confirmLabel="Remover acesso"
                      onConfirm={() => update.mutate({ id: m.id, status: "DISABLED" })}
                    />
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => update.mutate({ id: m.id, status: "ACTIVE" })}>
                      Reativar
                    </Button>
                  )
              : undefined
          }
        />
      )}
      {update.isError && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(update.error)}
        </p>
      )}

      <h3 className="mt-4 font-medium">Convites pendentes</h3>
      {invitations.isPending ? (
        <LoadingState rows={2} />
      ) : invitations.isError ? (
        <ErrorState error={invitations.error} onRetry={() => invitations.refetch()} />
      ) : invitations.data.length === 0 ? (
        <EmptyState title="Nenhum convite pendente" description="Convites aceitos viram acessos na tabela acima." />
      ) : (
        <DataTable
          rows={invitations.data}
          columns={[
            { header: "E-mail", cell: (i) => i.email },
            { header: "Papel", cell: (i) => ROLE_LABEL[i.role] },
            { header: "Vale até", cell: (i) => formatDate(i.expiresAt.slice(0, 10)) },
          ]}
          actions={(i) => (
            <Button variant="ghost" size="sm" disabled={revoke.isPending} onClick={() => revoke.mutate(i.id)}>
              Cancelar convite
            </Button>
          )}
        />
      )}
    </section>
  );
}
