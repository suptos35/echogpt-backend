import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CryptoModule } from '../../common/crypto/crypto.module';

@Module({
  imports: [PrismaModule, CryptoModule],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
