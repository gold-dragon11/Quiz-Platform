import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  message: string;
  path: string;
  timestamp: string;
}

/**
 * Catches every unhandled exception and formats a consistent JSON response.
 * This is intentionally minimal for the foundation phase — business-specific
 * exception mapping (e.g. domain error types) is added alongside the modules
 * that throw them.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode: number =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const body: ErrorResponseBody = {
      statusCode,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    const isServerError = statusCode >= 500; // HttpStatus.INTERNAL_SERVER_ERROR

    if (isServerError) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json(body);
  }
}
