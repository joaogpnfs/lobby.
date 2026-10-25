import type { EmployeeDto, EmployeeListItem, ProfessionalProfile, Ref } from "@lobby/types";
import type { Prisma } from "../../generated/prisma/client.js";

export const personName = { id: true, firstName: true, lastName: true, preferredName: true } as const;
type NameRow = Prisma.EmployeeGetPayload<{ select: typeof personName }>;

export const displayName = (e: Omit<NameRow, "id">) => `${e.preferredName ?? e.firstName} ${e.lastName}`;
export const personRef = (e: NameRow): Ref => ({ id: e.id, name: displayName(e) });

export const listSelect = {
  ...personName,
  email: true,
  status: true,
  hireDate: true,
  department: { select: { id: true, name: true } },
  position: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  manager: { select: personName },
} satisfies Prisma.EmployeeSelect;
type ListRow = Prisma.EmployeeGetPayload<{ select: typeof listSelect }>;

export const detailSelect = {
  ...listSelect,
  phone: true,
  birthDate: true,
  document: true,
  terminationDate: true,
  terminationReason: true,
  userId: true,
  linkedinUrl: true,
  professionalProfile: true,
  reports: { where: { deletedAt: null }, select: personName, orderBy: { firstName: "asc" } },
} satisfies Prisma.EmployeeSelect;
type DetailRow = Prisma.EmployeeGetPayload<{ select: typeof detailSelect }>;

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export const toDate = (s: string) => new Date(`${s}T00:00:00.000Z`);

export const maskCpf = (cpf: string) => `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;

export function toListItem(e: ListRow): EmployeeListItem {
  return {
    id: e.id,
    name: displayName(e),
    email: e.email,
    status: e.status,
    hireDate: isoDate(e.hireDate),
    department: e.department,
    position: e.position,
    branch: e.branch,
    manager: e.manager && personRef(e.manager),
  };
}

export function toDetail(e: DetailRow, full: boolean, canEditProfile: boolean): EmployeeDto {
  return {
    ...toListItem(e),
    firstName: e.firstName,
    lastName: e.lastName,
    preferredName: e.preferredName,
    phone: full ? e.phone : null,
    birthDate: full && e.birthDate ? isoDate(e.birthDate) : null,
    document: e.document && (full ? e.document : maskCpf(e.document)),
    terminationDate: e.terminationDate && isoDate(e.terminationDate),
    terminationReason: full ? e.terminationReason : null,
    hasAccess: e.userId !== null,
    linkedinUrl: e.linkedinUrl,
    professionalProfile: e.professionalProfile as ProfessionalProfile | null,
    canEditProfile,
    reports: e.reports.map(personRef),
  };
}
