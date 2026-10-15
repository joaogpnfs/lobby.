// RBAC: the single source of what each role may do. Checked by the API (authority) and used by the web to hide actions.
export const ROLES = ["ORG_ADMIN", "HR_MANAGER", "MANAGER", "EMPLOYEE"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "organization:read",
  "organization:update",
  "users:invite",
  "users:manage",
  "employees:read",
  "employees:create",
  "employees:update",
  "employees:delete",
  "org-structure:manage",
  "documents:read",
  "documents:create",
  "documents:delete",
  "vacations:read",
  "vacations:request",
  "vacations:approve",
  "benefits:read",
  "benefits:manage",
  "onboarding:read",
  "onboarding:manage",
  "time:clock",
  "time:read",
  "reports:read",
  "audit:read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// Data scope (all / team / self) is applied separately by the API; this map only says which actions exist per role.
const everyone: Permission[] = [
  "organization:read",
  "employees:read",
  "documents:read",
  "vacations:read",
  "vacations:request",
  "benefits:read",
  "onboarding:read",
  "time:clock",
  "time:read",
];

const hr: Permission[] = [
  ...everyone,
  "users:invite",
  "employees:create",
  "employees:update",
  "employees:delete",
  "org-structure:manage",
  "documents:create",
  "documents:delete",
  "vacations:approve",
  "benefits:manage",
  "onboarding:manage",
  "reports:read",
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ORG_ADMIN: [...hr, "organization:update", "users:manage", "audit:read"],
  HR_MANAGER: hr,
  MANAGER: [...everyone, "vacations:approve", "reports:read"],
  EMPLOYEE: everyone,
};

// Which employees a role sees: everyone, the person plus their direct reports, or only themself.
export type EmployeeScope = "all" | "team" | "self";
export const EMPLOYEE_SCOPE: Record<Role, EmployeeScope> = {
  ORG_ADMIN: "all",
  HR_MANAGER: "all",
  MANAGER: "team",
  EMPLOYEE: "self",
};
