import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingQueryDto } from './dto/listing-query.dto';
import { ConfigService } from '@nestjs/config';
import { join, basename } from 'path';
import { promises as fs } from 'fs';
import archiver, { Archiver } from 'archiver';

@Injectable()
export class ListingsService {
  private readonly mediaStoragePath: string;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.mediaStoragePath =
      configService.get<string>('media.storagePath') ?? './storage/media';
  }

  async create(dto: CreateListingDto) {
    return this.prisma.listing.create({
      data: {
        platform: dto.platform,
        accountId: dto.accountId?.trim() || undefined,
        platformCredentialId: dto.platformCredentialId || undefined,
        title: dto.title,
        description: dto.description,
        sku: dto.sku?.trim(),
        askingPrice: dto.askingPrice,
        currency: dto.currency ?? 'USD',
        minPrice: dto.minPrice,
        shippingPrice: dto.shippingPrice,
        feesEstimate: dto.feesEstimate,
        status: dto.status,
        listedAt: dto.listedAt ? new Date(dto.listedAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        quantity: dto.quantity,
        purchaseItemId: dto.purchaseItemId,
        condition: dto.condition,
        category: dto.category,
        tags: dto.tags ?? [],
        weightLbs: dto.weightLbs,
        dimensions: (dto.dimensions ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        location: dto.location?.trim(),
        serialNumber: dto.serialNumber?.trim(),
        platformSettings: (dto.platformSettings ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
      include: this.defaultInclude,
    });
  }

  async findAll(query: ListingQueryDto) {
    const where: Prisma.ListingWhereInput = {};
    if (query.platform) {
      where.platform = query.platform;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.listing.count({ where }),
      this.prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.offset ?? 0,
        take: query.limit ?? 25,
        include: this.defaultInclude,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        limit: query.limit ?? 25,
        offset: query.offset ?? 0,
      },
    };
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: this.defaultInclude,
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    return listing;
  }

  async update(id: string, dto: UpdateListingDto) {
    await this.ensureExists(id);
    const {
      listedAt,
      expiresAt,
      platformSettings,
      dimensions,
      purchaseItemId,
      platformCredentialId,
      accountId,
      sku,
      location,
      serialNumber,
      ...rest
    } = dto;
    return this.prisma.listing.update({
      where: { id },
      data: {
        ...rest,
        platformCredentialId: platformCredentialId || undefined,
        accountId: accountId?.trim(),
        sku: sku?.trim(),
        location: location?.trim(),
        serialNumber: serialNumber?.trim(),
        listedAt: listedAt ? new Date(listedAt) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        platformSettings: (platformSettings ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        purchaseItemId,
        dimensions: (dimensions ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
      include: this.defaultInclude,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.listing.delete({ where: { id } });
    return { id };
  }

  private get defaultInclude(): Prisma.ListingInclude {
    return {
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
    };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.listing.count({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Listing not found');
    }
  }

  async createListingKitArchive(
    id: string,
  ): Promise<{ archive: Archiver; filename: string }> {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: this.defaultInclude,
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('warning', (error) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    });
    archive.on('error', (error) => {
      throw error;
    });

    const purchaseRecord = (listing.purchaseItem as any)?.purchase;

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
    };

    archive.append(JSON.stringify(metadata, null, 2), {
      name: 'metadata.json',
    });

    const csvHeaders = [
      'Title',
      'Description',
      'Price',
      'Currency',
      'Quantity',
      'SKU',
      'Condition',
      'Tags',
      'Category',
    ];
    const csvRow = [
      this.escapeCsv(listing.title),
      this.escapeCsv(listing.description ?? ''),
      String(listing.askingPrice ?? ''),
      listing.currency ?? 'USD',
      String(listing.quantity ?? 1),
      listing.sku ?? '',
      listing.condition ?? '',
      (listing.tags ?? []).join(';'),
      listing.category ?? '',
    ];
    const csvContent = `${csvHeaders.join(',')}\n${csvRow.join(',')}\n`;
    archive.append(csvContent, { name: 'listing.csv' });

    archive.append((listing.description ?? '').trim() || listing.title, {
      name: 'description.md',
    });

    for (const media of listing.media) {
      const filePath = await this.resolveMediaPath(media.url);
      if (!filePath) {
        continue;
      }
      archive.file(filePath, { name: `images/${basename(filePath)}` });
    }

    const safeTitle = this.slugify(listing.title) || listing.id;
    return {
      archive,
      filename: `${safeTitle}-kit.zip`,
    };
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
}
