import { parse } from 'csv-parse/sync';

export enum GoodwillOrderStatus {
  OPEN = 'Open',
  SHIPPED = 'Shipped',
}

export interface GoodwillOrderRecord {
  status: GoodwillOrderStatus;
  rawStatus?: string;
  orderNumber: string;
  itemNumber?: string;
  itemTitle?: string;
  seller?: string;
  quantity: number;
  price: number;
  shippingCost: number;
  handlingFee: number;
  taxAmount: number;
  trackingNumber?: string;
  endedAt?: Date;
}

const currencyToNumber = (value?: string) => {
  if (!value) return 0;
  const cleaned = value.replace(/[$,]/g, '').trim();
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDate = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export class GoodwillCsvParser {
  parse(
    csvContent: string,
    status: GoodwillOrderStatus,
  ): GoodwillOrderRecord[] {
    const rows: Record<string, string>[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    return rows.map((row) => ({
      status,
      rawStatus: row['Status'] ?? row['View'],
      orderNumber: row['Order #'] ?? row['Order'] ?? '',
      itemNumber: row['Item #'] ?? row['Item Id'] ?? row['Item'],
      itemTitle: row['Item'] ?? row['Title'],
      seller: row['Seller'] ?? row['Seller Name'],
      quantity: Number.parseInt(row['Qty'] ?? row['Quantity'] ?? '1', 10) || 1,
      price: currencyToNumber(row['Price']),
      shippingCost: currencyToNumber(row['Shipping']),
      handlingFee: currencyToNumber(row['Handling']),
      taxAmount: currencyToNumber(row['Tax']),
      trackingNumber: row['Tracking #'] ?? row['Tracking'],
      endedAt: toDate(
        status === GoodwillOrderStatus.OPEN ? row['Ended (PT)'] : row['Date'],
      ),
    }));
  }
}
