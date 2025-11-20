import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { ListingPublisherModule } from '../listing-publisher/listing-publisher.module';

@Module({
  imports: [ListingPublisherModule, ConfigModule],
  providers: [ListingsService],
  controllers: [ListingsController],
  exports: [ListingsService],
})
export class ListingsModule {}
