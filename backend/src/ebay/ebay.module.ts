import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EbayAuthService } from './ebay-auth.service';
import { EbayAuthController } from './ebay-auth.controller';
import { EbayStateService } from './ebay-state.service';
import { EbayListingService } from './ebay-listing.service';
import { EbayPoliciesService } from './ebay-policies.service';
import { EbayPoliciesController } from './ebay-policies.controller';
import { EbayPolicyScheduler } from './ebay-policy.scheduler';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [PrismaModule, HttpModule, ConfigModule, MetricsModule],
  providers: [
    EbayAuthService,
    EbayStateService,
    EbayListingService,
    EbayPoliciesService,
    EbayPolicyScheduler,
  ],
  controllers: [EbayAuthController, EbayPoliciesController],
  exports: [EbayAuthService, EbayListingService, EbayPoliciesService],
})
export class EbayModule {}
