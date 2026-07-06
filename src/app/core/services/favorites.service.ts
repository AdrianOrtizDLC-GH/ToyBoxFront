import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Favorite } from '../../shared/interfaces/favorite.interface';

/**
 * Service handling the current user's favorite products: listing,
 * adding, and removing favorites.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  // Base URL for favorites endpoints.
  private readonly API = `${environment.apiUrl}/favorites`;

  constructor(private http: HttpClient) {}

  /**
   * Fetches the current user's favorite products.
   * HTTP: GET {apiUrl}/favorites
   * @returns Observable emitting the list of Favorites.
   */
  getMyFavorites(): Observable<Favorite[]> {
    return this.http.get<Favorite[]>(this.API);
  }

  /**
   * Adds a product to the current user's favorites.
   * HTTP: POST {apiUrl}/favorites/{productId}
   * @param productId Identifier of the product to favorite.
   * @returns Observable emitting the created Favorite.
   */
  add(productId: number): Observable<Favorite> {
    return this.http.post<Favorite>(`${this.API}/${productId}`, {});
  }

  /**
   * Removes a product from the current user's favorites.
   * HTTP: DELETE {apiUrl}/favorites/{productId}
   * @param productId Identifier of the product to remove.
   * @returns Observable that completes when the removal succeeds.
   */
  remove(productId: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${productId}`);
  }
}
