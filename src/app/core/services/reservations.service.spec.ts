import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReservationsService } from './reservations.service';
import { environment } from '../../../environments/environment';
import { Reservation } from '../../shared/interfaces/reservation.interface';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let httpMock: HttpTestingController;
  const API = `${environment.apiUrl}/reservations`;

  const reservation: Reservation = {
    id_reservation: 1,
    reservation_status: 'pending',
    reservation_date: '2026-01-01',
    expiration_date: null,
    fk_items_id: 1,
    fk_buyer_id: 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReservationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('create hace POST a /reservations con fk_product_id', () => {
    service.create(1).subscribe(res => expect(res).toEqual(reservation));
    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ fk_product_id: 1 });
    req.flush(reservation);
  });

  it('cancel hace PATCH a /reservations/:id/cancel', () => {
    service.cancel(1).subscribe(res => expect(res).toBeNull());
    const req = httpMock.expectOne(`${API}/1/cancel`);
    expect(req.request.method).toBe('PATCH');
    req.flush(null);
  });

  it('complete hace PATCH a /reservations/:id/complete', () => {
    service.complete(1).subscribe(res => expect(res).toBeNull());
    const req = httpMock.expectOne(`${API}/1/complete`);
    expect(req.request.method).toBe('PATCH');
    req.flush(null);
  });

  it('getMyReservations hace GET a /reservations/my', () => {
    service.getMyReservations().subscribe(res => expect(res).toEqual([reservation]));
    const req = httpMock.expectOne(`${API}/my`);
    expect(req.request.method).toBe('GET');
    req.flush([reservation]);
  });
});
