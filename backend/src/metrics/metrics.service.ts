import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { LISTING_PUBLISH_QUEUE } from '../listing-publisher/listing-publisher.tokens';
import type { Queue } from 'bullmq';
import { Registry, collectDefaultMetrics, Gauge, Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry = new Registry();

  // Queue metrics
  private readonly queueGauge: Gauge<string>;
  private readonly queueJobsByPlatform: Gauge<string>;

  // Publishing metrics
  private readonly publishCounter: Counter<string>;
  private readonly publishDuration: Histogram<string>;
  private readonly publishSuccessRate: Gauge<string>;

  // Policy metrics
  private readonly policyRefreshCounter: Counter<string>;

  // Integration sync metrics
  private readonly integrationSyncCounter: Counter<string>;
  private readonly integrationSyncDuration: Histogram<string>;

  // Listing kit metrics
  private readonly kitDownloadCounter: Counter<string>;

  // Platform-specific analytics
  private platformStats: Map<string, { success: number; failure: number }> = new Map();

  constructor(
    @InjectQueue(LISTING_PUBLISH_QUEUE)
    private readonly listingQueue: Queue,
  ) {
    collectDefaultMetrics({ register: this.registry });

    // Queue metrics
    this.queueGauge = new Gauge({
      name: 'listing_publish_jobs_total',
      help: 'Number of jobs in the publish queue by state',
      labelNames: ['state'],
      registers: [this.registry],
    });

    this.queueJobsByPlatform = new Gauge({
      name: 'listing_publish_jobs_by_platform',
      help: 'Number of jobs by platform and state',
      labelNames: ['platform', 'state'],
      registers: [this.registry],
    });

    // Publishing metrics
    this.publishCounter = new Counter({
      name: 'listing_publish_attempts_total',
      help: 'Total number of listing publish attempts by platform and result',
      labelNames: ['platform', 'result'],
      registers: [this.registry],
    });

    this.publishDuration = new Histogram({
      name: 'listing_publish_duration_seconds',
      help: 'Duration of listing publish operations by platform',
      labelNames: ['platform'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });

    this.publishSuccessRate = new Gauge({
      name: 'listing_publish_success_rate',
      help: 'Success rate of listing publishes by platform (0-1)',
      labelNames: ['platform'],
      registers: [this.registry],
    });

    // Policy metrics
    this.policyRefreshCounter = new Counter({
      name: 'ebay_policy_refresh_total',
      help: 'Number of eBay policy refresh attempts by result',
      labelNames: ['result'],
      registers: [this.registry],
    });

    // Integration sync metrics
    this.integrationSyncCounter = new Counter({
      name: 'integration_sync_total',
      help: 'Total number of integration sync attempts by source and result',
      labelNames: ['source', 'result'],
      registers: [this.registry],
    });

    this.integrationSyncDuration = new Histogram({
      name: 'integration_sync_duration_seconds',
      help: 'Duration of integration sync operations by source',
      labelNames: ['source'],
      buckets: [1, 5, 10, 30, 60, 120, 300],
      registers: [this.registry],
    });

    // Listing kit metrics
    this.kitDownloadCounter = new Counter({
      name: 'listing_kit_downloads_total',
      help: 'Total number of listing kit downloads',
      registers: [this.registry],
    });
  }

  onModuleInit() {
    void this.updateQueueMetrics();
  }

  async updateQueueMetrics() {
    const states: Array<
      'completed' | 'failed' | 'delayed' | 'waiting' | 'active'
    > = ['completed', 'failed', 'delayed', 'waiting', 'active'];

    for (const state of states) {
      const count = await this.listingQueue.getJobCountByTypes(state);
      this.queueGauge.set({ state }, count);
    }

    // Update per-platform metrics
    await this.updatePlatformQueueMetrics();
  }

  private async updatePlatformQueueMetrics() {
    // Get all jobs and group by platform
    const states: Array<
      'completed' | 'failed' | 'delayed' | 'waiting' | 'active'
    > = ['completed', 'failed', 'delayed', 'waiting', 'active'];

    for (const state of states) {
      const jobs = await this.listingQueue.getJobs([state]);
      const platformCounts = new Map<string, number>();

      for (const job of jobs) {
        const platform = job.data?.platform || 'unknown';
        platformCounts.set(platform, (platformCounts.get(platform) || 0) + 1);
      }

      for (const [platform, count] of platformCounts) {
        this.queueJobsByPlatform.set({ platform, state }, count);
      }
    }
  }

  recordPublishAttempt(platform: string, result: 'success' | 'failure', durationSeconds?: number) {
    this.publishCounter.inc({ platform, result });

    if (durationSeconds !== undefined) {
      this.publishDuration.observe({ platform }, durationSeconds);
    }

    // Update platform stats for success rate calculation
    if (!this.platformStats.has(platform)) {
      this.platformStats.set(platform, { success: 0, failure: 0 });
    }

    const stats = this.platformStats.get(platform)!;
    if (result === 'success') {
      stats.success++;
    } else {
      stats.failure++;
    }

    // Calculate and update success rate
    const total = stats.success + stats.failure;
    const successRate = total > 0 ? stats.success / total : 0;
    this.publishSuccessRate.set({ platform }, successRate);
  }

  recordPolicyRefresh(result: 'success' | 'failure') {
    this.policyRefreshCounter.inc({ result });
  }

  recordIntegrationSync(source: string, result: 'success' | 'failure', durationSeconds?: number) {
    this.integrationSyncCounter.inc({ source, result });

    if (durationSeconds !== undefined) {
      this.integrationSyncDuration.observe({ source }, durationSeconds);
    }
  }

  recordKitDownload() {
    this.kitDownloadCounter.inc();
  }

  getPlatformStats() {
    const stats: Record<string, { success: number; failure: number; successRate: number }> = {};

    for (const [platform, data] of this.platformStats) {
      const total = data.success + data.failure;
      stats[platform] = {
        success: data.success,
        failure: data.failure,
        successRate: total > 0 ? data.success / total : 0,
      };
    }

    return stats;
  }

  getRegistry() {
    return this.registry;
  }
}
