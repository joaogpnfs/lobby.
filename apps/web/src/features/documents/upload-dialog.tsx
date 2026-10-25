"use client";

import {
  createDocumentSchema,
  DOCUMENT_MIME_TYPES,
  DOCUMENT_TYPES,
  MAX_DOCUMENT_SIZE,
  type CreateDocumentInput,
} from "@lobby/types";
import { useState, type ChangeEvent, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { useOptions } from "@/features/org-structure/api";
import { ApiError } from "@/lib/api-client";
import { emptyAsNull } from "@/lib/forms";
import { DOCUMENT_TYPE_LABEL } from "@/lib/labels";
import { useUploadDocument } from "./api";

type Values = Omit<CreateDocumentInput, "mimeType" | "size"> & { file: FileList };

const accepted = new Set<string>(DOCUMENT_MIME_TYPES);

const schema = createDocumentSchema.omit({ mimeType: true, size: true }).extend({
  file: z
    .custom<FileList>((v) => (v as FileList | undefined)?.length === 1, "Escolha um arquivo")
    .refine((l) => accepted.has(l[0]!.type), "Envie um arquivo PDF, JPG, PNG, WEBP ou DOCX")
    .refine((l) => l[0]!.size <= MAX_DOCUMENT_SIZE, "Escolha um arquivo de até 20 MB"),
});

const uploadFailed = (error: unknown) =>
  error instanceof ApiError && error.code !== "VALIDATION_ERROR"
    ? errorMessage(error)
    : "Não foi possível enviar o arquivo. Escolha-o de novo e tente outra vez.";

export function UploadDialog({
  trigger,
  employee,
}: {
  trigger: ReactElement;
  employee?: { id: string; name: string };
}) {
  const [open, setOpen] = useState(false);
  const upload = useUploadDocument();
  const employees = useOptions("employees");

  const { register, handleSubmit, formState, reset, setValue, getValues } = useForm<Values>({
    resolver: emptyAsNull<Values>(schema),
    defaultValues: { employeeId: employee?.id ?? "", name: "", type: "OTHER", expiresAt: "" },
  });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) return;
    upload.reset();
    reset();
  };

  const submit = handleSubmit(({ file, ...values }) =>
    upload.mutate({ ...values, file: file[0]! }, { onSuccess: () => onOpenChange(false) }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger}>Enviar documento</DialogTrigger>
      <DialogContent>
        <form noValidate className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{employee ? `Enviar documento de ${employee.name}` : "Enviar documento"}</DialogTitle>
            <DialogDescription>
              PDF, imagem ou DOCX de até 20 MB. Só o RH e a própria pessoa podem abrir.
            </DialogDescription>
          </DialogHeader>
          <FormField
            id="document-file"
            label="Arquivo"
            type="file"
            accept={DOCUMENT_MIME_TYPES.join(",")}
            className="pt-2"
            error={formState.errors.file?.message}
            {...register("file", {
              onChange: (e: ChangeEvent<HTMLInputElement>) => {
                const picked = e.target.files?.[0];
                if (picked && !getValues("name")) setValue("name", picked.name);
              },
            })}
          />
          {!employee && (
            <SelectField
              id="document-employee"
              label="Colaborador"
              placeholder="Escolha"
              options={employees.data ?? []}
              error={formState.errors.employeeId && "Escolha o colaborador"}
              {...register("employeeId")}
            />
          )}
          <FormField
            id="document-name"
            label="Nome do documento"
            error={formState.errors.name?.message}
            {...register("name")}
          />
          <SelectField
            id="document-type"
            label="Tipo"
            options={DOCUMENT_TYPES.map((t) => ({ value: t, label: DOCUMENT_TYPE_LABEL[t] }))}
            {...register("type")}
          />
          <FormField
            id="document-expires"
            label="Vencimento"
            type="date"
            hint="Opcional. Para ASO, CNH, certificados e afins."
            error={formState.errors.expiresAt?.message}
            {...register("expiresAt")}
          />
          {upload.isError && (
            <p role="alert" className="text-sm text-destructive">
              {uploadFailed(upload.error)}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={upload.isPending}>
              {upload.isPending ? "Enviando…" : "Enviar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
