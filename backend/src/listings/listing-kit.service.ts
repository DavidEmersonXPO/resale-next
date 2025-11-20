import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ListingPlatform, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import archiver, { Archiver } from 'archiver';
import { join, basename, extname } from 'path';
import { promises as fs } from 'fs';
import sharp from 'sharp';

interface PlatformImageSpec {
  maxWidth: number;
  maxHeight: number;
  maxCount: number;
  quality: number;
}

@Injectable()
export class ListingKitService {
  private readonly logger = new Logger(ListingKitService.name);
  private readonly mediaStoragePath: string;

  private readonly platformSpecs: Record<
    ListingPlatform,
    PlatformImageSpec
  > = {
    [ListingPlatform.EBAY]: {
      maxWidth: 1600,
      maxHeight: 1600,
      maxCount: 12,
      quality: 90,
    },
    [ListingPlatform.FACEBOOK_MARKETPLACE]: {
      maxWidth: 2048,
      maxHeight: 2048,
      maxCount: 20,
      quality: 85,
    },
    [ListingPlatform.OFFERUP]: {
      maxWidth: 1200,
      maxHeight: 1200,
      maxCount: 12,
      quality: 85,
    },
    [ListingPlatform.POSHMARK]: {
      maxWidth: 2048,
      maxHeight: 2048,
      maxCount: 16,
      quality: 90,
    },
    [ListingPlatform.MERCARI]: {
      maxWidth: 1200,
      maxHeight: 1200,
      maxCount: 12,
      quality: 85,
    },
    [ListingPlatform.SHOPGOODWILL]: {
      maxWidth: 1024,
      maxHeight: 1024,
      maxCount: 8,
      quality: 80,
    },
    [ListingPlatform.OTHER]: {
      maxWidth: 1600,
      maxHeight: 1600,
      maxCount: 12,
      quality: 85,
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.mediaStoragePath =
      configService.get<string>('media.storagePath') ?? './storage/media';
  }

  async createListingKitArchive(
    id: string,
  ): Promise<{ archive: Archiver; filename: string }> {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        purchaseItem: {
          include: {
            purchase: true,
          },
        },
        media: true,
        sales: true,
        platformCredential: {
          select: {
            id: true,
            accountName: true,
            platform: true,
            lastVerifiedAt: true,
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('warning', (error) => {
      if (error.code !== 'ENOENT') {
        this.logger.warn(`Archive warning: ${error.message}`);
      }
    });
    archive.on('error', (error) => {
      throw error;
    });

    // Add metadata.json
    await this.addMetadata(archive, listing);

    // Add platform-specific CSVs
    await this.addPlatformCsvs(archive, listing);

    // Add description files
    await this.addDescriptions(archive, listing);

    // Add resized images per platform
    await this.addResizedImages(archive, listing);

    const safeTitle = this.slugify(listing.title) || listing.id;
    return {
      archive,
      filename: `${safeTitle}-kit.zip`,
    };
  }

  private async addMetadata(archive: Archiver, listing: any) {
    const purchaseRecord = listing.purchaseItem?.purchase;

    const metadata = {
      id: listing.id,
      platform: listing.platform,
      title: listing.title,
      description: listing.description,
      sku: listing.sku,
      price: listing.askingPrice,
      currency: listing.currency,
      quantity: listing.quantity,
      condition: listing.condition,
      category: listing.category,
      tags: listing.tags,
      status: listing.status,
      dimensions: listing.dimensions,
      weightLbs: listing.weightLbs,
      shippingPrice: listing.shippingPrice,
      platformSettings: listing.platformSettings,
      purchase: listing.purchaseItem
        ? {
            id: listing.purchaseItem.id,
            title: listing.purchaseItem.title,
            orderNumber: purchaseRecord?.orderNumber ?? null,
            purchaseDate: purchaseRecord?.purchaseDate ?? null,
            supplier: purchaseRecord?.supplierId ?? null,
          }
        : null,
      exportedAt: new Date().toISOString(),
    };

    archive.append(JSON.stringify(metadata, null, 2), {
      name: 'metadata.json',
    });
  }

  private async addPlatformCsvs(archive: Archiver, listing: any) {
    // Generic CSV
    const genericCsv = this.generateGenericCsv(listing);
    archive.append(genericCsv, { name: 'csv/generic.csv' });

    // eBay-specific CSV
    if (
      listing.platform === ListingPlatform.EBAY ||
      listing.platform === ListingPlatform.OTHER
    ) {
      const ebayCsv = this.generateEbayCsv(listing);
      archive.append(ebayCsv, { name: 'csv/ebay.csv' });
    }

    // Facebook Marketplace CSV
    const fbCsv = this.generateFacebookCsv(listing);
    archive.append(fbCsv, { name: 'csv/facebook-marketplace.csv' });

    // Poshmark CSV
    const poshmarkCsv = this.generatePoshmarkCsv(listing);
    archive.append(poshmarkCsv, { name: 'csv/poshmark.csv' });
  }

  private generateGenericCsv(listing: any): string {
    const headers = [
      'Title',
      'Description',
      'Price',
      'Currency',
      'Quantity',
      'SKU',
      'Condition',
      'Category',
      'Tags',
      'Weight (lbs)',
      'Shipping Price',
    ];

    const row = [
      this.escapeCsv(listing.title),
      this.escapeCsv(listing.description ?? ''),
      String(listing.askingPrice ?? ''),
      listing.currency ?? 'USD',
      String(listing.quantity ?? 1),
      listing.sku ?? '',
      listing.condition ?? '',
      listing.category ?? '',
      (listing.tags ?? []).join(';'),
      String(listing.weightLbs ?? ''),
      String(listing.shippingPrice ?? ''),
    ];

    return `${headers.join(',')}\n${row.join(',')}\n`;
  }

  private generateEbayCsv(listing: any): string {
    const platformSettings = listing.platformSettings as Record<
      string,
      unknown
    > | null;

    const headers = [
      'Action',
      'CustomLabel',
      'Title',
      'Description',
      'Quantity',
      'Format',
      'StartPrice',
      'BuyItNowPrice',
      'Category',
      'Condition',
      'ConditionDescription',
      'PaymentProfileName',
      'ReturnProfileName',
      'ShippingProfileName',
      'PicURL',
    ];

    const row = [
      'Add',
      listing.sku ?? '',
      this.escapeCsv(listing.title),
      this.escapeCsv(listing.description ?? ''),
      String(listing.quantity ?? 1),
      'FixedPrice',
      String(listing.askingPrice ?? ''),
      String(listing.askingPrice ?? ''),
      listing.category ??
        (typeof platformSettings?.categoryId === 'string'
          ? platformSettings.categoryId
          : ''),
      this.mapConditionToEbay(listing.condition),
      '',
      '',
      '',
      '',
      '', // PicURL would be added manually
    ];

    return `${headers.join(',')}\n${row.join(',')}\n`;
  }

  private generateFacebookCsv(listing: any): string {
    const headers = [
      'Title',
      'Description',
      'Price',
      'Condition',
      'Category',
      'Location',
    ];

    const row = [
      this.escapeCsv(listing.title),
      this.escapeCsv(listing.description ?? ''),
      String(listing.askingPrice ?? ''),
      this.mapConditionToFacebook(listing.condition),
      listing.category ?? '',
      listing.location ?? '',
    ];

    return `${headers.join(',')}\n${row.join(',')}\n`;
  }

  private generatePoshmarkCsv(listing: any): string {
    const headers = [
      'Title',
      'Description',
      'Price',
      'Original Price',
      'Brand',
      'Category',
      'Condition',
      'Size',
      'Color',
    ];

    const row = [
      this.escapeCsv(listing.title),
      this.escapeCsv(listing.description ?? ''),
      String(listing.askingPrice ?? ''),
      '',
      '',
      listing.category ?? '',
      this.mapConditionToPoshmark(listing.condition),
      '',
      '',
    ];

    return `${headers.join(',')}\n${row.join(',')}\n`;
  }

  private async addDescriptions(archive: Archiver, listing: any) {
    const description = listing.description ?? listing.title;

    // Markdown format
    archive.append(description.trim(), { name: 'description.md' });

    // Plain text format
    archive.append(description.trim(), { name: 'description.txt' });

    // HTML format
    const htmlDescription = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${this.escapeHtml(listing.title)}</title>
</head>
<body>
  <h1>${this.escapeHtml(listing.title)}</h1>
  <p>${this.escapeHtml(description)}</p>
  ${listing.condition ? `<p><strong>Condition:</strong> ${this.escapeHtml(listing.condition)}</p>` : ''}
  ${listing.tags?.length ? `<p><strong>Tags:</strong> ${listing.tags.join(', ')}</p>` : ''}
</body>
</html>`;

    archive.append(htmlDescription, { name: 'description.html' });
  }

  private async addResizedImages(archive: Archiver, listing: any) {
    if (!listing.media || listing.media.length === 0) {
      this.logger.warn(`No media found for listing ${listing.id}`);
      return;
    }

    const spec = this.platformSpecs[listing.platform];
    const mediaToProcess = listing.media.slice(0, spec.maxCount);

    for (let i = 0; i < mediaToProcess.length; i++) {
      const media = mediaToProcess[i];
      const filePath = await this.resolveMediaPath(media.url);

      if (!filePath) {
        this.logger.warn(`Could not resolve media path: ${media.url}`);
        continue;
      }

      try {
        // Original image
        const ext = extname(filePath);
        const originalName = `image-${i + 1}-original${ext}`;
        archive.file(filePath, { name: `images/original/${originalName}` });

        // Platform-optimized image
        const resizedBuffer = await this.resizeImage(
          filePath,
          spec.maxWidth,
          spec.maxHeight,
          spec.quality,
        );
        const resizedName = `image-${i + 1}.jpg`;
        archive.append(resizedBuffer, {
          name: `images/optimized/${resizedName}`,
        });

        // Thumbnail (for previews)
        const thumbnailBuffer = await this.resizeImage(filePath, 400, 400, 80);
        const thumbnailName = `image-${i + 1}-thumb.jpg`;
        archive.append(thumbnailBuffer, {
          name: `images/thumbnails/${thumbnailName}`,
        });
      } catch (error) {
        this.logger.error(
          `Failed to process image ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async resizeImage(
    filePath: string,
    maxWidth: number,
    maxHeight: number,
    quality: number,
  ): Promise<Buffer> {
    return sharp(filePath)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }

  private async resolveMediaPath(url: string | null): Promise<string | null> {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return null;
    }
    const relative = url.startsWith('/media/')
      ? url.replace('/media/', '')
      : url;
    const fullPath = join(process.cwd(), this.mediaStoragePath, relative);
    try {
      await fs.access(fullPath);
      return fullPath;
    } catch {
      return null;
    }
  }

  private mapConditionToEbay(condition: string | null): string {
    const mapping: Record<string, string> = {
      NEW: '1000',
      LIKE_NEW: '1500',
      GOOD: '3000',
      FAIR: '4000',
      POOR: '5000',
    };
    return mapping[condition ?? 'UNKNOWN'] ?? '3000';
  }

  private mapConditionToFacebook(condition: string | null): string {
    const mapping: Record<string, string> = {
      NEW: 'New',
      LIKE_NEW: 'Like New',
      GOOD: 'Good',
      FAIR: 'Fair',
      POOR: 'Poor',
    };
    return mapping[condition ?? 'UNKNOWN'] ?? 'Used - Good';
  }

  private mapConditionToPoshmark(condition: string | null): string {
    const mapping: Record<string, string> = {
      NEW: 'NWT',
      LIKE_NEW: 'NWOT',
      GOOD: 'Good',
      FAIR: 'Fair',
      POOR: 'Poor',
    };
    return mapping[condition ?? 'UNKNOWN'] ?? 'Good';
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  private escapeCsv(value: string): string {
    const needsQuotes =
      value.includes(',') || value.includes('"') || value.includes('\n');
    if (!needsQuotes) return value;
    return `"${value.replace(/"/g, '""')}"`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
