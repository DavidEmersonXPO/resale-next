import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SalvationArmyCredentialService } from './salvation-army-credential.service';
import { SalvationArmyHttpService } from './salvation-army-http.service';
import {
  SalvationArmyAuthError,
  SalvationArmyFetchError,
} from './errors';

@Injectable()
export class SalvationArmySyncService {
  private readonly logger = new Logger(SalvationArmySyncService.name);
  private readonly storagePath: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialService: SalvationArmyCredentialService,
    private readonly httpService: SalvationArmyHttpService,
    configService: ConfigService,
  ) {
    this.storagePath =
      configService.get<string>('integrations.salvationArmy.storagePath') ??
      './data/salvation-army';
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
      for (const invoice of invoices) {
        await this.storeInvoiceDocument(invoice.invoiceId, invoice.html);
        stored += 1;
      }

      if (wonItems?.length) {
        await this.storeJsonDocument(
          `won-items-${Date.now()}`,
          wonItems,
        );
      }

      const message = `Downloaded ${stored} invoices`;
      await this.completeLog(log.id, 'Success', message, stored);
      await this.credentialService.updateStatus(
        entity.id,
        'Success',
        message,
        stored,
      );

      return { stored };
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
