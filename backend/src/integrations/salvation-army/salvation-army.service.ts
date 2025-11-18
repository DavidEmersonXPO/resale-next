import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InventoryStatus, PurchaseSource } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PurchasesService } from '../../purchases/purchases.service';
import { SalvationInvoiceDto } from './dto/salvation-invoice.dto';
import { SalvationArmyCredentialService } from './salvation-army-credential.service';
import { SalvationArmyHttpService } from './salvation-army-http.service';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class SalvationArmyService {
  private readonly logger = new Logger(SalvationArmyService.name);
  private readonly apiKey?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly purchasesService: PurchasesService,
    private readonly credentialService: SalvationArmyCredentialService,
    private readonly httpService: SalvationArmyHttpService,
  ) {
    this.apiKey = this.configService.get<string>('integrations.salvationArmyApiKey') ?? undefined;
  }

  async ingestInvoice(invoice: SalvationInvoiceDto) {
    this.ensureConfigured();

    const supplier = await this.prisma.supplier.upsert({
      where: { externalId: invoice.invoiceNumber },
      update: {
        name: invoice.warehouse ?? 'Salvation Army',
        source: PurchaseSource.SALVATION_ARMY,
      },
      create: {
        name: invoice.warehouse ?? 'Salvation Army',
        source: PurchaseSource.SALVATION_ARMY,
        externalId: invoice.invoiceNumber,
      },
    });

    const purchase = await this.purchasesService.create({
      source: PurchaseSource.SALVATION_ARMY,
      purchaseDate: invoice.invoiceDate,
      orderNumber: invoice.invoiceNumber,
      totalCost: invoice.total,
      shippingCost: invoice.shipping,
      fees: invoice.fees,
      status: InventoryStatus.INBOUND,
      supplierId: supplier.id,
      notes: `Imported Salvation Army invoice (${invoice.warehouse ?? 'warehouse'})`,
      items: invoice.items.map((item) => ({
        title: item.description,
        description: item.lotNumber ? `Lot ${item.lotNumber}` : undefined,
        quantity: item.quantity,
        unitCost: item.price,
        inventoryStatus: InventoryStatus.INBOUND,
      })),
    });

    this.logger.log(`Ingested Salvation Army invoice ${invoice.invoiceNumber} into purchase ${purchase.id}`);
    return purchase;
  }

  private ensureConfigured() {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('Salvation Army integration is not configured. Set SALVATION_ARMY_API_KEY.');
    }
  }
}
