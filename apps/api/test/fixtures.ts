import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { Role } from "@lobby/types";
import request from "supertest";
import { expect } from "vitest";

export type Api = ReturnType<typeof client>;

export function client(app: NestFastifyApplication, token?: string) {
  const call = (method: "get" | "post" | "put" | "patch" | "delete", path: string) => {
    const req = request(app.getHttpServer())[method](`/api/v1${path}`);
    return token ? req.auth(token, { type: "bearer" }) : req;
  };
  return {
    get: (path: string) => call("get", path),
    post: (path: string, body?: object) => call("post", path).send(body),
    put: (path: string, body: object) => call("put", path).send(body),
    patch: (path: string, body: object) => call("patch", path).send(body),
    delete: (path: string) => call("delete", path),
    upload: (path: string, body: Buffer, type: string) => call("post", path).set("content-type", type).send(body),
  };
}

export async function signUp(app: NestFastifyApplication, org: string) {
  const slug = org.toLowerCase().replace(/\W/g, "");
  const res = await client(app)
    .post("/auth/register", {
      name: `Admin ${org}`,
      email: `admin@${slug}.test`,
      password: "correct-horse-1",
      organizationName: org,
    })
    .expect(201);
  return client(app, res.body.data.accessToken as string);
}

let seq = 0;
export async function createEmployee(api: Api, overrides: Record<string, unknown> = {}) {
  seq++;
  const res = await api
    .post("/employees", {
      firstName: `Pessoa${seq}`,
      lastName: "Teste",
      email: `p${seq}@people.test`,
      hireDate: "2024-01-15",
      ...overrides,
    })
    .expect(201);
  return res.body.data as { id: string; email: string };
}

export async function giveAccess(
  app: NestFastifyApplication,
  admin: Api,
  employee: { id: string; email: string },
  role: Role,
) {
  const invite = await admin.post("/invitations", { email: employee.email, role, employeeId: employee.id }).expect(201);
  const token = new URL(invite.body.data.url as string).pathname.split("/").pop()!;
  const res = await client(app).post("/invitations/accept", { token, name: "Convidada", password: "invitee-pass-1" });
  expect(res.status).toBe(200);
  return client(app, res.body.data.accessToken as string);
}
