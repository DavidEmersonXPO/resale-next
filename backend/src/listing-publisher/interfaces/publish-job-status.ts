import { ListingPlatform } from '@prisma/client';
import type { PublishResult } from '../adapters/listing-adapter';

export interface ListingPublishJobStatus {
  jobId: string;
  listingId: string;
  platform: ListingPlatform;
  state: string;
  progress: number | null;
  attemptsMade: number;
  failedReason?: string | null;
  returnValue?: PublishResult;
  processedOn?: number | null;
  finishedOn?: number | null;
}
