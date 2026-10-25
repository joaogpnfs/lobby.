"use client";

import { createVacationSchema, vacationDays, type CreateVacationInput } from "@lobby/types";
import { useState, type ReactElement } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FormField, TextareaField } from "@/components/common/form-field";
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
import { ApiError } from "@/lib/api-client";
import { emptyAsNull } from "@/lib/forms";
import { useRequestVacation } from "./api";

const requestFailed = (error: unknown) => {
  if (error instanceof ApiError && error.code === "CONFLICT") {
    return "Estas datas cruzam com outro pedido seu. Escolha outro período ou cancele o pedido anterior.";
  }
  if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
    return "As férias precisam começar hoje ou depois. Revise as datas.";
  }
  return errorMessage(error);
};

export function RequestVacationDialog({ trigger }: { trigger: ReactElement }) {
  const [open, setOpen] = useState(false);
  const create = useRequestVacation();
  const { register, handleSubmit, formState, reset, control } = useForm<CreateVacationInput>({
    resolver: emptyAsNull<CreateVacationInput>(createVacationSchema),
    defaultValues: { startDate: "", endDate: "", reason: "" },
  });

  const [start, end] = useWatch({ control, name: ["startDate", "endDate"] });
  const days = start && end && end >= start ? vacationDays(start, end) : null;

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) return;
    create.reset();
    reset();
  };

  const submit = handleSubmit((values) => create.mutate(values, { onSuccess: () => onOpenChange(false) }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger}>Pedir férias</DialogTrigger>
      <DialogContent>
        <form noValidate className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Pedir férias</DialogTitle>
            <DialogDescription>
              De 5 a 30 dias corridos. Seu gestor recebe o pedido e você é avisado quando ele decidir.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="vacation-start"
              label="Primeiro dia"
              type="date"
              error={formState.errors.startDate && "Escolha o primeiro dia"}
              {...register("startDate")}
            />
            <FormField
              id="vacation-end"
              label="Último dia"
              type="date"
              error={formState.errors.endDate && (formState.errors.endDate.message || "Escolha o último dia")}
              {...register("endDate")}
            />
          </div>
          <p role="status" className="text-sm text-muted-foreground tabular-nums">
            {days ? `${days} ${days === 1 ? "dia" : "dias"} corridos` : ""}
          </p>
          <TextareaField
            id="vacation-reason"
            label="Observação"
            hint="Opcional. Aparece para quem vai aprovar."
            rows={3}
            {...register("reason")}
          />
          {create.isError && (
            <p role="alert" className="text-sm text-destructive">
              {requestFailed(create.error)}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Enviando…" : "Enviar pedido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
