import { DateString } from './user.interface';

// Lifecycle status of a reservation.
export type ReservationStatus = 'pending' | 'completed' | 'cancelled';

/**
 * Models a buyer's reservation of a product listing, backing
 * ReservationsService. `expiration_date` is null if the reservation
 * does not expire automatically.
 */
export interface Reservation {
  id_reservation: number;
  reservation_status: ReservationStatus;
  reservation_date: DateString;
  expiration_date: DateString | null;
  fk_items_id: number;
  fk_buyer_id: number;
}
