import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LISTING_PUBLISH_QUEUE } from '../listing-publisher/listing-publisher.tokens';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: LISTING_PUBLISH_QUEUE,
    }),
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
