export interface PurchaseItem {
  id: string;
  title: string;
  quantity: number;
  unitCost: string;
  inventoryStatus: string;
  sku?: string | null;
  location?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
}

export interface Purchase {
  id: string;
  orderNumber?: string | null;
  source: string;
  purchaseDate: string;
  totalCost: string;
  shippingCost?: string | null;
  fees?: string | null;
  status: string;
  notes?: string | null;
  items: PurchaseItem[];
  supplier?: Supplier | null;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}
