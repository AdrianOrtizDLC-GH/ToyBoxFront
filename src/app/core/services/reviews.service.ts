import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateReviewRequest, Review } from '../../shared/interfaces/review.interface';

/**
 * Service handling product/seller reviews: fetching reviews by product,
 * by reviewer (author), or by seller (subject), and creating new reviews.
 */
@Injectable({ providedIn: 'root' })
export class ReviewsService {
  // Base URL for review endpoints.
  private readonly API = `${environment.apiUrl}/reviews`;

  constructor(private http: HttpClient) {}

  /**
   * Fetches reviews left for a specific product.
   * HTTP: GET {apiUrl}/reviews/product/{productId}
   * @param productId Product identifier.
   * @returns Observable emitting the list of Reviews.
   */
  getByProduct(productId: number): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.API}/product/${productId}`);
  }

  /**
   * Fetches reviews authored by a specific user (reviewer).
   * HTTP: GET {apiUrl}/reviews/reviewer/{reviewerId}
   * @param reviewerId Identifier of the user who wrote the reviews.
   * @returns Observable emitting the list of Reviews.
   */
  getByReviewer(reviewerId: number): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.API}/reviewer/${reviewerId}`);
  }

  /**
   * Fetches reviews received by a specific seller.
   * HTTP: GET {apiUrl}/reviews/seller/{sellerId}
   * @param sellerId Identifier of the seller being reviewed.
   * @returns Observable emitting the list of Reviews.
   */
  getBySeller(sellerId: number): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.API}/seller/${sellerId}`);
  }

  /**
   * Creates a new review.
   * HTTP: POST {apiUrl}/reviews
   * @param body Review data (rating, comment, target product/seller, etc.).
   * @returns Observable emitting the created Review.
   */
  create(body: CreateReviewRequest): Observable<Review> {
    return this.http.post<Review>(this.API, body);
  }
}
