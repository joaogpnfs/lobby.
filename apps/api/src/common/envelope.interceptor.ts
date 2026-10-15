import { Injectable, type CallHandler, type NestInterceptor } from "@nestjs/common";
import { map } from "rxjs";
import type { ApiSuccess } from "@lobby/types";
import { Page } from "./pagination.js";

// Wraps every successful handler result as { success: true, data }, plus meta for paginated lists.
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(_ctx: unknown, next: CallHandler) {
    return next
      .handle()
      .pipe(
        map((data: unknown): ApiSuccess<unknown> =>
          data instanceof Page ? { success: true, data: data.items, meta: data.meta } : { success: true, data },
        ),
      );
  }
}
