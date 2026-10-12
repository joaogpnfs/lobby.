import { ArgumentsHost, Catch, HttpException, HttpStatus, Logger, type ExceptionFilter } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import type { FastifyReply } from "fastify";
import { ErrorCode, type ApiError } from "@lobby/types";

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
