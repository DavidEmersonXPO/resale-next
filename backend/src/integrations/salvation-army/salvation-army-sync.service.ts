import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Prisma, InventoryStatus, PurchaseSource } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SalvationArmyCredentialService } from './salvation-army-credential.service';
import { SalvationArmyHttpService } from './salvation-army-http.service';
import { InvoiceHtmlParserService } from './invoice-html-parser.service';
import {
  SalvationArmyAuthError,
  SalvationArmyFetchError,
} from './errors';

@Injectable()
export class SalvationArmySyncService {
  private readonly logger = new Logger(SalvationArmySyncService.name);
  private readonly storagePath: string;
  private readonly autoCreatePurchases: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialService: SalvationArmyCredentialService,
    private readonly httpService: SalvationArmyHttpService,
    private readonly invoiceParser: InvoiceHtmlParserService,
    configService: ConfigService,
  ) {
    this.storagePath =
      configService.get<string>('integrations.salvationArmy.storagePath') ??
      './data/salvation-army';
    this.autoCreatePurchases =
      configService.get<boolean>(
        'integrations.salvationArmy.autoCreatePurchases',
      ) ?? true;
  }

  async sync() {
    const credential = await this.credentialService.getDecrypted();
    const { entity, username, password } = credential;
    await fs.mkdir(this.storagePath, { recursive: true }).catch(() => undefined);

    const log = await this.prisma.salvationArmySyncLog.create({
      data: { status: 'Running', message: 'Starting remote fetch' },
    });

    try {
      const { invoices, wonItems } = await this.httpService.fetchInvoices(
        username,
        password,
      );

      let stored = 0;
      let parsed = 0;
      let purchasesCreated = 0;

      for (const invoice of invoices) {
        await this.storeInvoiceDocument(invoice.invoiceId, invoice.html);
        stored += 1;

        // Parse invoice and auto-create purchase if enabled
        if (this.autoCreatePurchases) {
          const parsedInvoice = this.invoiceParser.parseInvoiceHtml(
            invoice.html,
          );

          if (parsedInvoice) {
            parsed += 1;
            const created = await this.createPurchaseFromInvoice(
              parsedInvoice,
            );
            if (created) {
              purchasesCreated += 1;
            }
          } else {
            this.logger.warn(
              `Failed to parse invoice ${invoice.invoiceId}, purchase not created`,
            );
          }
        }
      }

      if (wonItems?.length) {
        await this.storeJsonDocument(`won-items-${Date.now()}`, wonItems);
      }

      const message =
        `Downloaded ${stored} invoices` +
        (this.autoCreatePurchases
          ? `, parsed ${parsed}, created ${purchasesCreated} purchases`
          : '');

      await this.completeLog(log.id, 'Success', message, stored);
      await this.credentialService.updateStatus(
        entity.id,
        'Success',
        message,
        stored,
      );

      return { stored, parsed, purchasesCreated };
    } catch (error) {
      const message = this.formatError(error);
      this.logger.error('Salvation Army sync failed', error as Error);
      await this.completeLog(log.id, 'Failed', message);
      await this.credentialService.updateStatus(
        entity.id,
        'Failed',
        message,
        0,
      );
      throw error;
    }
  }

  private async storeInvoiceDocument(invoiceId: string, html: string) {
    const filename = `invoice-${invoiceId}-${Date.now()}.html`;
    const filePath = join(this.storagePath, filename);
    await fs.writeFile(filePath, html, 'utf8');
    await this.prisma.salvationArmyDocument.create({
      data: {
        invoiceId,
        documentType: 'invoice_html',
        filePath,
      },
    });
  }

  private async storeJsonDocument(
    key: string,
    payload: unknown,
  ) {
    const filename = `${key}.json`;
    const filePath = join(this.storagePath, filename);
    await fs.writeFile(
      filePath,
      JSON.stringify(payload, null, 2),
      'utf8',
    );
    await this.prisma.salvationArmyDocument.create({
      data: {
        invoiceId: key,
        documentType: 'json',
        filePath,
        metadata: payload as Prisma.InputJsonValue,
      },
    });
  }

  private async createPurchaseFromInvoice(
    parsedInvoice: any,
  ): Promise<boolean> {
    try {
      // Check if purchase already exists
      const existing = await this.prisma.purchase.findFirst({
        where: {
          orderNumber: parsedInvoice.invoiceNumber,
          source: PurchaseSource.SALVATION_ARMY,
        },
        select: { id: true },
      });

      if (existing) {
        this.logger.log(
          `Purchase for invoice ${parsedInvoice.invoiceNumber} already exists, skipping`,
        );
        return false;
      }

      // Create the purchase
      await this.prisma.$transaction(async (tx) => {
        const supplier = await tx.supplier.upsert({
          where: { externalId: parsedInvoice.invoiceNumber },
          update: {
            name: parsedInvoice.warehouse ?? 'Salvation Army',
            source: PurchaseSource.SALVATION_ARMY,
          },
          create: {
            name: parsedInvoice.warehouse ?? 'Salvation Army',
            source: PurchaseSource.SALVATION_ARMY,
            externalId: parsedInvoice.invoiceNumber,
          },
        });

        await tx.purchase.create({
          data: {
            source: PurchaseSource.SALVATION_ARMY,
            purchaseDate: parsedInvoice.invoiceDate,
            orderNumber: parsedInvoice.invoiceNumber,
            totalCost: parsedInvoice.total,
            shippingCost: parsedInvoice.shipping,
            fees: parsedInvoice.fees,
            status: InventoryStatus.INBOUND,
            supplierId: supplier.id,
            notes: `Auto-imported from parsed invoice (${parsedInvoice.warehouse ?? 'warehouse'})`,
            items: {
              create: parsedInvoice.items.map((item: any) => ({
                title: item.description,
                description: item.lotNumber
                  ? `Lot ${item.lotNumber}`
                  : undefined,
                quantity: item.quantity,
                unitCost: item.price,
                inventoryStatus: InventoryStatus.INBOUND,
              })),
            },
          },
        });
      });

      this.logger.log(
        `Auto-created purchase from invoice ${parsedInvoice.invoiceNumber}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to create purchase from invoice ${parsedInvoice.invoiceNumber}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  private formatError(error: unknown) {
    if (error instanceof SalvationArmyAuthError) {
      return `Authentication failed: ${error.message}`;
    }
    if (error instanceof SalvationArmyFetchError) {
      return `Fetch failed: ${error.message}`;
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }

  private async completeLog(
    id: string,
    status: string,
    message?: string,
    count = 0,
  ) {
    await this.prisma.salvationArmySyncLog.update({
      where: { id },
      data: {
        completedAt: new Date(),
        status,
        message,
        importedCount: count,
      },
    });
  }
}
