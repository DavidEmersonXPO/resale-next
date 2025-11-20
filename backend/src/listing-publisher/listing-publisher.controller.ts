import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ListingPublisherService } from './listing-publisher.service';

@ApiTags('Listing Publisher')
@Controller('listing-publisher')
export class ListingPublisherController {
  constructor(
    private readonly listingPublisherService: ListingPublisherService,
  ) {}

  @Get('jobs')
  listJobs(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : undefined;
    const bounded = parsed && parsed > 0 ? Math.min(parsed, 100) : 20;
    return this.listingPublisherService.listRecentJobs(bounded);
  }

  @Get('jobs/stats')
  getQueueStats() {
    return this.listingPublisherService.getQueueStats();
  }

  @Get('jobs/stats/:platform')
  getPlatformStats(@Param('platform') platform: string) {
    return this.listingPublisherService.getPlatformStats(platform);
  }

  @Get('jobs/:jobId')
  getJobStatus(@Param('jobId') jobId: string) {
    return this.listingPublisherService.getJobStatus(jobId);
  }

  @Post('jobs/:jobId/retry')
  retryJob(@Param('jobId') jobId: string) {
    return this.listingPublisherService.retryJob(jobId);
  }

  @Post('jobs/retry-failed')
  retryFailedJobs(
    @Body() payload: { platform?: string; limit?: number },
  ) {
    return this.listingPublisherService.retryFailedJobs(payload);
  }

  @Post('jobs/clean')
  cleanJobs(
    @Body()
    payload: {
      state?: 'completed' | 'failed';
      olderThan?: number;
    },
  ) {
    return this.listingPublisherService.cleanJobs(payload);
  }

  @Post('jobs/archive')
  archiveOldJobs(@Body() payload: { olderThanDays: number }) {
    return this.listingPublisherService.archiveOldJobs(payload.olderThanDays);
  }
}
