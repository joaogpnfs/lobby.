import { Injectable, type CallHandler, type NestInterceptor } from "@nestjs/common";
import { map } from "rxjs";
import type { ApiSuccess } from "@lobby/types";

// Wraps every successful handler result as { success: true, data }.
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(_ctx: unknown, next: CallHandler) {
    return next.handle().pipe(map((data: unknown): ApiSuccess<unknown> => ({ success: true, data })));
  }
}
