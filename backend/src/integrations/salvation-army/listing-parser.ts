import { load } from 'cheerio';
import { BidEntry, ListingDetail } from './types';

export function parseListingDetail(
  listingId: string,
  html: string,
): ListingDetail {
  const $ = load(html);
  const description = $(
    '#ctl00_ctl00_cphContent_MainContent_ctl00_lblDescription',
  )
    .text()
    .trim();
  const categories = $('#breadcrumb li a')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  const condition = $('.item-attributes .condition span').text().trim();
  const bidHistory = parseBidHistory($);
  return {
    listingId,
    description,
    categories,
    condition,
    bidHistory,
  };
}

function parseBidHistory($: ReturnType<typeof load>): BidEntry[] {
  const entries: BidEntry[] = [];
  $('#bidHistory tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;
    entries.push({
      bidder: cells.eq(0).text().trim(),
      amount: parseCurrency(cells.eq(1).text()),
      placedAt: parseDate(cells.eq(2).text().trim()),
    });
  });
  return entries;
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
