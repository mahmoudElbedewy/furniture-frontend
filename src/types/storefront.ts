export type ProductVariant = {
  id: string;
  size_name: string;
  price: string;
  is_available?: boolean;
};

export type Product = {
  id: string;
  title: string;
  slug: string;
  variants?: ProductVariant[];
  description?: string | null;
  material?: string | null;
  color?: string | null;
  dimensions?: string | null;
  final_price: string;
  is_available?: boolean;
  category_name: string;
  requires_deposit?: boolean;
  deposit_amount?: string | null;
  deposit_note?: string | null;
  default_shipping_price?: string | null;
  ships_nationwide?: boolean;
  images?: unknown;
  shipping_rates?: Array<{
    governorate_name: string;
    area_name: string | null;
    price: string;
  }>;
  shipping_summary?: {
    free_shipping_areas: string[];
    paid_shipping_areas: Array<{
      price: string;
      areas: string[];
      count: number;
    }>;
    has_free_shipping: boolean;
    default_price: string | null;
    message: string;
  };
};

export type CartItem = {
  product: Product;
  quantity: number;
  selectedLocation?: string | null;
  shippingPrice?: number;
  selectedVariant?: ProductVariant | null;
};
