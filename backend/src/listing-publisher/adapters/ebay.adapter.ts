import { Injectable } from '@nestjs/common';
import { ListingPlatform, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ListingAdapter,
  ListingWithRelations,
  PublishResult,
  ValidationResult,
} from './listing-adapter';
import { DecryptedPlatformCredential } from '../../platform-credentials/platform-credentials.service';
import { EbayListingService } from '../../ebay/ebay-listing.service';
import type { PublishContext } from './listing-adapter';

@Injectable()
export class EbayAdapter implements ListingAdapter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ebayListingService: EbayListingService,
  ) {}

  supports(platform: ListingPlatform) {
    return platform === ListingPlatform.EBAY;
  }

  validate(listing: ListingWithRelations): ValidationResult {
    const errors: string[] = [];
    if (!listing.sku) {
      errors.push('SKU is required for eBay listings.');
    }
    if (!listing.askingPrice || Number(listing.askingPrice) <= 0) {
      errors.push('Asking price must be greater than 0.');
    }
    if (!listing.platformCredentialId) {
      errors.push('Platform credential must be assigned before publishing.');
    }
    if (!listing.media.length) {
      errors.push('At least one photo is required by eBay.');
    }

    return errors.length
      ? { success: false, message: 'Listing missing eBay requirements', errors }
      : { success: true };
  }

  async publish(
    listing: ListingWithRelations,
    credential: DecryptedPlatformCredential,
    context?: PublishContext,
  ): Promise<PublishResult> {
    const sku = listing.sku ?? `resale-${listing.id}`;
    const platformSettings = listing.platformSettings as Record<
      string,
      unknown
    > | null;
    try {
      const result = await this.ebayListingService.createListing(
        {
          sku,
          title: listing.title,
          description:
            listing.description ??
            listing.purchaseItem?.title ??
            'Resale listing',
          quantity: listing.quantity,
          price: Number(listing.askingPrice),
          condition: listing.condition,
          categoryId:
            typeof platformSettings?.categoryId === 'string' &&
            platformSettings.categoryId.trim()
              ? platformSettings.categoryId
              : (listing.category ?? undefined),
          imageUrls: listing.media.map((media) => media.url),
          paymentPolicyId:
            typeof platformSettings?.paymentPolicyId === 'string'
              ? platformSettings.paymentPolicyId
              : undefined,
          fulfillmentPolicyId:
            typeof platformSettings?.fulfillmentPolicyId === 'string'
              ? platformSettings.fulfillmentPolicyId
              : undefined,
          returnPolicyId:
            typeof platformSettings?.returnPolicyId === 'string'
              ? platformSettings.returnPolicyId
              : undefined,
        },
        context,
      );
      return {
        platform: ListingPlatform.EBAY,
        success: true,
        status: 'live',
        externalId: result.listingId,
        url: result.listingUrl,
        metadata: {
          offerId: result.offerId,
          sku: result.sku,
          account: credential.accountName,
        },
      };
    } catch (error) {
      return {
        platform: ListingPlatform.EBAY,
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'eBay publish failed',
      };
    }
  }

  async updateStatus(listingId: string, result: PublishResult) {
    const current = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { metadata: true },
    });
    const merged: Record<string, unknown> = {
      ...(typeof current?.metadata === 'object' && current.metadata !== null
        ? (current.metadata as Record<string, unknown>)
        : {}),
      ...(result.metadata ?? {}),
      ebay: {
        externalId: result.externalId,
        url: result.url,
        status: result.status,
        message: result.message,
        updatedAt: new Date().toISOString(),
      },
    };

    await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        metadata: merged as Prisma.InputJsonValue,
        status: result.success ? 'ACTIVE' : 'PENDING',
      },
    });
  }
}
