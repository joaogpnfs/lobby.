import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from "@lobby/types";
import { describe, expect, it } from "vitest";

describe("ROLE_PERMISSIONS", () => {
  it("grants only known permissions, without duplicates", () => {
    for (const role of ROLES) {
      const granted = ROLE_PERMISSIONS[role];
      expect(granted.every((p) => PERMISSIONS.includes(p))).toBe(true);
      expect(new Set(granted).size).toBe(granted.length);
    }
  });

  it("keeps privileged actions away from employees and managers", () => {
    expect(ROLE_PERMISSIONS.EMPLOYEE).not.toContain("vacations:approve");
    expect(ROLE_PERMISSIONS.EMPLOYEE).not.toContain("employees:create");
    expect(ROLE_PERMISSIONS.MANAGER).not.toContain("employees:delete");
    expect(ROLE_PERMISSIONS.HR_MANAGER).not.toContain("organization:update");
    expect(ROLE_PERMISSIONS.ORG_ADMIN).toEqual(expect.arrayContaining([...ROLE_PERMISSIONS.HR_MANAGER]));
  });
});
