import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message: any = 'Internal server error';
    let errorName: string | undefined;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const respObj = exceptionResponse as Record<string, any>;
      message = respObj.message !== undefined ? respObj.message : exceptionResponse;
      errorName = respObj.error;
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exception instanceof Error) {
      message = exception.message;
      errorName = exception.name;
    }

    if (!errorName) {
      switch (status) {
        case HttpStatus.BAD_REQUEST:
          errorName = 'Bad Request';
          break;
        case HttpStatus.UNAUTHORIZED:
          errorName = 'Unauthorized';
          break;
        case HttpStatus.FORBIDDEN:
          errorName = 'Forbidden';
          break;
        case HttpStatus.NOT_FOUND:
          errorName = 'Not Found';
          break;
        case HttpStatus.CONFLICT:
          errorName = 'Conflict';
          break;
        case HttpStatus.TOO_MANY_REQUESTS:
          errorName = 'Too Many Requests';
          break;
        default:
          errorName = status >= 500 ? 'Internal Server Error' : 'Error';
      }
    }

    const requestId =
      (request.headers['x-request-id'] as string) ||
      (request as any).id ||
      'unknown';

    const userId = (request as any).user?.id || (request as any).user?.userId;

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status} Server Error: ${
          typeof message === 'object' ? JSON.stringify(message) : message
        } (ReqId: ${requestId}, User: ${userId || 'anonymous'})`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400) {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status} Client Error: ${
          typeof message === 'object' ? JSON.stringify(message) : message
        } (ReqId: ${requestId}, User: ${userId || 'anonymous'})`,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.originalUrl || request.url,
      method: request.method,
      requestId,
      message,
      error: errorName,
    });
  }
}
