export interface ListingMedia {
  id: string;
  url: string;
}

export interface Listing {
  id: string;
  platform: string;
  title: string;
  askingPrice: string;
  status: string;
  condition: string;
  category?: string | null;
  tags?: string[];
  listedAt?: string | null;
  purchaseItem?: {
    title: string;
    purchase?: {
      orderNumber?: string | null;
      purchaseDate: string;
    } | null;
  } | null;
  media: ListingMedia[];
}
