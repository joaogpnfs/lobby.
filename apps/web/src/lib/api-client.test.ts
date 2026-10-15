import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, setAccessToken } from "./api-client";

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

describe("session refresh", () => {
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
  const expired = () =>
    json(401, { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });

  afterEach(() => setAccessToken(null));

  it("on 401 refreshes once, even for parallel requests, then retries with the new token", async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (url === "/api/v1/auth/refresh") return json(200, { success: true, data: { accessToken: "new" } });
      const auth = new Headers(init.headers).get("authorization");
      return auth === "Bearer new" ? json(200, { success: true, data: url }) : expired();
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(Promise.all([apiFetch("/a"), apiFetch("/b")])).resolves.toEqual(["/api/v1/a", "/api/v1/b"]);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/v1/auth/refresh")).toHaveLength(1);
  });

  it("gives up with the original 401 when the refresh fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => expired()),
    );
    await expect(apiFetch("/a")).rejects.toMatchObject({ status: 401 });
  });

  it("never refreshes after a failed login", async () => {
    const fetchMock = vi.fn(async () => expired());
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiFetch("/auth/login", { method: "POST" })).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
