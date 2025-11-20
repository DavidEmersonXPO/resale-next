import { Injectable, Logger } from '@nestjs/common';
import { ListingPlatform, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ListingAdapter,
  ListingWithRelations,
  PublishResult,
  ValidationResult,
  PublishContext,
} from './listing-adapter';
import { DecryptedPlatformCredential } from '../../platform-credentials/platform-credentials.service';

@Injectable()
export class FacebookMarketplaceAdapter implements ListingAdapter {
  private readonly logger = new Logger(FacebookMarketplaceAdapter.name);

  constructor(private readonly prisma: PrismaService) {}

  supports(platform: ListingPlatform): boolean {
    return platform === ListingPlatform.FACEBOOK_MARKETPLACE;
  }

  validate(listing: ListingWithRelations): ValidationResult {
    const errors: string[] = [];

    if (!listing.title || listing.title.length < 5) {
      errors.push('Title must be at least 5 characters long.');
    }

    if (listing.title && listing.title.length > 100) {
      errors.push('Title must not exceed 100 characters.');
    }

    if (!listing.description || listing.description.length < 10) {
      errors.push('Description must be at least 10 characters long.');
    }

    if (!listing.askingPrice || Number(listing.askingPrice) <= 0) {
      errors.push('Asking price must be greater than 0.');
    }

    if (!listing.location) {
      errors.push('Location is required for Facebook Marketplace listings.');
    }

    if (!listing.media || listing.media.length === 0) {
      errors.push('At least one photo is required.');
    }

    if (listing.media && listing.media.length > 20) {
      errors.push('Facebook Marketplace allows a maximum of 20 photos.');
    }

    if (!listing.platformCredentialId) {
      errors.push('Platform credential must be assigned before publishing.');
    }

    return errors.length > 0
      ? { success: false, message: 'Listing validation failed', errors }
      : { success: true };
  }

  async publish(
    listing: ListingWithRelations,
    credential: DecryptedPlatformCredential,
    context?: PublishContext,
  ): Promise<PublishResult> {
    try {
      // Facebook Marketplace currently requires manual posting or Graph API access
      // This is a placeholder for future automation with Playwright or Graph API

      this.logger.log(
        `Facebook Marketplace publish request for listing ${listing.id} (context: ${context?.jobId ?? 'none'})`,
      );

      // For now, we'll mark this as a "draft" status and provide instructions
      // In the future, this would integrate with either:
      // 1. Facebook Graph API (if shop access is available)
      // 2. Playwright automation for browser-based posting

      const result: PublishResult = {
        platform: ListingPlatform.FACEBOOK_MARKETPLACE,
        success: false,
        status: 'draft',
        message:
          'Facebook Marketplace requires manual posting. Download the listing kit and use it to create your listing on Facebook.',
        metadata: {
          listingId: listing.id,
          title: listing.title,
          price: Number(listing.askingPrice),
          location: listing.location,
          requiresManualPosting: true,
          instructions: [
            '1. Visit Facebook Marketplace',
            '2. Click "Create New Listing"',
            '3. Upload the images from the downloaded kit',
            '4. Copy the title and description',
            '5. Set the price and location',
            '6. Review and publish',
          ],
        },
      };

      // Log the attempt
      await this.logPublishAttempt(listing.id, result, context);

      return result;
    } catch (error) {
      this.logger.error(
        `Facebook Marketplace publish failed for listing ${listing.id}`,
        error instanceof Error ? error.stack : String(error),
      );

      return {
        platform: ListingPlatform.FACEBOOK_MARKETPLACE,
        success: false,
        status: 'failed',
        message:
          error instanceof Error
            ? error.message
            : 'Facebook Marketplace publish failed',
      };
    }
  }

  async updateStatus(listingId: string, result: PublishResult): Promise<void> {
    const current = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { metadata: true },
    });

    const merged: Record<string, unknown> = {
      ...(typeof current?.metadata === 'object' && current.metadata !== null
        ? (current.metadata as Record<string, unknown>)
        : {}),
      ...(result.metadata ?? {}),
      facebookMarketplace: {
        status: result.status,
        message: result.message,
        updatedAt: new Date().toISOString(),
        requiresManualAction: true,
      },
    };

    await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        metadata: merged as Prisma.InputJsonValue,
        // Keep status as DRAFT since manual action is required
        status: 'DRAFT',
      },
    });
  }

  private async logPublishAttempt(
    listingId: string,
    result: PublishResult,
    context?: PublishContext,
  ): Promise<void> {
    // Store a log of the publish attempt
    // This could be extended to use a dedicated FacebookMarketplaceSyncLog table
    this.logger.log(
      `Facebook Marketplace publish attempt for listing ${listingId}: ${result.status}`,
    );
  }
}
