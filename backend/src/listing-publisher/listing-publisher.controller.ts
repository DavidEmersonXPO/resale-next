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

  @Get('jobs/:jobId')
  getJobStatus(@Param('jobId') jobId: string) {
    return this.listingPublisherService.getJobStatus(jobId);
  }

  @Post('jobs/:jobId/retry')
  retryJob(@Param('jobId') jobId: string) {
    return this.listingPublisherService.retryJob(jobId);
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
}
