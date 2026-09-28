import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiUsageInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logRequest(req, http.getResponse().statusCode, startTime);
        },
        error: (err) => {
          const statusCode = err.status || err.statusCode || 500;
          this.logRequest(req, statusCode, startTime);
        },
      }),
    );
  }

  private logRequest(req: any, statusCode: number, startTime: number): void {
    const latencyMs = Date.now() - startTime;
    const endpoint = (req.baseUrl || '') + (req.path || req.url || '');
    const method = req.method || 'GET';
    const userId = req.user?.userId || req.user?.id || null;
    const ipAddress = (req.headers && req.headers['x-forwarded-for']) || req.ip || null;
    const userAgent = req.headers ? req.headers['user-agent'] || null : null;

    // Asynchronously insert log without blocking response
    this.prisma.apiUsageLog
      .create({
        data: {
          userId,
          endpoint,
          method,
          statusCode,
          latencyMs,
          ipAddress: typeof ipAddress === 'string' ? ipAddress.slice(0, 100) : null,
          userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 500) : null,
        },
      })
      .catch(() => {
        // Silently catch any logging write failure so request lifecycle is never disturbed
      });
  }
}
