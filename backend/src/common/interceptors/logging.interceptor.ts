import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * Logs every incoming request and its outcome. This is intentionally minimal
 * for the foundation phase — structured/aggregated logging (e.g. shipping to
 * a log collector) can be layered on without changing this contract.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const { statusCode } = response;
        const durationMs = Date.now() - startTime;
        this.logger.log(
          `${method} ${originalUrl} ${statusCode} +${durationMs}ms`,
        );
      }),
    );
  }
}
