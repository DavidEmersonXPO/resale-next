export type ListingPlatform =
  | 'EBAY'
  | 'FACEBOOK_MARKETPLACE'
  | 'OFFERUP'
  | 'POSHMARK'
  | 'MERCARI'
  | 'SHOPGOODWILL'
  | 'OTHER';

export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'PENDING' | 'SOLD' | 'ARCHIVED';

export type ListingCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'UNKNOWN';

export interface ListingMedia {
  id: string;
  url: string;
}

export interface ListingPlatformCredential {
  id: string;
  accountName: string;
  platform: ListingPlatform;
  lastVerifiedAt?: string | null;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
  updatedAt?: string;
}

export interface Listing {
  id: string;
  platform: ListingPlatform;
  platformCredential?: ListingPlatformCredential | null;
  title: string;
  description?: string | null;
  sku?: string | null;
  askingPrice: string;
  currency: string;
  minPrice?: string | null;
  shippingPrice?: string | null;
  status: ListingStatus;
  condition: ListingCondition;
  category?: string | null;
  tags?: string[];
  weightLbs?: string | null;
  dimensions?: Record<string, unknown> | null;
  location?: string | null;
  serialNumber?: string | null;
  platformSettings?: Record<string, unknown> | null;
  listedAt?: string | null;
  purchaseItem?: {
    title: string;
    purchase?: {
      orderNumber?: string | null;
      purchaseDate: string;
    } | null;
  } | null;
  media: ListingMedia[];
}

export type ListingPublishStatus =
  | 'draft'
  | 'live'
  | 'skipped'
  | 'failed'
  | 'validation_failed'
  | 'missing_credential';

export interface ListingPublishResult {
  platform: ListingPlatform;
  success: boolean;
  status: ListingPublishStatus;
  externalId?: string;
  url?: string;
  message?: string;
  errors?: string[];
  metadata?: Record<string, unknown>;
}

export interface ListingPublishQueueItem {
  platform: ListingPlatform;
  jobId: string;
}

export interface ListingPublishQueueResponse {
  listingId: string;
  queued: ListingPublishQueueItem[];
  failures: ListingPublishResult[];
}

export interface ListingPublishJobStatus {
  jobId: string;
  listingId: string;
  platform: ListingPlatform;
  state: string;
  progress: number | null;
  attemptsMade: number;
  failedReason?: string | null;
  returnValue?: ListingPublishResult;
  processedOn?: number | null;
  finishedOn?: number | null;
}

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
  returnValue?: ListingPublishResult;
}
