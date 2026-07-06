import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Purchase } from '../../shared/interfaces/item-history.interface';

/**
 * Service handling completed transactions (orders): the current user's
 * purchase history, sales history, and single order lookup.
 */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  // Base URL for order endpoints.
  private readonly API = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  /**
   * Fetches the current user's purchase history (items bought).
   * HTTP: GET {apiUrl}/orders/purchases
   * @returns Observable emitting the list of Purchases.
   */
  getMyPurchases(): Observable<Purchase[]> {
    return this.http.get<Purchase[]>(`${this.API}/purchases`);
  }

  /**
   * Fetches the current user's sales history (items sold).
   * HTTP: GET {apiUrl}/orders/sales
   * @returns Observable emitting the list of Purchases (sale records).
   */
  getMySales(): Observable<Purchase[]> {
    return this.http.get<Purchase[]>(`${this.API}/sales`);
  }

  /**
   * Fetches a single order by id.
   * HTTP: GET {apiUrl}/orders/{id}
   * @param id Order identifier.
   * @returns Observable emitting the Purchase.
   */
  getById(id: number): Observable<Purchase> {
    return this.http.get<Purchase>(`${this.API}/${id}`);
  }
}
