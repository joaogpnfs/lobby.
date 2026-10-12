export type Phase = { name: string; state?: "done" | "now" };

export const phases: Phase[] = [
  { name: "Planejamento", state: "done" },
  { name: "Fundação técnica", state: "now" },
  { name: "Login e permissões" },
  { name: "Colaboradores" },
  { name: "Documentos" },
  { name: "Férias" },
  { name: "Benefícios" },
  { name: "Onboarding" },
  { name: "Ponto" },
  { name: "Auditoria e relatórios" },
  { name: "Revisão de qualidade" },
];
