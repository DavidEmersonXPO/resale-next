import { ListingPlatform, Prisma } from '@prisma/client';
import { DecryptedPlatformCredential } from '../../platform-credentials/platform-credentials.service';

export type ListingWithRelations = Prisma.ListingGetPayload<{
  include: {
    media: true;
    platformCredential: true;
    purchaseItem: {
      include: {
        purchase: true;
      };
    };
  };
}>;

export interface ValidationResult {
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PublishResult {
  platform: ListingPlatform;
  success: boolean;
  status:
    | 'draft'
    | 'live'
    | 'skipped'
    | 'failed'
    | 'validation_failed'
    | 'missing_credential';
  externalId?: string;
  url?: string;
  message?: string;
  errors?: string[];
  metadata?: Record<string, unknown>;
}

export interface PublishContext {
  jobId?: string;
}

export interface ListingAdapter {
  supports(platform: ListingPlatform): boolean;
  validate(listing: ListingWithRelations): ValidationResult;
  publish(
    listing: ListingWithRelations,
    credential: DecryptedPlatformCredential,
    context?: PublishContext,
  ): Promise<PublishResult>;
  updateStatus(listingId: string, result: PublishResult): Promise<void>;
}
