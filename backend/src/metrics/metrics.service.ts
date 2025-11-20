import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { LISTING_PUBLISH_QUEUE } from '../listing-publisher/listing-publisher.tokens';
import type { Queue } from 'bullmq';
import { Registry, collectDefaultMetrics, Gauge, Counter } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry = new Registry();
  private readonly queueGauge: Gauge<string>;
  private readonly policyRefreshCounter: Counter<string>;

  constructor(
    @InjectQueue(LISTING_PUBLISH_QUEUE)
    private readonly listingQueue: Queue,
  ) {
    collectDefaultMetrics({ register: this.registry });
    this.queueGauge = new Gauge({
      name: 'listing_publish_jobs_total',
      help: 'Number of jobs in the publish queue by state',
      labelNames: ['state'],
      registers: [this.registry],
    });
    this.policyRefreshCounter = new Counter({
      name: 'ebay_policy_refresh_total',
      help: 'Number of eBay policy refresh attempts by result',
      labelNames: ['result'],
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
  }

  recordPolicyRefresh(result: 'success' | 'failure') {
    this.policyRefreshCounter.inc({ result });
  }

  getRegistry() {
    return this.registry;
  }
}
