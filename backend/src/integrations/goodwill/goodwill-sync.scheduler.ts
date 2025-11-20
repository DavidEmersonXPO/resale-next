import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import { GoodwillCredentialService } from './goodwill-credential.service';
import { GoodwillSyncService } from './goodwill-sync.service';

@Injectable()
export class GoodwillSyncScheduler implements OnModuleInit {
  private readonly logger = new Logger(GoodwillSyncScheduler.name);
  private readonly enabled: boolean;
  private readonly cronExpression: string;

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
    private readonly credentialService: GoodwillCredentialService,
    private readonly goodwillSyncService: GoodwillSyncService,
  ) {
    const goodwillConfig = this.configService.get<{
      sync?: { enabled?: boolean; cron?: string };
    }>('integrations.goodwill');
    this.enabled = goodwillConfig?.sync?.enabled ?? true;
    this.cronExpression = goodwillConfig?.sync?.cron ?? '0 6 * * *';
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Goodwill auto-sync scheduler disabled via configuration.');
      return;
    }

    try {
      const job = new CronJob(this.cronExpression, () => {
        void this.handleSync();
      });
      this.schedulerRegistry.addCronJob('goodwill-auto-sync', job);
      job.start();
      this.logger.log(
        `Goodwill auto-sync scheduled with cron "${this.cronExpression}".`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule Goodwill auto-sync (${this.cronExpression}).`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleSync() {
    try {
      const credential = await this.credentialService.getCredential();
      if (!credential.isConfigured) {
        this.logger.warn('Skipping Goodwill auto-sync: credentials not configured.');
        return;
      }
      if (credential.autoSyncEnabled === false) {
        this.logger.log('Skipping Goodwill auto-sync: autoSync disabled.');
        return;
      }
      this.logger.log('Starting scheduled Goodwill sync…');
      await this.goodwillSyncService.sync();
      this.logger.log('Scheduled Goodwill sync completed.');
    } catch (error) {
      this.logger.error(
        'Scheduled Goodwill sync failed.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
