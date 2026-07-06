import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reservation } from '../../shared/interfaces/reservation.interface';

/**
 * Service handling product reservations: creating a reservation for a
 * product, cancelling or completing it, and listing the current user's
 * reservations.
 */
@Injectable({ providedIn: 'root' })
export class ReservationsService {
  // Base URL for reservation endpoints.
  private readonly API = `${environment.apiUrl}/reservations`;

  constructor(private http: HttpClient) {}

  /**
   * Creates a reservation for a product.
   * HTTP: POST {apiUrl}/reservations
   * @param productId Identifier of the product being reserved.
   * @returns Observable emitting the created Reservation.
   */
  create(productId: number): Observable<Reservation> {
    return this.http.post<Reservation>(this.API, { fk_product_id: productId });
  }

  /**
   * Cancels an existing reservation.
   * HTTP: PATCH {apiUrl}/reservations/{id}/cancel
   * @param id Reservation identifier.
   * @returns Observable that completes when the cancellation succeeds.
   */
  cancel(id: number): Observable<void> {
    return this.http.patch<void>(`${this.API}/${id}/cancel`, {});
  }

  /**
   * Marks a reservation as completed (e.g. transaction finalized).
   * HTTP: PATCH {apiUrl}/reservations/{id}/complete
   * @param id Reservation identifier.
   * @returns Observable that completes when the update succeeds.
   */
  complete(id: number): Observable<void> {
    return this.http.patch<void>(`${this.API}/${id}/complete`, {});
  }

  /**
   * Fetches the current user's reservations.
   * HTTP: GET {apiUrl}/reservations/my
   * @returns Observable emitting the list of Reservations.
   */
  getMyReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.API}/my`);
  }
}
