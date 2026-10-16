import * as Sentry from "@sentry/nestjs";
import { env } from "./env.js";

if (env.SENTRY_DSN) {
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV });
}
