import { Global, Module } from "@nestjs/common";
import { RequestContext } from "./common/context.js";
import { AuditService } from "./modules/audit/audit.service.js";
import { PrismaService } from "./prisma.service.js";
import { RedisService } from "./redis.service.js";

// Infrastructure every domain module uses: one instance each, available everywhere.
@Global()
@Module({
  providers: [PrismaService, RedisService, AuditService, RequestContext],
  exports: [PrismaService, RedisService, AuditService, RequestContext],
})
export class CoreModule {}
