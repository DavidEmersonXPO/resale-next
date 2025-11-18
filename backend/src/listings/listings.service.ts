import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingQueryDto } from './dto/listing-query.dto';

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateListingDto) {
    return this.prisma.listing.create({
      data: {
        platform: dto.platform,
        title: dto.title,
        description: dto.description,
        askingPrice: dto.askingPrice,
        feesEstimate: dto.feesEstimate,
        status: dto.status,
        listedAt: dto.listedAt ? new Date(dto.listedAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        quantity: dto.quantity,
        purchaseItemId: dto.purchaseItemId,
        condition: dto.condition,
        category: dto.category,
        tags: dto.tags ?? [],
        platformSettings: (dto.platformSettings ?? undefined) as Prisma.InputJsonValue | undefined,
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
    const { listedAt, expiresAt, platformSettings, purchaseItemId, ...rest } = dto;
    return this.prisma.listing.update({
      where: { id },
      data: {
        ...rest,
        listedAt: listedAt ? new Date(listedAt) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        platformSettings: (platformSettings ?? undefined) as Prisma.InputJsonValue | undefined,
        purchaseItemId,
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
    };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.listing.count({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Listing not found');
    }
  }
}
