import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PurchaseSource, InventoryStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GoodwillCredentialService } from './goodwill-credential.service';
import {
  GoodwillCsvParser,
  GoodwillOrderRecord,
  GoodwillOrderStatus,
} from './goodwill-csv.parser';
import { promises as fs } from 'fs';
import { join } from 'path';
import { GoodwillHttpService } from './goodwill-http.service';
import {
  GoodwillAuthError,
  GoodwillDownloadError,
  GoodwillConfigurationError,
} from './errors';

@Injectable()
export class GoodwillSyncService {
  private readonly logger = new Logger(GoodwillSyncService.name);
  private readonly csvParser = new GoodwillCsvParser();
  private readonly csvDirectory: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialService: GoodwillCredentialService,
    private readonly httpService: GoodwillHttpService,
    configService: ConfigService,
  ) {
    this.csvDirectory =
      configService.get<string>('integrations.goodwillCsvDirectory') ??
      './data/goodwill';
  }

  async sync() {
    const credential = await this.credentialService.getDecryptedCredential();
    const { entity, username, password } = credential;

    const log = await this.prisma.goodwillSyncLog.create({
      data: { status: 'Running', message: 'Starting CSV sync' },
    });

    try {
      let records: GoodwillOrderRecord[] = [];
      try {
        records = await this.httpService.fetchRemoteOrders(
          username,
          password,
        );
      } catch (error) {
        throw error;
      }

      if (!records.length) {
        records = await this.loadRecordsFromDirectory();
      }
      if (!records.length) {
        await this.completeLog(log.id, 'NoData', 'No CSV files located');
        await this.credentialService.updateSyncStatus(
          entity.id,
          'NoData',
          'No CSV files found',
          0,
        );
        return { imported: 0 };
      }

      let imported = 0;
      const supplierCache = new Map<string, string>();
      await this.prisma.$transaction(async (tx) => {
        for (const record of records) {
          const result = await this.upsertRecord(
            record,
            tx,
            supplierCache,
          );
          if (result) {
            imported += 1;
          }
        }
      });

      await this.completeLog(
        log.id,
        'Success',
        `Imported ${imported} orders`,
        imported,
      );
      await this.credentialService.updateSyncStatus(
        entity.id,
        'Success',
        `Imported ${imported} orders`,
        imported,
      );

      return { imported };
    } catch (error) {
      const message = this.formatSyncError(error);
      this.logger.error(
        `Goodwill CSV sync failed: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.completeLog(log.id, 'Failed', message);
      await this.credentialService.updateSyncStatus(
        entity.id,
        'Failed',
        message,
        0,
      );
      throw error;
    }
  }

  private formatSyncError(error: unknown) {
    if (error instanceof GoodwillAuthError) {
      return `Authentication failed: ${error.message}`;
    }
    if (error instanceof GoodwillDownloadError) {
      return `Download failed: ${error.message}`;
    }
    if (error instanceof GoodwillConfigurationError) {
      return `Configuration error: ${error.message}`;
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }

  private async loadRecordsFromDirectory(): Promise<GoodwillOrderRecord[]> {
    const dir = this.csvDirectory;
    const entries = await fs
      .readdir(dir, { withFileTypes: true })
      .catch(() => []);
    const records: GoodwillOrderRecord[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.csv'))
        continue;
      const fullPath = join(dir, entry.name);
      const content = await fs.readFile(fullPath, 'utf8');
      const status = entry.name.toLowerCase().includes('shipped')
        ? GoodwillOrderStatus.SHIPPED
        : GoodwillOrderStatus.OPEN;
      records.push(...this.csvParser.parse(content, status));
    }

    return records;
  }

  private async upsertRecord(
    record: GoodwillOrderRecord,
    tx: Prisma.TransactionClient,
    supplierCache: Map<string, string>,
  ) {
    if (!record.orderNumber) {
      return false;
    }

    const existing = await tx.purchase.findFirst({
      where: {
        orderNumber: record.orderNumber,
        source: PurchaseSource.GOODWILL,
      },
      include: { items: true },
    });

    const purchaseData: Prisma.PurchaseUncheckedCreateInput = {
      orderNumber: record.orderNumber,
      source: PurchaseSource.GOODWILL,
      purchaseDate: record.endedAt ?? new Date(),
      totalCost: new Prisma.Decimal(
        record.price +
          record.shippingCost +
          record.handlingFee +
          record.taxAmount,
      ),
      shippingCost: new Prisma.Decimal(
        record.shippingCost + record.handlingFee,
      ),
      fees: new Prisma.Decimal(record.taxAmount),
      status: InventoryStatus.IN_STOCK,
      notes: `Imported from ShopGoodwill (${record.status})`,
      supplierId: await this.ensureSupplier(record.seller, tx, supplierCache),
    };

    if (!existing) {
      await tx.purchase.create({
        data: {
          ...purchaseData,
          items: {
            create: [
              {
                title: record.itemTitle ?? 'ShopGoodwill Item',
                quantity: record.quantity,
                unitCost: new Prisma.Decimal(
                  record.price / Math.max(record.quantity, 1),
                ),
              },
            ],
          },
        },
      });
      return true;
    }

    await tx.purchase.update({
      where: { id: existing.id },
      data: {
        ...purchaseData,
        items: {
          deleteMany: { purchaseId: existing.id },
          create: [
            {
              title: record.itemTitle ?? 'ShopGoodwill Item',
              quantity: record.quantity,
              unitCost: new Prisma.Decimal(
                record.price / Math.max(record.quantity, 1),
              ),
            },
          ],
        },
      },
    });

    return true;
  }

  private async ensureSupplier(
    name: string | null | undefined,
    tx: Prisma.TransactionClient,
    cache: Map<string, string>,
  ) {
    const supplierName = name?.trim() || 'ShopGoodwill';
    const cacheKey = supplierName.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const existing = await tx.supplier.findFirst({
      where: {
        name: supplierName,
        source: PurchaseSource.GOODWILL,
      },
    });
    if (existing) {
      cache.set(cacheKey, existing.id);
      return existing.id;
    }
    const supplier = await tx.supplier.create({
      data: {
        name: supplierName,
        source: PurchaseSource.GOODWILL,
        notes: 'Imported via Goodwill sync',
      },
    });
    cache.set(cacheKey, supplier.id);
    return supplier.id;
  }

  private async completeLog(
    id: string,
    status: string,
    message?: string,
    imported = 0,
  ) {
    await this.prisma.goodwillSyncLog.update({
      where: { id },
      data: {
        completedAt: new Date(),
        status,
        message,
        importedCount: imported,
      },
    });
  }
}
