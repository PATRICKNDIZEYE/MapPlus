import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchRouter } from './search.router';

@Module({
  providers: [SearchService, SearchRouter],
  exports: [SearchService, SearchRouter],
})
export class SearchModule {}
