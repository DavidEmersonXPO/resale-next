import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface PurchaseItem {
  id: string;
  title: string;
  quantity: number;
  inventoryStatus: string;
}

interface Purchase {
  id: string;
  orderNumber?: string | null;
  purchaseDate: string;
  source: string;
  totalCost: string;
  items: PurchaseItem[];
}

interface Paginated<T> {
  data: T[];
}

export const usePurchases = () => {
  return useQuery({
    queryKey: ['mobile-purchases'],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<Purchase>>('/purchases', { params: { limit: 15 } });
      return data.data;
    },
  });
};
