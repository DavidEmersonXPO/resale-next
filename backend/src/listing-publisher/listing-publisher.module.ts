import { Module } from '@nestjs/common';
import { ListingPublisherService } from './listing-publisher.service';
import { PlatformCredentialsModule } from '../platform-credentials/platform-credentials.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { LISTING_ADAPTERS, LISTING_PUBLISH_QUEUE } from './listing-publisher.tokens';
import { EbayAdapter } from './adapters/ebay.adapter';
import { EbayModule } from '../ebay/ebay.module';
import { ListingPublisherProcessor } from './listing-publisher.processor';
import { ListingPublisherController } from './listing-publisher.controller';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    PrismaModule,
    PlatformCredentialsModule,
    EbayModule,
    BullModule.registerQueue({
      name: LISTING_PUBLISH_QUEUE,
    }),
    MetricsModule,
  ],
  controllers: [ListingPublisherController],
  providers: [
    ListingPublisherService,
    EbayAdapter,
    ListingPublisherProcessor,
    {
      provide: LISTING_ADAPTERS,
      useFactory: (ebayAdapter: EbayAdapter) => [ebayAdapter],
      inject: [EbayAdapter],
    },
  ],
  exports: [ListingPublisherService],
})
export class ListingPublisherModule {}
