
import { DateString, User, UserSummary } from "./user.interface";
import { ConservationStatus } from '../enums/conservation-status.enum';
import { ItemStatus } from '../enums/item-status.enum';
import { Category } from "./category.interface";
import { Review } from "./review.interface";



export interface Item {
  id_items: number;
  title: string;
  description: string | null;
  price: number;
  conservation_status: ConservationStatus;
  item_status: ItemStatus;
  location: string;
  publication_date: DateString;
  fk_seller_id: number;
  fk_categories_id: number;
  item_update: DateString | null;

  seller?: UserSummary; 
  category?: Category; 
  images?: ItemPhoto[]; 
  reviews?: Review[]; 
  main_photo?: string;
}

export interface ItemCard {
  id_items: number;
  title: string;
  price: number;
  location: string;
  category: Category; 
  conservation_status: ConservationStatus;
  item_status: ItemStatus;
  publication_date: DateString;
  image: string;
  badge: string; 
  rating?: number; 
}

export interface ItemDetail extends Item {
  seller: User; 
  reviews: Review[];
  totalViews: number; 
  averageRating: number; 
}

export interface ItemPhoto {
  id_photos: number;
  photo_url: string;
  order: number | null;
  fk_items_id: number;
}

export interface ItemView {
  id_items: number;
  view_count: number;
  unique_viewers: number;
  last_viewed_date: DateString;
}

export interface ItemFormData {
  title: string;
  description?: string | null;
  price: number;
  conservation_status: ConservationStatus;
  item_status?: ItemStatus;
  location: string;
  fk_categories_id: number;
  images?: ItemPhoto[]; // Optional
}

export interface Itemfilters {
  search?: string;
  category?: string;
  categoryId?: number;
  sellerId?: number;
  conservation_status?: ConservationStatus;
  item_status?: ItemStatus;
  location?: string;
  minPrice?: number;
  maxPrice?: string | number;
  page?: number;
  limit?: number;
  sortBy?: 'date_desc' | 'price_asc' | 'price_desc' | 'rating_desc';
}

export interface PaginatedItems {
  items: ItemCard[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}




/** Local model used by MyProductsComponent (matches current mock schema). */
export interface MyProduct {
  id_products: number;
  id_user: number;
  product_title: string;
  product_description: string;
  product_price: number;
  product_category: string;
  product_condition: string;
  product_status: string;
  product_created_at: string;
  product_updated_at: string;
  product_main_image: string;
}
