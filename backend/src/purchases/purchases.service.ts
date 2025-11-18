import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PurchaseSource, InventoryStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { PurchaseQueryDto } from './dto/purchase-query.dto';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePurchaseDto) {
    return this.prisma.purchase.create({
      data: {
        orderNumber: dto.orderNumber,
        source: dto.source,
        purchaseDate: new Date(dto.purchaseDate),
        totalCost: dto.totalCost,
        shippingCost: dto.shippingCost,
        fees: dto.fees,
        status: dto.status,
        notes: dto.notes,
        supplierId: dto.supplierId,
        items: {
          create: dto.items.map((item) => ({
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            unitCost: item.unitCost,
            inventoryStatus: item.inventoryStatus,
            sku: item.sku,
            location: item.location,
          })),
        },
      },
      include: this.defaultInclude,
    });
  }

  async findAll(query: PurchaseQueryDto) {
    const { limit = 25, offset = 0, source, status, search } = query;
    const where: Prisma.PurchaseWhereInput = {};

    if (source) {
      where.source = source;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        {
          items: {
            some: {
              title: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.purchase.count({ where }),
      this.prisma.purchase.findMany({
        where,
        orderBy: { purchaseDate: 'desc' },
        skip: offset,
        take: limit,
        include: this.defaultInclude,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        limit,
        offset,
      },
    };
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: this.defaultInclude,
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase ${id} not found`);
    }

    return purchase;
  }

  async update(id: string, dto: UpdatePurchaseDto) {
    await this.ensureExists(id);

    const { items, ...rest } = dto;

    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.update({
        where: { id },
        data: {
          orderNumber: rest.orderNumber,
          source: rest.source,
          purchaseDate: rest.purchaseDate ? new Date(rest.purchaseDate) : undefined,
          totalCost: rest.totalCost,
          shippingCost: rest.shippingCost,
          fees: rest.fees,
          status: rest.status,
          supplierId: rest.supplierId,
          notes: rest.notes,
        },
      });

      if (items) {
        await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
        await tx.purchaseItem.createMany({
          data: items.map((item) => ({
            title: item.title,
            description: item.description,
            quantity: item.quantity ?? 1,
            unitCost: item.unitCost ?? 0,
            inventoryStatus: item.inventoryStatus ?? InventoryStatus.IN_STOCK,
            sku: item.sku,
            location: item.location,
            purchaseId: id,
          })),
        });
      }

      return tx.purchase.findUnique({
        where: { id: purchase.id },
        include: this.defaultInclude,
      });
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);

    await this.prisma.purchase.delete({
      where: { id },
    });

    return { id };
  }

  private get defaultInclude(): Prisma.PurchaseInclude {
    return {
      supplier: true,
      items: {
        include: {
          listings: true,
          media: true,
        },
      },
    };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.purchase.count({ where: { id } });
    if (!exists) {
      throw new NotFoundException(`Purchase ${id} not found`);
    }
  }
}
