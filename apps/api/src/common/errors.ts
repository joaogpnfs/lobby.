import { ArgumentsHost, Catch, HttpException, HttpStatus, Logger, type ExceptionFilter } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import type { FastifyReply } from "fastify";
import { ErrorCode, type ApiError } from "@lobby/types";
import { Prisma } from "../generated/prisma/client.js";

// The one way to fail on purpose: a stable code for clients, a status for HTTP.
export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    status: HttpStatus,
    readonly details?: unknown,
  ) {
    super(message, status);
  }
}

export const notFound = (what: string) =>
  new AppException(ErrorCode.NOT_FOUND, `${what} not found`, HttpStatus.NOT_FOUND);
export const conflict = (message: string) => new AppException(ErrorCode.CONFLICT, message, HttpStatus.CONFLICT);
export const forbidden = (message = "You do not have permission to do this") =>
  new AppException(ErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN);

// Constraint violations the database caught for us: a duplicate, a row still in use, a row that's gone.
const prismaErrors: Partial<Record<string, [number, ErrorCode, string]>> = {
  P2002: [HttpStatus.CONFLICT, ErrorCode.CONFLICT, "Already exists"],
  P2003: [HttpStatus.CONFLICT, ErrorCode.CONFLICT, "Still in use by other records"],
  P2025: [HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Not found"],
};

const codeByStatus: Partial<Record<number, ErrorCode>> = {
  400: ErrorCode.VALIDATION_ERROR,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  429: ErrorCode.RATE_LIMITED,
};

// Every error leaves the API as { success: false, error: { code, message, details? } }.
// Unexpected errors are logged (with the request id from nestjs-pino) and never expose a stack.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exceptions");

  catch(exception: unknown, host: ArgumentsHost) {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const [status, error] = this.toError(exception);
    const body: ApiError = { success: false, error };
    reply.status(status).send(body);
  }

  private toError(exception: unknown): [number, ApiError["error"]] {
    if (exception instanceof AppException) {
      return [exception.getStatus(), { code: exception.code, message: exception.message, details: exception.details }];
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const known = prismaErrors[exception.code];
      if (known) return [known[0], { code: known[1], message: known[2] }];
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = codeByStatus[status];
      if (code) return [status, { code, message: exception.message }];
    }
    this.logger.error(exception);
    Sentry.captureException(exception);
    return [HttpStatus.INTERNAL_SERVER_ERROR, { code: ErrorCode.INTERNAL_ERROR, message: "Internal server error" }];
  }
}
