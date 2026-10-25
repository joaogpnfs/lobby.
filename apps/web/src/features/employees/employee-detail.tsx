"use client";

import { terminateEmployeeSchema, type EmployeeDto, type TerminateEmployeeInput } from "@lobby/types";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FormField, TextareaField } from "@/components/common/form-field";
import { ErrorState, LoadingState, errorMessage } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InviteDialog } from "@/features/access/invite-dialog";
import { useCan } from "@/features/auth/api";
import { EmployeeDocuments } from "@/features/documents/documents-list";
import { formatDate } from "@/lib/labels";
import { useDeleteEmployee, useEmployee, useTerminateEmployee } from "./api";
import { ProfessionalProfileSection } from "./professional-profile";

export function EmployeeDetail({ id }: { id: string }) {
  const employee = useEmployee(id);
  if (employee.isPending) return <LoadingState rows={6} />;
  if (employee.isError) return <ErrorState error={employee.error} onRetry={() => employee.refetch()} />;
  return <Profile employee={employee.data} />;
}

function Profile({ employee: e }: { employee: EmployeeDto }) {
  const can = useCan();
  const router = useRouter();
  const remove = useDeleteEmployee(e.id);
  const active = e.status !== "TERMINATED";

  return (
    <div className="grid max-w-4xl gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <Link href="/employees" className="text-sm text-muted-foreground hover:underline">
            Colaboradores
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{e.name}</h1>
            <StatusBadge status={e.status} />
          </div>
          <p className="text-muted-foreground">
            {[e.position?.name, e.department?.name].filter(Boolean).join(" · ") || e.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("employees:update") && (
            <Link href={`/employees/${e.id}/edit`} className={buttonVariants({ variant: "outline" })}>
              Editar
            </Link>
          )}
          {can("users:invite") && active && !e.hasAccess && (
            <InviteDialog
              trigger={<Button variant="outline" />}
              employee={{ id: e.id, email: e.email, name: e.name }}
            />
          )}
          {can("employees:update") && active && <TerminateDialog employee={e} />}
          {can("employees:delete") && (
            <ConfirmDialog
              trigger={<Button variant="ghost" className="text-destructive" />}
              triggerLabel="Excluir"
              title={`Excluir ${e.name}?`}
              description="O colaborador some das listas e perde o acesso. O histórico continua na auditoria. Para quem saiu da empresa, prefira o desligamento."
              confirmLabel="Excluir"
              pending={remove.isPending}
              onConfirm={() => remove.mutate(undefined, { onSuccess: () => router.replace("/employees") })}
            />
          )}
        </div>
      </div>
      {remove.isError && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(remove.error)}
        </p>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <Section title="Trabalho">
          <Item label="E-mail">{e.email}</Item>
          <Item label="Admissão">{formatDate(e.hireDate)}</Item>
          <Item label="Cargo">{e.position?.name}</Item>
          <Item label="Departamento">{e.department?.name}</Item>
          <Item label="Filial">{e.branch?.name}</Item>
          <Item label="Gestor direto">
            {e.manager && (
              <Link href={`/employees/${e.manager.id}`} className="hover:underline">
                {e.manager.name}
              </Link>
            )}
          </Item>
          <Item label="Acesso ao Lobby">{e.hasAccess ? "Sim" : "Ainda não"}</Item>
        </Section>
        <Section title="Dados pessoais">
          <Item label="Nome completo">{`${e.firstName} ${e.lastName}`}</Item>
          <Item label="Nome social ou apelido">{e.preferredName}</Item>
          <Item label="CPF">{e.document}</Item>
          <Item label="Nascimento">{e.birthDate && formatDate(e.birthDate)}</Item>
          <Item label="Telefone">{e.phone}</Item>
        </Section>
        {e.status === "TERMINATED" && (
          <Section title="Desligamento">
            <Item label="Data">{formatDate(e.terminationDate)}</Item>
            <Item label="Motivo">{e.terminationReason}</Item>
          </Section>
        )}
        <Section title={`Equipe direta (${e.reports.length})`}>
          {e.reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ninguém responde diretamente a esta pessoa.</p>
          ) : (
            <ul className="grid gap-1">
              {e.reports.map((r) => (
                <li key={r.id}>
                  <Link href={`/employees/${r.id}`} className="hover:underline">
                    {r.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
      <ProfessionalProfileSection employee={e} />
      <EmployeeDocuments employee={{ id: e.id, name: e.name }} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid content-start gap-3">
      <h2 className="font-medium">{title}</h2>
      <dl className="grid gap-3 rounded-xl border p-4">{children}</dl>
    </section>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children || "—"}</dd>
    </div>
  );
}

function TerminateDialog({ employee }: { employee: EmployeeDto }) {
  const terminate = useTerminateEmployee(employee.id);
  const { register, handleSubmit, formState } = useForm<TerminateEmployeeInput>({
    resolver: zodResolver(terminateEmployeeSchema),
    defaultValues: { terminationDate: new Date().toISOString().slice(0, 10) },
  });

  return (
    <Dialog onOpenChange={(open) => !open && terminate.reset()}>
      <DialogTrigger render={<Button variant="outline" />}>Desligar</DialogTrigger>
      <DialogContent>
        <form noValidate className="grid gap-4" onSubmit={handleSubmit((v) => terminate.mutate(v))}>
          <DialogHeader>
            <DialogTitle>Desligar {employee.name}</DialogTitle>
            <DialogDescription>
              O registro continua no Lobby com status Desligado, e o acesso da pessoa ao sistema é cortado na hora.
            </DialogDescription>
          </DialogHeader>
          <FormField
            id="terminationDate"
            label="Data do desligamento"
            type="date"
            error={formState.errors.terminationDate?.message}
            {...register("terminationDate")}
          />
          <TextareaField id="reason" label="Motivo" error={formState.errors.reason?.message} {...register("reason")} />
          {terminate.isError && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(terminate.error)}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={terminate.isPending}>
              {terminate.isPending ? "Desligando…" : "Confirmar desligamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
