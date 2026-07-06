
import { DateString, User, UserSummary } from "./user.interface";
import { ConservationStatus } from '../enums/conservation-status.enum';
import { ItemStatus } from '../enums/item-status.enum';
import { Category } from "./category.interface";
import { Review } from "./review.interface";
import { ProductCondition } from '../enums/product-condition.enum';


/**
 * Models a product listing ("item"), the core entity of the ToyBox
 * marketplace. Represents the full backend record, with optional
 * relations populated depending on the endpoint (seller, category,
 * images, reviews).
 */
export interface Item {
  id_items: number;
  title: string;
  description: string | null;
  price: number;
  conservation_status: ConservationStatus;
  product_condition?: ProductCondition;
  item_status: ItemStatus;
  location: string;
  publication_date: DateString;
  fk_seller_id: number;
  fk_categories_id: number;
  item_update: DateString | null; // Last update timestamp, null if never updated.

  seller?: UserSummary;
  category?: Category;
  images?: ItemPhoto[];
  reviews?: Review[];
  main_photo?: string;
}

/**
 * Lightweight view model of an Item used for catalog/grid card rendering
 * (e.g. search results). Produced by ProductsService.getAll() by mapping
 * the raw API response.
 */
export interface ItemCard {
  id_items: number;
  title: string;
  price: number;
  location: string;
  category: Category;
  conservation_status: ConservationStatus;
  product_condition?: ProductCondition;
  item_status: ItemStatus;
  publication_date: DateString;
  image: string;
  badge: string;
  rating?: number;
}


/**
 * Full detail view model of an Item, used on the product detail page.
 * Requires the seller and reviews relations to be populated (non-optional),
 * and adds aggregated view/rating stats.
 */
export interface ItemDetail extends Item {
  seller: User;
  reviews: Review[];
  totalViews: number;
  averageRating: number;
}

// Models a single photo attached to an item listing.
export interface ItemPhoto {
  id_photos: number;
  photo_url: string;
  order: number | null; // Display order among the item's photos; null if unspecified.
  fk_items_id: number;
}

// Aggregated view-count stats for an item.
export interface ItemView {
  id_items: number;
  view_count: number;
  unique_viewers: number;
  last_viewed_date: DateString;
}

// Payload used to create/update a product listing (create/edit product forms).
export interface ItemFormData {
  title: string;
  description?: string | null;
  price: number;
  conservation_status?: ConservationStatus;
  product_condition: ProductCondition;
  item_status?: ItemStatus;
  location: string;
  fk_categories_id: number;
  images?: ItemPhoto[];
}

// Query filter options accepted by ProductsService.getAll() for catalog search/filtering.
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

// Paginated catalog response: a page of ItemCards plus pagination metadata.
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
