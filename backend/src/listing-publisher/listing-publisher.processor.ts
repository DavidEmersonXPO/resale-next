import { Inject, Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { LISTING_ADAPTERS, LISTING_PUBLISH_QUEUE } from './listing-publisher.tokens';
import type { ListingPublishJobData } from './interfaces/publish-job-data';
import type { ListingAdapter, PublishResult } from './adapters/listing-adapter';
import { PrismaService } from '../common/prisma/prisma.service';
import { PlatformCredentialsService } from '../platform-credentials/platform-credentials.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
@Processor(LISTING_PUBLISH_QUEUE)
export class ListingPublisherProcessor extends WorkerHost {
  private readonly logger = new Logger(ListingPublisherProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly platformCredentials: PlatformCredentialsService,
    @Inject(LISTING_ADAPTERS)
    private readonly adapters: ListingAdapter[],
    private readonly metrics: MetricsService,
  ) {
    super();
  }

  async process(job: Job<ListingPublishJobData>): Promise<PublishResult> {
    const { listingId, platform } = job.data;
    job.updateProgress(5);

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        media: true,
        platformCredential: true,
        purchaseItem: {
          include: { purchase: true },
        },
      },
    });

    if (!listing) {
      const message = `Listing ${listingId} not found`;
      this.logger.warn(message);
      throw new Error(message);
    }

    const adapter = this.adapters.find((candidate) =>
      candidate.supports(platform),
    );
    if (!adapter) {
      const message = `No adapter registered for ${platform}`;
      this.logger.warn(message);
      throw new Error(message);
    }

    const validation = adapter.validate(listing);
    if (!validation.success) {
      const message =
        validation.message ??
        `Listing ${listingId} failed validation for ${platform}`;
      this.logger.warn(message);
      throw new Error(
        validation.errors?.length
          ? `${message}: ${validation.errors.join(', ')}`
          : message,
      );
    }

    if (!listing.platformCredentialId) {
      const message = `Listing ${listingId} missing credential for ${platform}`;
      this.logger.warn(message);
      throw new Error(message);
    }

    const credential =
      await this.platformCredentials.getDecryptedCredential(
        listing.platformCredentialId,
      );

    job.updateProgress(25);

    let publishResult: PublishResult | null = null;
    try {
      publishResult = await adapter.publish(listing, credential, {
        jobId: String(job.id),
      });
      job.updateProgress(75);
      await adapter.updateStatus(listing.id, publishResult);
      job.updateProgress(100);
      await this.metrics.updateQueueMetrics();
      if (!publishResult.success) {
        throw new Error(
          publishResult.message ?? 'Listing publish reported failure',
        );
      }
      return publishResult;
    } catch (error: any) {
      const message =
        error instanceof Error ? error.message : 'Listing publish failed';
      this.logger.error(
        `Publish job ${job.id} for listing ${listingId} (${platform}) failed: ${message}`,
      );
      if (!publishResult) {
        publishResult = {
          platform,
          success: false,
          status: 'failed',
          message,
        };
        await adapter.updateStatus(listing.id, publishResult);
      }
      await this.metrics.updateQueueMetrics();
      throw error;
    }
  }
}
