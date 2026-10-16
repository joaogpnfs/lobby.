import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";

export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="grid gap-2" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="grid justify-items-start gap-2 rounded-xl border border-dashed px-6 py-10">
      <p className="font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="grid justify-items-start gap-2 rounded-xl border border-destructive/30 px-6 py-8">
      <p className="font-medium">Não foi possível carregar.</p>
      <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

export function errorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return "Verifique sua conexão e tente de novo.";
  switch (error.code) {
    case "NOT_FOUND":
      return "Não encontramos este registro. Ele pode ter sido removido.";
    case "FORBIDDEN":
      return "Seu papel não permite esta ação.";
    case "CONFLICT":
      return conflictMessages[error.message] ?? "Já existe um registro com estes dados.";
    case "VALIDATION_ERROR":
      return "Alguns campos estão inválidos. Revise e tente de novo.";
    case "RATE_LIMITED":
      return "Muitas tentativas seguidas. Espere um minuto.";
    default:
      return "Algo deu errado do nosso lado. Tente de novo em instantes.";
  }
}

const conflictMessages: Record<string, string> = {
  "Already exists": "Já existe um registro com este nome ou e-mail.",
  "Still in use by other records": "Ainda há colaboradores ligados a este registro. Mude-os antes de excluir.",
  "This person is already a member": "Esta pessoa já tem acesso.",
  "This employee already has access": "Este colaborador já tem acesso.",
  "This employee was terminated": "Colaborador desligado não pode receber acesso.",
};
