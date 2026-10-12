import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./api-client";

const respond = (status: number, body: unknown) =>
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));

afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("returns data from the success envelope", async () => {
    respond(200, { success: true, data: { ok: 1 } });
    await expect(apiFetch("/x")).resolves.toEqual({ ok: 1 });
    expect(fetch).toHaveBeenCalledWith("/api/v1/x", expect.anything());
  });

  it("throws ApiError with the API's code and status", async () => {
    respond(404, { success: false, error: { code: "NOT_FOUND", message: "Employee not found" } });
    const err = await apiFetch("/employees/1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: "NOT_FOUND", status: 404, message: "Employee not found" });
  });

  it("throws on a non-JSON response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 502 })));
    await expect(apiFetch("/x")).rejects.toMatchObject({ code: "INVALID_RESPONSE", status: 502 });
  });
});
