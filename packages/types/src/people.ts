import { z } from "zod";
import { ROLES, type Role } from "./permissions.js";

// ---------- Lists ----------

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

const optionalText = (max: number) => z.string().trim().max(max).nullish();
const optionalId = z.uuid().nullish();
const isoDate = z.iso.date();
const roleEnum = z.enum(ROLES);

// ---------- Departments, positions, branches ----------

export const departmentInputSchema = z
  .object({ name: z.string().trim().min(2).max(80), description: optionalText(300), managerId: optionalId })
  .strict();
export type DepartmentInput = z.infer<typeof departmentInputSchema>;
export type DepartmentDto = {
  id: string;
  name: string;
  description: string | null;
  manager: Ref | null;
  employeeCount: number;
};

export const positionInputSchema = z
  .object({ name: z.string().trim().min(2).max(80), description: optionalText(300), level: optionalText(40) })
  .strict();
export type PositionInput = z.infer<typeof positionInputSchema>;
export type PositionDto = {
  id: string;
  name: string;
  description: string | null;
  level: string | null;
  employeeCount: number;
};

export const branchInputSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    address: optionalText(200),
    city: optionalText(80),
    state: optionalText(40),
    country: z.string().trim().length(2).toUpperCase().optional(),
    timezone: z.string().trim().max(64).optional(),
  })
  .strict();
export type BranchInput = z.infer<typeof branchInputSchema>;
export type BranchDto = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  timezone: string;
  employeeCount: number;
};

// ---------- Employees ----------

export const EMPLOYEE_STATUSES = ["PENDING", "ACTIVE", "ON_LEAVE", "TERMINATED"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

// CPF check digits, so typos are caught at the form instead of stored.
export function isValidCpf(value: string) {
  const d = value.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const check = (len: number) => {
    const sum = [...d.slice(0, len)].reduce((acc, n, i) => acc + Number(n) * (len + 1 - i), 0);
    return ((sum * 10) % 11) % 10;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]);
}

const cpf = z
  .string()
  .trim()
  .refine(isValidCpf, "CPF inválido")
  .transform((v) => v.replace(/\D/g, ""));

const employeeFields = {
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  preferredName: optionalText(80),
  email: z.email().max(254).trim().toLowerCase(),
  phone: optionalText(32),
  birthDate: isoDate.nullish(),
  document: cpf.nullish(),
  hireDate: isoDate,
  // TERMINATED only through the termination endpoint, which also records date and reason.
  status: z.enum(["PENDING", "ACTIVE", "ON_LEAVE"]).optional(),
  departmentId: optionalId,
  positionId: optionalId,
  branchId: optionalId,
  managerId: optionalId,
};

export const createEmployeeSchema = z.object(employeeFields).strict();
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object(employeeFields).partial().strict();
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const terminateEmployeeSchema = z
  .object({ terminationDate: isoDate, reason: z.string().trim().min(2).max(500) })
  .strict();
export type TerminateEmployeeInput = z.infer<typeof terminateEmployeeSchema>;

export const employeeListQuerySchema = listQuerySchema.extend({
  status: z.enum(EMPLOYEE_STATUSES).optional(),
  departmentId: z.uuid().optional(),
  positionId: z.uuid().optional(),
  branchId: z.uuid().optional(),
  managerId: z.uuid().optional(),
});
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;

// An employee or catalog entry, by id and display name.
export type Ref = { id: string; name: string };

export type EmployeeListItem = {
  id: string;
  name: string;
  email: string;
  status: EmployeeStatus;
  hireDate: string;
  department: Ref | null;
  position: Ref | null;
  branch: Ref | null;
  manager: Ref | null;
};

export type EmployeeDto = EmployeeListItem & {
  firstName: string;
  lastName: string;
  preferredName: string | null;
  // Sensitive fields: null unless the viewer is HR or the person themself.
  phone: string | null;
  birthDate: string | null;
  // Masked (***.456.789-**) unless the viewer may see it in full.
  document: string | null;
  terminationDate: string | null;
  terminationReason: string | null;
  hasAccess: boolean;
  reports: Ref[];
};

// ---------- Invitations ----------

export const createInvitationSchema = z
  .object({
    email: z.email().max(254).trim().toLowerCase(),
    role: roleEnum,
    employeeId: z.uuid().optional(),
  })
  .strict();
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(20).max(200),
    // Only for a new account; someone who already has one just confirms their password.
    name: z.string().trim().min(2).max(120).optional(),
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(128),
  })
  .strict();
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export type InvitationDto = {
  id: string;
  email: string;
  role: Role;
  employee: Ref | null;
  expiresAt: string;
  createdAt: string;
};

// Returned once, right after creating: until an email provider is chosen, the inviter shares the link.
export type CreatedInvitation = InvitationDto & { url: string };

// What the invitee sees before accepting.
export type InvitationPreview = { organizationName: string; email: string; role: Role; hasAccount: boolean };

export const updateMemberSchema = z
  .object({ role: roleEnum, status: z.enum(["ACTIVE", "DISABLED"]) })
  .partial()
  .strict();
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export type MemberDto = { id: string; name: string; email: string; role: Role; status: "ACTIVE" | "DISABLED" };
