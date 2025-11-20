import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { SalvationArmyCredentialService } from './salvation-army-credential.service';
import { SalvationArmySyncService } from './salvation-army-sync.service';

@Injectable()
export class SalvationArmySyncScheduler implements OnModuleInit {
  private readonly logger = new Logger(SalvationArmySyncScheduler.name);
  private readonly enabled: boolean;
  private readonly cronExpression: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly credentialService: SalvationArmyCredentialService,
    private readonly syncService: SalvationArmySyncService,
  ) {
    const config = this.configService.get<{
      sync?: { enabled?: boolean; cron?: string };
    }>('integrations.salvationArmy');
    this.enabled = config?.sync?.enabled ?? true;
    this.cronExpression = config?.sync?.cron ?? '30 6 * * *';
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Salvation Army auto-sync disabled via configuration.');
      return;
    }

    try {
      const job = new CronJob(this.cronExpression, () => {
        void this.handleSync();
      });
      this.schedulerRegistry.addCronJob('salvation-army-auto-sync', job);
      job.start();
      this.logger.log(
        `Salvation Army auto-sync scheduled with cron "${this.cronExpression}".`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule Salvation Army auto-sync (${this.cronExpression}).`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleSync() {
    try {
      const credential = await this.credentialService.get();
      if (!credential.isConfigured) {
        this.logger.warn('Skipping Salvation Army sync: credentials not configured.');
        return;
      }
      if (credential.autoSyncEnabled === false) {
        this.logger.log('Skipping Salvation Army sync: autoSync disabled.');
        return;
      }
      this.logger.log('Running scheduled Salvation Army sync…');
      await this.syncService.sync();
      this.logger.log('Salvation Army sync completed.');
    } catch (error) {
      this.logger.error(
        'Scheduled Salvation Army sync failed.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
