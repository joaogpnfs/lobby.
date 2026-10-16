import { z } from "zod";
import type { Permission, Role } from "./permissions.js";

const email = z.email().max(254).trim().toLowerCase();
const password = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(128);

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email,
    password,
    organizationName: z.string().trim().min(2).max(120),
  })
  .strict();
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({ email, password: z.string().min(1).max(128) }).strict();
export type LoginInput = z.infer<typeof loginSchema>;

export type AuthTokens = { accessToken: string };

export type Me = {
  user: { id: string; name: string; email: string };
  organization: { id: string; name: string };
  role: Role;
  permissions: readonly Permission[];
};

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    legalName: z.string().trim().max(200).nullable(),
    document: z.string().trim().max(32).nullable(),
    email: z.email().max(254).nullable(),
    phone: z.string().trim().max(32).nullable(),
    timezone: z.string().trim().max(64),
  })
  .partial()
  .strict();
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export type OrganizationDto = {
  id: string;
  name: string;
  legalName: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  timezone: string;
};
