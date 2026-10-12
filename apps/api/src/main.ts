import "./instrument.js";
import { NestFactory } from "@nestjs/core";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module.js";
import { configureApp, createAdapter } from "./app.setup.js";
import { env } from "./env.js";

const app = await NestFactory.create<NestFastifyApplication>(AppModule, createAdapter(), { bufferLogs: true });
app.useLogger(app.get(Logger));
await configureApp(app);
await app.listen(env.API_PORT, "0.0.0.0");
