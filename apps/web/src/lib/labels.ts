import type { DocumentType, EmployeeStatus, Role } from "@lobby/types";

export const ROLE_LABEL: Record<Role, string> = {
  ORG_ADMIN: "Administrador",
  HR_MANAGER: "RH",
  MANAGER: "Gestor",
  EMPLOYEE: "Colaborador",
};

export const STATUS_LABEL: Record<EmployeeStatus, string> = {
  PENDING: "Pré-admissão",
  ACTIVE: "Ativo",
  ON_LEAVE: "Afastado",
  TERMINATED: "Desligado",
};

export const formatDate = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  CONTRACT: "Contrato",
  IDENTITY: "Identificação",
  CERTIFICATE: "Certificado",
  PAYSLIP: "Holerite",
  MEDICAL: "Atestado ou exame",
  OTHER: "Outro",
};

const sizeFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export const formatSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))}\u00a0KB`
    : `${sizeFormat.format(bytes / 1024 / 1024)}\u00a0MB`;
