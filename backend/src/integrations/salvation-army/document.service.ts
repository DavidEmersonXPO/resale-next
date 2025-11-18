import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SalvationArmyDocumentService {
  private readonly baseDir = join(process.cwd(), 'storage', 'salvation-army');

  async saveInvoiceHtml(invoiceId: string, html: string): Promise<string> {
    const filePath = join(this.baseDir, 'invoices', `${invoiceId}.html`);
    await this.writeFile(filePath, html);
    return filePath;
  }

  async saveListingHtml(listingId: string, html: string): Promise<string> {
    const filePath = join(this.baseDir, 'listings', `${listingId}.html`);
    await this.writeFile(filePath, html);
    return filePath;
  }

  async saveBidHistoryJson(listingId: string, data: unknown): Promise<string> {
    const filePath = join(this.baseDir, 'bid-history', `${listingId}.json`);
    await this.writeFile(filePath, JSON.stringify(data, null, 2));
    return filePath;
  }

  private async writeFile(filePath: string, contents: string) {
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, contents, 'utf8');
  }
}
