"use client";

import { MAX_PROFILE_PDF_SIZE, type EmployeeDto, type ProfessionalProfile, type ProfileImport } from "@lobby/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FormField } from "@/components/common/form-field";
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
import { apiFetch } from "@/lib/api-client";

const yearMonth = (value: string | null) => (value ? value.split("-").reverse().join("/") : "atual");

export function ProfessionalProfileSection({ employee: e }: { employee: EmployeeDto }) {
  const profile = e.professionalProfile;
  return (
    <section className="grid content-start gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium">Perfil profissional</h2>
        {e.canEditProfile && <ImportDialog employee={e} />}
      </div>
      {profile || e.linkedinUrl ? (
        <div className="grid gap-5 rounded-xl border p-4">
          {e.linkedinUrl && (
            <a
              href={e.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium break-all underline underline-offset-4"
            >
              Ver perfil no LinkedIn<span className="sr-only"> (abre em nova aba)</span>
            </a>
          )}
          {profile && <ProfileView profile={profile} />}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {e.canEditProfile
            ? "Importe o PDF do LinkedIn para preencher cargo, experiências e formação."
            : "Nenhum perfil profissional preenchido."}
        </p>
      )}
    </section>
  );
}

function ProfileView({ profile: p }: { profile: ProfessionalProfile }) {
  return (
    <div className="grid gap-5 text-sm">
      {p.headline && <p className="font-medium text-pretty">{p.headline}</p>}
      {p.summary && <p className="max-w-prose text-pretty text-muted-foreground">{p.summary}</p>}
      {p.experiences.length > 0 && (
        <div className="grid gap-2">
          <h3 className="font-medium">Experiência</h3>
          <ul className="grid gap-2">
            {p.experiences.map((x, i) => (
              <li key={i}>
                <span className="font-medium">{x.title}</span>
                {x.company && <span className="text-muted-foreground"> · {x.company}</span>}
                {x.start && (
                  <span className="block text-muted-foreground tabular-nums">
                    {yearMonth(x.start)} – {yearMonth(x.end)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {p.education.length > 0 && (
        <div className="grid gap-2">
          <h3 className="font-medium">Formação</h3>
          <ul className="grid gap-2">
            {p.education.map((x, i) => (
              <li key={i}>
                <span className="font-medium">{x.school}</span>
                {(x.degree || x.period) && (
                  <span className="block text-muted-foreground">
                    {[x.degree, x.period?.replace("-", "–")].filter(Boolean).join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {p.skills.length > 0 && (
        <div className="grid gap-2">
          <h3 className="font-medium">Competências</h3>
          <p className="text-muted-foreground">{p.skills.join(", ")}</p>
        </div>
      )}
    </div>
  );
}

function ImportDialog({ employee }: { employee: EmployeeDto }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [fileError, setFileError] = useState<string>();
  const read = useMutation({
    mutationFn: (file: File) =>
      apiFetch<ProfileImport>(`/employees/${employee.id}/professional-profile/import`, {
        method: "POST",
        headers: { "content-type": "application/pdf" },
        body: file,
      }),
  });
  const save = useMutation({
    mutationFn: (body: ProfileImport) =>
      apiFetch<EmployeeDto>(`/employees/${employee.id}/professional-profile`, {
        method: "PUT",
        body: JSON.stringify({ ...body, linkedinUrl: body.linkedinUrl ?? employee.linkedinUrl }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      onOpenChange(false);
    },
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) return;
    setFileError(undefined);
    read.reset();
    save.reset();
  }

  function onFile(file: File | undefined) {
    read.reset();
    if (!file) return;
    if (file.type !== "application/pdf") return setFileError("Escolha o PDF exportado do LinkedIn");
    if (file.size > MAX_PROFILE_PDF_SIZE) return setFileError("Escolha um PDF de até 5 MB");
    setFileError(undefined);
    read.mutate(file);
  }

  const preview = read.data;
  const failure = read.error ?? save.error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Importar do LinkedIn</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto overscroll-contain">
        <div className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Importar perfil do LinkedIn</DialogTitle>
            <DialogDescription>
              No LinkedIn, abra o perfil, clique em Mais e depois em Salvar em PDF. Envie o arquivo aqui e confira o que
              foi lido antes de salvar.
            </DialogDescription>
          </DialogHeader>
          <FormField
            id="linkedin-pdf"
            label="PDF do perfil"
            type="file"
            accept="application/pdf"
            className="pt-2"
            error={fileError}
            onChange={(ev) => onFile(ev.target.files?.[0])}
          />
          <div role="status" className="text-sm text-muted-foreground">
            {read.isPending ? "Lendo o PDF…" : ""}
          </div>
          {preview && (
            <div className="grid gap-3 rounded-xl border p-4">
              {preview.linkedinUrl && <p className="text-sm break-all">{preview.linkedinUrl}</p>}
              <ProfileView profile={preview.profile} />
            </div>
          )}
          {failure && (
            <p role="alert" className="text-sm text-destructive">
              {read.error
                ? "Não conseguimos ler este PDF. Exporte de novo pelo LinkedIn e tente outra vez."
                : errorMessage(failure)}
            </p>
          )}
          <DialogFooter>
            <Button disabled={!preview || save.isPending} onClick={() => preview && save.mutate(preview)}>
              {save.isPending ? "Salvando…" : "Salvar perfil"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
