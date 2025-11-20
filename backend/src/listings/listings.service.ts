import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingQueryDto } from './dto/listing-query.dto';
import { ListingKitService } from './listing-kit.service';

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kitService: ListingKitService,
  ) {}

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

  async createListingKitArchive(id: string) {
    return this.kitService.createListingKitArchive(id);
  }
}
