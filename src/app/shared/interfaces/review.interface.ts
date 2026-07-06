import { ItemPhoto } from './item.interface';
import { DateString, UserSummary } from './user.interface';

/**
 * Models a review left by one user (reviewer) about another (reviewed),
 * tied to a specific product transaction. Backs ReviewsService.
 */
export interface Review {
  id_reviews: number;
  rating: number;
  comment: string | null;
  review_date: DateString;
  fk_items_id: number;
  fk_reviewer_id: number;
  fk_reviewed_id: number;

  // Optional relations, populated depending on the endpoint/join used.
  reviewer?: UserSummary;
  reviewed?: UserSummary;
  item?: ProductSummary;
}

// Lightweight product summary embedded in a Review for display purposes.
export interface ProductSummary {
  id_items: number;
  title: string;
  price: number;
  images?: ItemPhoto[];
}

// Payload used to create a new review.
export interface CreateReviewRequest {
  rating: number;
  comment?: string | null;
  fk_items_id: number;
  fk_reviewed_id: number;
}
