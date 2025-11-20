import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ListingPlatform } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  ListingAdapter,
  PublishResult,
  ValidationResult,
} from './adapters/listing-adapter';
import { LISTING_ADAPTERS, LISTING_PUBLISH_QUEUE } from './listing-publisher.tokens';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type { ListingPublishJobData } from './interfaces/publish-job-data';
import type { ListingPublishJobStatus } from './interfaces/publish-job-status';
import type { ListingPublishJobSummary } from './interfaces/publish-job-summary';
import { MetricsService } from '../metrics/metrics.service';

interface QueuedJob {
  platform: ListingPlatform;
  jobId: string;
}

export interface PublishQueueResponse {
  listingId: string;
  queued: QueuedJob[];
  failures: PublishResult[];
}

@Injectable()
export class ListingPublisherService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LISTING_ADAPTERS)
    private readonly adapters: ListingAdapter[],
    @InjectQueue(LISTING_PUBLISH_QUEUE)
    private readonly queue: Queue<ListingPublishJobData>,
    private readonly metrics: MetricsService,
  ) {}

  async publishListing(
    listingId: string,
    targetPlatforms?: ListingPlatform[],
  ): Promise<PublishQueueResponse> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        media: true,
        platformCredential: true,
        purchaseItem: {
          include: {
            purchase: true,
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const platforms = targetPlatforms?.length
      ? targetPlatforms
      : [listing.platform];
    const failures: PublishResult[] = [];
    const queued: QueuedJob[] = [];

    for (const platform of platforms) {
      const adapter = this.adapters.find((candidate) =>
        candidate.supports(platform),
      );
      if (!adapter) {
        failures.push({
          platform,
          success: false,
          status: 'skipped',
          message: `No adapter registered for ${platform}.`,
        });
        continue;
      }

      const validation = adapter.validate(listing);
      if (!validation.success) {
        failures.push(this.failedValidation(platform, validation));
        continue;
      }

      if (!listing.platformCredentialId) {
        failures.push({
          platform,
          success: false,
          status: 'missing_credential',
          message:
            'Listing must have an assigned platform credential before publishing.',
        });
        continue;
      }

      const job = await this.queue.add(
        'publish',
        { listingId: listing.id, platform },
        {
          removeOnComplete: { age: 60 * 60, count: 1000 },
          removeOnFail: { age: 60 * 60 * 24, count: 1000 },
        },
      );
      queued.push({ platform, jobId: String(job.id) });
    }

    await this.metrics.updateQueueMetrics();

    return { listingId, queued, failures };
  }

  async getJobStatus(jobId: string): Promise<ListingPublishJobStatus> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Publish job not found');
    }
    const state = await job.getState();
    const progress =
      typeof job.progress === 'number' ? job.progress : null;
    const returnValue = (job.returnvalue ?? undefined) as
      | PublishResult
      | undefined;
    return {
      jobId: String(job.id),
      listingId: job.data.listingId,
      platform: job.data.platform,
      state,
      progress,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason ?? null,
      returnValue,
      processedOn: job.processedOn ?? null,
      finishedOn: job.finishedOn ?? null,
    };
  }

  async listRecentJobs(limit = 20): Promise<ListingPublishJobSummary[]> {
    const states: Array<
      'completed' | 'failed' | 'waiting' | 'active' | 'delayed'
    > = ['completed', 'failed', 'waiting', 'active', 'delayed'];
    const jobs = await this.queue.getJobs(states, 0, limit - 1, true);
    if (!jobs.length) {
      return [];
    }

    const listingIds = Array.from(
      new Set(jobs.map((job) => job.data.listingId)),
    );
    const listings = await this.prisma.listing.findMany({
      where: { id: { in: listingIds } },
      select: { id: true, title: true, status: true },
    });
    const listingById = new Map(listings.map((listing) => [listing.id, listing]));

    const jobStates = await Promise.all(jobs.map((job) => job.getState()));

    const entries = jobs.map((job, index) => ({
      job,
      state: jobStates[index],
    }));

    return entries
      .sort((a, b) => b.job.timestamp - a.job.timestamp)
      .slice(0, limit)
      .map(({ job, state }) => {
        const listing = listingById.get(job.data.listingId);
        return {
          jobId: String(job.id),
          listingId: job.data.listingId,
          listingTitle: listing?.title ?? 'Unknown listing',
          listingStatus: listing?.status ?? 'DRAFT',
          platform: job.data.platform,
          state,
          queuedAt: job.timestamp,
          finishedOn: job.finishedOn ?? null,
          failedReason: job.failedReason ?? null,
          attemptsMade: job.attemptsMade,
          returnValue: (job.returnvalue ?? undefined) as PublishResult | undefined,
        };
      });
  }

  async retryJob(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Publish job not found');
    }
    await job.retry();
    await this.metrics.updateQueueMetrics();
    return { jobId: String(job.id), state: await job.getState() };
  }

  async cleanJobs(options: { state?: 'completed' | 'failed'; olderThan?: number }) {
    const state = options.state ?? 'completed';
    const olderThanSeconds = Number.isFinite(options.olderThan)
      ? Number(options.olderThan)
      : 60 * 60;
    const removed = await this.queue.clean(olderThanSeconds * 1000, 0, state);
    await this.metrics.updateQueueMetrics();
    return { removed: removed.length };
  }

  private failedValidation(
    platform: ListingPlatform,
    validation: ValidationResult,
  ): PublishResult {
    return {
      platform,
      success: false,
      status: 'validation_failed',
      message: validation.message ?? 'Listing failed validation.',
      errors: validation.errors,
    };
  }
}
