import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ApiUsageInterceptor } from '../../common/interceptors/api-usage.interceptor';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminService, ApiUsageInterceptor],
  exports: [AdminService, ApiUsageInterceptor],
})
export class AdminModule {}
