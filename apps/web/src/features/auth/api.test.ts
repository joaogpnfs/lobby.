import { describe, expect, it } from "vitest";
import { safeNext } from "./api";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/employees?page=2")).toBe("/employees?page=2");
  });

  it("falls back to the dashboard for anything that could leave the site", () => {
    for (const next of ["//evil.test", "/\\evil.test", "https://evil.test", "evil", undefined, ["/x"]]) {
      expect(safeNext(next)).toBe("/dashboard");
    }
  });
});
