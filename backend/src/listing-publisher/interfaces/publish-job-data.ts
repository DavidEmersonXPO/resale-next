import { ListingPlatform } from '@prisma/client';

export interface ListingPublishJobData {
  listingId: string;
  platform: ListingPlatform;
}
