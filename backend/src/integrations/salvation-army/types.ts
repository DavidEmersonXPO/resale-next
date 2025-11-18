export interface InvoiceSummary {
  invoiceId: string;
  createdAt?: Date;
  total?: number;
  shipping?: number;
  tax?: number;
  seller?: string;
}

export interface InvoiceLineItem {
  sourceOrderId: string;
  listingId: string;
  invoiceId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  weightOz?: number;
  seller?: string;
  saleDate?: Date;
}

export interface ListingDetail {
  listingId: string;
  description?: string;
  categories: string[];
  condition?: string;
  bidHistory: BidEntry[];
}

export interface BidEntry {
  bidder: string;
  amount: number;
  placedAt?: Date;
}
