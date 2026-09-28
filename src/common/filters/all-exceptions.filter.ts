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
    let errorName = 'InternalServerError';

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const respObj = exceptionResponse as Record<string, any>;
      message = respObj.message || exceptionResponse;
      errorName = respObj.error || errorName;
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exception instanceof Error) {
      message = exception.message;
      errorName = exception.name;
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
      path: request.url,
      method: request.method,
      requestId,
      message,
      ...(errorName && errorName !== 'InternalServerError' ? { error: errorName } : {}),
    });
  }
}
