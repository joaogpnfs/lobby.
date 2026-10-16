import type { EmployeeStatus, Role } from "@lobby/types";

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
