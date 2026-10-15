"use client";

import { createEmployeeSchema, updateEmployeeSchema, type EmployeeDto } from "@lobby/types";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormField, SelectField } from "@/components/common/form-field";
import { errorMessage } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useOptions } from "@/features/org-structure/api";
import { emptyAsNull } from "@/lib/forms";
import { STATUS_LABEL } from "@/lib/labels";
import { useCreateEmployee, useUpdateEmployee } from "./api";

type Values = Record<string, string>;

const fromEmployee = (e: EmployeeDto): Values => ({
  firstName: e.firstName,
  lastName: e.lastName,
  preferredName: e.preferredName ?? "",
  email: e.email,
  phone: e.phone ?? "",
  birthDate: e.birthDate ?? "",
  document: e.document ?? "",
  hireDate: e.hireDate,
  // Status can't change after termination, so it isn't part of that form.
  ...(e.status !== "TERMINATED" && { status: e.status }),
  departmentId: e.department?.id ?? "",
  positionId: e.position?.id ?? "",
  branchId: e.branch?.id ?? "",
  managerId: e.manager?.id ?? "",
});

// Create and edit share the form; editing sends every field (the API accepts a partial update).
export function EmployeeForm({ employee }: { employee?: EmployeeDto }) {
  const router = useRouter();
  const create = useCreateEmployee();
  const update = useUpdateEmployee(employee?.id ?? "");
  const save = employee ? update : create;
  const terminated = employee?.status === "TERMINATED";

  const departments = useOptions("departments");
  const positions = useOptions("positions");
  const branches = useOptions("branches");
  const employees = useOptions("employees");

  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: emptyAsNull(employee ? updateEmployeeSchema : createEmployeeSchema),
    defaultValues: employee ? fromEmployee(employee) : { status: "ACTIVE" },
  });
  const e = formState.errors;

  const onSubmit = handleSubmit((body) =>
    save.mutate(body as never, { onSuccess: (saved) => router.push(`/employees/${saved?.id ?? employee?.id}`) }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-3xl gap-8">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-medium">Dados pessoais</legend>
        <FormField
          id="firstName"
          label="Nome"
          autoComplete="off"
          error={e.firstName?.message}
          {...register("firstName")}
        />
        <FormField
          id="lastName"
          label="Sobrenome"
          autoComplete="off"
          error={e.lastName?.message}
          {...register("lastName")}
        />
        <FormField
          id="preferredName"
          label="Nome social ou apelido"
          hint="Usado no lugar do nome em todo o Lobby."
          error={e.preferredName?.message}
          {...register("preferredName")}
        />
        <FormField id="email" label="E-mail" type="email" error={e.email?.message} {...register("email")} />
        <FormField id="phone" label="Telefone" type="tel" error={e.phone?.message} {...register("phone")} />
        <FormField
          id="birthDate"
          label="Data de nascimento"
          type="date"
          error={e.birthDate?.message}
          {...register("birthDate")}
        />
        <FormField
          id="document"
          label="CPF"
          inputMode="numeric"
          placeholder="000.000.000-00"
          error={e.document?.message}
          {...register("document")}
        />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-medium">Trabalho</legend>
        <FormField
          id="hireDate"
          label="Data de admissão"
          type="date"
          error={e.hireDate?.message}
          {...register("hireDate")}
        />
        {!terminated && (
          <SelectField
            id="status"
            label="Status"
            options={(["PENDING", "ACTIVE", "ON_LEAVE"] as const).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            error={e.status?.message}
            {...register("status")}
          />
        )}
        <SelectField
          id="departmentId"
          label="Departamento"
          placeholder="Nenhum"
          options={departments.data ?? []}
          {...register("departmentId")}
        />
        <SelectField
          id="positionId"
          label="Cargo"
          placeholder="Nenhum"
          options={positions.data ?? []}
          {...register("positionId")}
        />
        <SelectField
          id="branchId"
          label="Filial"
          placeholder="Nenhuma"
          options={branches.data ?? []}
          {...register("branchId")}
        />
        <SelectField
          id="managerId"
          label="Gestor direto"
          placeholder="Ninguém"
          options={(employees.data ?? []).filter((o) => o.value !== employee?.id)}
          error={e.managerId?.message}
          {...register("managerId")}
        />
      </fieldset>

      {save.isError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage(save.error)}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={save.isPending}>
          {save.isPending ? "Salvando…" : employee ? "Salvar alterações" : "Adicionar colaborador"}
        </Button>
        <Button type="button" size="lg" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
