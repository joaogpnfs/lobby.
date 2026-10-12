import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { Redis } from "ioredis";
import { env } from "./env.js";

// Commands fail fast while Redis is down instead of queueing forever.
@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
  }

  // Connect before serving traffic; if Redis is down, boot anyway and let /health report it.
  async onModuleInit() {
    await this.connect().catch((err: unknown) => new Logger("Redis").warn(`Redis unavailable at boot: ${String(err)}`));
  }

  async onModuleDestroy() {
    await this.quit().catch(() => this.disconnect());
  }
}
