import { Module } from '@nestjs/common';
import { ListingTemplatesService } from './listing-templates.service';
import { ListingTemplatesController } from './listing-templates.controller';

@Module({
  providers: [ListingTemplatesService],
  controllers: [ListingTemplatesController],
  exports: [ListingTemplatesService],
})
export class ListingTemplatesModule {}
