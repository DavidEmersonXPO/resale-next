import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InventoryStatus, PurchaseSource } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PurchasesService } from '../../purchases/purchases.service';
import { GoodwillManifestDto } from './dto/goodwill-manifest.dto';

@Injectable()
export class GoodwillService {
  private readonly logger = new Logger(GoodwillService.name);
  private readonly apiKey?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly purchasesService: PurchasesService,
  ) {
    this.apiKey = this.configService.get<string>('integrations.goodwillApiKey') ?? undefined;
  }

  async ingestManifest(manifest: GoodwillManifestDto) {
    this.ensureConfigured();

    const supplier = await this.prisma.supplier.upsert({
      where: { externalId: manifest.manifestId },
      update: {
        name: manifest.supplierName ?? 'Goodwill',
        source: PurchaseSource.GOODWILL,
      },
      create: {
        name: manifest.supplierName ?? 'Goodwill',
        source: PurchaseSource.GOODWILL,
        externalId: manifest.manifestId,
      },
    });

    const purchase = await this.purchasesService.create({
      source: PurchaseSource.GOODWILL,
      purchaseDate: manifest.purchaseDate,
      orderNumber: manifest.manifestId,
      totalCost: manifest.totalCost,
      shippingCost: manifest.shippingCost,
      fees: manifest.fees,
      status: InventoryStatus.IN_STOCK,
      supplierId: supplier.id,
      notes: 'Imported via Goodwill manifest',
      items: manifest.items.map((item) => ({
        title: item.title,
        description: `Goodwill manifest ${manifest.manifestId}`,
        quantity: item.quantity,
        unitCost: item.unitCost,
        inventoryStatus: InventoryStatus.IN_STOCK,
      })),
    });

    this.logger.log(`Ingested Goodwill manifest ${manifest.manifestId} into purchase ${purchase.id}`);
    return purchase;
  }

  private ensureConfigured() {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('Goodwill integration is not configured. Set GOODWILL_API_KEY.');
    }
  }
}
