import { ItemPhoto } from './item.interface';
import { DateString, UserSummary } from './user.interface';

export interface Review {
  id_reviews: number;
  rating: number;
  comment: string | null;
  review_date: DateString;
  fk_items_id: number;
  fk_reviewer_id: number;
  fk_reviewed_id: number;

  // optionals
  reviewer?: UserSummary;
  reviewed?: UserSummary;
  item?: ProductSummary;
}

export interface ProductSummary {
  id_items: number;
  title: string;
  price: number;
  images?: ItemPhoto[];
}
export interface CreateReviewRequest {
  rating: number;
  comment?: string | null;
  fk_items_id: number;
  fk_reviewed_id: number;
}
