import { load } from 'cheerio';
import { InvoiceSummary, InvoiceLineItem } from './types';

export function parseInvoiceSummaries(html: string): InvoiceSummary[] {
  const $ = load(html);
  const summaries: InvoiceSummary[] = [];
  $('table.invoice-list tbody tr').each((_, row) => {
    const invoiceId = $(row).find('td').first().text().trim();
    if (!invoiceId) return;
    const dateText = $(row).find('td').eq(1).text().trim();
    const totalText = $(row).find('td').eq(2).text().trim();
    const shippingText = $(row).find('td').eq(3).text().trim();
    const taxText = $(row).find('td').eq(4).text().trim();
    const summary: InvoiceSummary = {
      invoiceId,
      createdAt: parseDate(dateText),
      total: parseCurrency(totalText),
      shipping: parseCurrency(shippingText),
      tax: parseCurrency(taxText),
    };
    summaries.push(summary);
  });
  return summaries;
}

export function parseInvoiceDetail(
  invoiceId: string,
  html: string,
): InvoiceLineItem[] {
  const $ = load(html);
  const items: InvoiceLineItem[] = [];
  $('.invoice-line').each((index, el) => {
    const listingId = $(el).attr('data-listing-id') ?? '';
    const title = $(el).find('.line-title').text().trim();
    const qty = Number.parseInt($(el).find('.line-qty').text().trim(), 10) || 1;
    const price = parseCurrency($(el).find('.line-price').text());
    const total = parseCurrency($(el).find('.line-total').text());
    const line: InvoiceLineItem = {
      sourceOrderId: `${invoiceId}:${listingId}:${index}`,
      invoiceId,
      listingId,
      title,
      quantity: qty,
      unitPrice: price / Math.max(qty, 1),
      totalPrice: total || price,
      saleDate: parseDate($(el).find('.line-date').text()),
      seller: $(el).find('.line-seller').text().trim() || undefined,
    };
    items.push(line);
  });
  return items;
}

function parseCurrency(value?: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[$,]/g, '').trim();
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
