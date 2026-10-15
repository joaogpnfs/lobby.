import { Test } from "@nestjs/testing";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "../src/app.module.js";
import { configureApp, createAdapter } from "../src/app.setup.js";
import { PrismaService } from "../src/prisma.service.js";
import { RedisService } from "../src/redis.service.js";

// The real app (same prefix, guards, filters and validation as production) against the test database.
export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(createAdapter());
  await configureApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

// Empties every table and the rate-limit counters, so each test starts clean.
export async function resetState(app: NestFastifyApplication) {
  const prisma = app.get(PrismaService);
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);

  const redis = app.get(RedisService);
  const keys = await redis.keys("rl:*");
  if (keys.length) await redis.del(...keys);
}
