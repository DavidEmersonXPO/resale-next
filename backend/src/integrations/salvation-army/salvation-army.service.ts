import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InventoryStatus, PurchaseSource } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SalvationInvoiceDto } from './dto/salvation-invoice.dto';
import { SalvationArmyCredentialService } from './salvation-army-credential.service';
import { SalvationArmyHttpService } from './salvation-army-http.service';

@Injectable()
export class SalvationArmyService {
  private readonly logger = new Logger(SalvationArmyService.name);
  private readonly apiKey?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly credentialService: SalvationArmyCredentialService,
    private readonly httpService: SalvationArmyHttpService,
  ) {
    this.apiKey =
      this.configService.get<string>('integrations.salvationArmyApiKey') ??
      undefined;
  }

  async ingestInvoice(invoice: SalvationInvoiceDto) {
    this.ensureConfigured();

    const existing = await this.prisma.purchase.findFirst({
      where: {
        orderNumber: invoice.invoiceNumber,
        source: PurchaseSource.SALVATION_ARMY,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `Invoice ${invoice.invoiceNumber} already ingested (purchase ${existing.id}).`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.upsert({
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

      const purchase = await tx.purchase.create({
        data: {
          source: PurchaseSource.SALVATION_ARMY,
          purchaseDate: invoice.invoiceDate,
          orderNumber: invoice.invoiceNumber,
          totalCost: invoice.total,
          shippingCost: invoice.shipping,
          fees: invoice.fees,
          status: InventoryStatus.INBOUND,
          supplierId: supplier.id,
          notes: `Imported Salvation Army invoice (${invoice.warehouse ?? 'warehouse'})`,
          items: {
            create: invoice.items.map((item) => ({
              title: item.description,
              description: item.lotNumber ? `Lot ${item.lotNumber}` : undefined,
              quantity: item.quantity,
              unitCost: item.price,
              inventoryStatus: InventoryStatus.INBOUND,
            })),
          },
        },
        include: {
          supplier: true,
          items: {
            include: {
              listings: true,
              media: true,
            },
          },
        },
      });

      this.logger.log(
        `Ingested Salvation Army invoice ${invoice.invoiceNumber} into purchase ${purchase.id}`,
      );
      return purchase;
    });
  }

  private ensureConfigured() {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'Salvation Army integration is not configured. Set SALVATION_ARMY_API_KEY.',
      );
    }
  }

}
