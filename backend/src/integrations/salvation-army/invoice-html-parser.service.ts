import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { SalvationInvoiceDto } from './dto/salvation-invoice.dto';

export interface ParsedInvoice {
  invoiceNumber: string;
  invoiceDate: Date;
  total: number;
  shipping: number;
  fees: number;
  warehouse: string;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
    lotNumber?: string;
  }>;
}

@Injectable()
export class InvoiceHtmlParserService {
  private readonly logger = new Logger(InvoiceHtmlParserService.name);

  /**
   * Parse Salvation Army invoice HTML and extract structured data
   */
  parseInvoiceHtml(html: string): ParsedInvoice | null {
    try {
      const $ = cheerio.load(html);

      // Extract invoice number from various common patterns
      const invoiceNumber = this.extractInvoiceNumber($);
      if (!invoiceNumber) {
        this.logger.warn('Could not extract invoice number from HTML');
        return null;
      }

      // Extract invoice date
      const invoiceDate = this.extractInvoiceDate($);
      if (!invoiceDate) {
        this.logger.warn(`Could not extract invoice date for ${invoiceNumber}`);
        return null;
      }

      // Extract warehouse/location
      const warehouse = this.extractWarehouse($);

      // Extract line items
      const items = this.extractLineItems($);
      if (items.length === 0) {
        this.logger.warn(`No line items found for invoice ${invoiceNumber}`);
      }

      // Extract totals
      const { total, shipping, fees } = this.extractTotals($, items);

      return {
        invoiceNumber,
        invoiceDate,
        total,
        shipping,
        fees,
        warehouse: warehouse || 'Salvation Army',
        items,
      };
    } catch (error) {
      this.logger.error(
        'Failed to parse invoice HTML',
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  /**
   * Convert parsed invoice to DTO format
   */
  toDto(parsed: ParsedInvoice): SalvationInvoiceDto {
    return {
      invoiceNumber: parsed.invoiceNumber,
      invoiceDate: parsed.invoiceDate.toISOString(),
      total: parsed.total,
      shipping: parsed.shipping,
      fees: parsed.fees,
      warehouse: parsed.warehouse,
      items: parsed.items,
    };
  }

  private extractInvoiceNumber($: cheerio.CheerioAPI): string | null {
    // Common patterns for invoice numbers
    const patterns = [
      // Look for "Invoice #" or "Invoice Number:" followed by the number
      /invoice\s*#?\s*:?\s*([A-Z0-9-]+)/i,
      /order\s*#?\s*:?\s*([A-Z0-9-]+)/i,
      /receipt\s*#?\s*:?\s*([A-Z0-9-]+)/i,
    ];

    // Search in common locations
    const text = $('body').text();
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    // Try to find in specific elements
    const candidates = [
      $('.invoice-number'),
      $('#invoice-number'),
      $('[data-invoice]'),
      $('.order-id'),
    ];

    for (const candidate of candidates) {
      const value = candidate.first().text().trim();
      if (value && /^[A-Z0-9-]+$/i.test(value)) {
        return value;
      }
    }

    return null;
  }

  private extractInvoiceDate($: cheerio.CheerioAPI): Date | null {
    // Common patterns for dates
    const datePatterns = [
      /date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /purchased\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    ];

    const text = $('body').text();
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const parsed = new Date(match[1]);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    // Try specific elements
    const candidates = [
      $('.invoice-date'),
      $('.date'),
      $('#invoice-date'),
      $('[data-date]'),
    ];

    for (const candidate of candidates) {
      const value = candidate.first().text().trim();
      if (value) {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    // Default to current date if not found
    return new Date();
  }

  private extractWarehouse($: cheerio.CheerioAPI): string | null {
    const patterns = [
      /warehouse\s*:?\s*([^\n,]+)/i,
      /location\s*:?\s*([^\n,]+)/i,
      /store\s*:?\s*([^\n,]+)/i,
    ];

    const text = $('body').text();
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractLineItems($: cheerio.CheerioAPI): Array<{
    description: string;
    quantity: number;
    price: number;
    lotNumber?: string;
  }> {
    const items: Array<{
      description: string;
      quantity: number;
      price: number;
      lotNumber?: string;
    }> = [];

    // Try to find table rows with item data
    const tableRows = $('table tr, .item-row, .line-item');

    tableRows.each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td, .cell');

      if (cells.length >= 3) {
        const description = cells.eq(0).text().trim();
        const quantityText = cells.eq(1).text().trim();
        const priceText = cells.eq(2).text().trim();

        // Skip header rows
        if (
          description.toLowerCase().includes('description') ||
          description.toLowerCase().includes('item')
        ) {
          return;
        }

        if (description) {
          const quantity = parseInt(quantityText) || 1;
          const price = this.parsePrice(priceText);

          if (price > 0) {
            // Try to extract lot number from description
            const lotMatch = description.match(/lot\s*#?\s*(\w+)/i);
            const lotNumber = lotMatch?.[1] || undefined;

            items.push({
              description,
              quantity,
              price,
              lotNumber,
            });
          }
        }
      }
    });

    // If no items found in tables, try to parse from text
    if (items.length === 0) {
      const text = $('body').text();
      const itemPattern = /(.+?)\s+(\d+)\s+\$?(\d+\.?\d*)/g;
      let match;

      while ((match = itemPattern.exec(text)) !== null) {
        const [, description, quantity, price] = match;
        if (description && description.length > 3) {
          items.push({
            description: description.trim(),
            quantity: parseInt(quantity),
            price: parseFloat(price),
          });
        }
      }
    }

    return items;
  }

  private extractTotals(
    $: cheerio.CheerioAPI,
    items: Array<{ price: number; quantity: number }>,
  ): { total: number; shipping: number; fees: number } {
    // Calculate total from items
    const itemsTotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // Try to find shipping cost
    const shippingText = $(
      '.shipping, .shipping-cost, [data-shipping]',
    )
      .first()
      .text();
    const shipping = this.parsePrice(shippingText) || 0;

    // Try to find fees/taxes
    const feesText = $('.fees, .tax, [data-fees]').first().text();
    const fees = this.parsePrice(feesText) || 0;

    // Try to find explicit total
    const totalText = $('.total, .grand-total, [data-total]')
      .first()
      .text();
    const explicitTotal = this.parsePrice(totalText);

    const total = explicitTotal || itemsTotal + shipping + fees;

    return { total, shipping, fees };
  }

  private parsePrice(text: string): number {
    // Remove currency symbols and parse
    const cleaned = text.replace(/[$,]/g, '').trim();
    const match = cleaned.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }
}
