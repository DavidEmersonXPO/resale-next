import { ListingPlatform, ListingStatus } from '@prisma/client';
import type { PublishResult } from '../adapters/listing-adapter';

export interface ListingPublishJobSummary {
  jobId: string;
  listingId: string;
  listingTitle: string;
  listingStatus: ListingStatus;
  platform: ListingPlatform;
  state: string;
  queuedAt: number;
  finishedOn?: number | null;
  failedReason?: string | null;
  attemptsMade: number;
  returnValue?: PublishResult;
}
