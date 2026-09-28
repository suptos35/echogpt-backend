import { Module } from '@nestjs/common';
import { WebSearchService } from './web-search.service';
import { WebSearchController } from './web-search.controller';
import { SearchCacheService } from './services/search-cache.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WebSearchController],
  providers: [SearchCacheService, WebSearchService],
  exports: [WebSearchService, SearchCacheService],
})
export class WebSearchModule {}
