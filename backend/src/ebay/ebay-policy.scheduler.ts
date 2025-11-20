import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { EbayPoliciesService } from './ebay-policies.service';

@Injectable()
export class EbayPolicyScheduler implements OnModuleInit {
  private readonly logger = new Logger(EbayPolicyScheduler.name);
  private readonly refreshEnabled: boolean;
  private readonly refreshCron: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly ebayPolicies: EbayPoliciesService,
  ) {
    const policyConfig = this.configService.get<{
      refreshEnabled?: boolean;
      refreshCron?: string;
    }>('ebay.policies');
    this.refreshEnabled = policyConfig?.refreshEnabled ?? true;
    this.refreshCron = policyConfig?.refreshCron ?? '0 8 * * *';
  }

  onModuleInit() {
    if (!this.refreshEnabled) {
      this.logger.log('Automatic eBay policy refresh disabled via configuration.');
      return;
    }
    try {
      const job = new CronJob(this.refreshCron, () => {
        void this.handleRefresh();
      });
      this.schedulerRegistry.addCronJob('ebay-policy-refresh', job);
      job.start();
      this.logger.log(
        `Scheduled eBay policy refresh with cron "${this.refreshCron}".`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule eBay policy refresh (${this.refreshCron}).`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleRefresh() {
    try {
      this.logger.log('Refreshing eBay seller policies from scheduled job…');
      await this.ebayPolicies.refreshPolicies();
      this.logger.log('Ebay seller policies refreshed.');
    } catch (error) {
      this.logger.error(
        'Automatic eBay policy refresh failed.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
