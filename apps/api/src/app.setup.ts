import { randomUUID } from "node:crypto";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import { HttpStatus, StandardSchemaValidationPipe } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ErrorCode } from "@lobby/types";
import { AllExceptionsFilter, AppException } from "./common/errors.js";
import { EnvelopeInterceptor } from "./common/envelope.interceptor.js";
import { env } from "./env.js";

export function createAdapter() {
  const adapter = new FastifyAdapter({
    requestIdHeader: "x-request-id",
    genReqId: () => randomUUID(),
    trustProxy: env.TRUST_PROXY,
  });
  adapter.getInstance().addHook("onSend", async (req, reply) => {
    reply.header("x-request-id", req.id);
  });
  return adapter;
}

export async function configureApp(app: NestFastifyApplication) {
  app.setGlobalPrefix("api/v1");
  app.enableShutdownHooks();

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cookie);
  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });

  app.useGlobalPipes(
    new StandardSchemaValidationPipe({
      exceptionFactory: (issues) =>
        new AppException(
          ErrorCode.VALIDATION_ERROR,
          "Invalid request",
          HttpStatus.BAD_REQUEST,
          issues.map((i) => ({
            path: i.path?.map((p) => (typeof p === "object" ? p.key : p)).join("."),
            message: i.message,
          })),
        ),
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new EnvelopeInterceptor());

  if (env.SWAGGER_ENABLED) {
    const config = new DocumentBuilder().setTitle("Lobby API").setVersion("v1").addBearerAuth().build();
    SwaggerModule.setup("api/docs", app, () => SwaggerModule.createDocument(app, config));
  }
}
