import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * The error payload returned to clients.
 *
 * `statusCode`, `path`, and `timestamp` are always present. Any additional
 * fields carried by the thrown exception — `message` and `error` for Nest's
 * built-in exceptions, an array of `message`s for ValidationPipe — are passed
 * through unchanged.
 */
interface ErrorResponseBody {
  statusCode: number;
  path: string;
  timestamp: string;
  message?: string | string[];
  error?: string;
  [key: string]: unknown;
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

    const body = this.buildResponseBody(exception, statusCode, request.url);

    const isServerError = statusCode >= 500; // HttpStatus.INTERNAL_SERVER_ERROR

    if (isServerError) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json(body);
  }

  /**
   * Builds the payload, preserving the body the exception already carries.
   *
   * `HttpException.getResponse()` returns a string only when the exception was
   * constructed with one; Nest's built-in exceptions and ValidationPipe return
   * an object instead. That object is spread into the response so validation
   * messages stay a readable array, rather than being serialized into a JSON
   * string nested inside `message`.
   */
  private buildResponseBody(
    exception: unknown,
    statusCode: number,
    path: string,
  ): ErrorResponseBody {
    const envelope = { path, timestamp: new Date().toISOString() };

    if (!(exception instanceof HttpException)) {
      // Internal failures never describe themselves to the caller
      // (docs/06-backend/security.md §15).
      return { ...envelope, message: 'Internal server error', statusCode };
    }

    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return { ...envelope, message: exceptionResponse, statusCode };
    }

    // `statusCode` is applied last so the body always agrees with the HTTP
    // status, even if the thrown payload carried a different value.
    return { ...envelope, ...exceptionResponse, statusCode };
  }
}
