import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrdersService } from './orders.service';
import { environment } from '../../../environments/environment';
import { Purchase } from '../../shared/interfaces/item-history.interface';
import { TradeStatus } from '../../shared/enums/trade-status.enum';

describe('OrdersService', () => {
  let service: OrdersService;
  let httpMock: HttpTestingController;
  const API = `${environment.apiUrl}/orders`;

  const purchase = {
    id_item_history: 1,
    final_price: 10,
    trade_status: TradeStatus.Done,
    trade_date: '2026-01-01',
    fk_items_id: 1,
    fk_buyer_id: 2,
    fk_seller_id: 3,
    seller: { id_users: 3, username: 'seller', profile_picture: null, role: 'user', first_name: 'S', last_name: 'S' },
    item: {} as any,
  } as unknown as Purchase;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrdersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getMyPurchases hace GET a /orders/purchases', () => {
    service.getMyPurchases().subscribe(res => expect(res).toEqual([purchase]));
    const req = httpMock.expectOne(`${API}/purchases`);
    expect(req.request.method).toBe('GET');
    req.flush([purchase]);
  });

  it('getMySales hace GET a /orders/sales', () => {
    service.getMySales().subscribe(res => expect(res).toEqual([purchase]));
    const req = httpMock.expectOne(`${API}/sales`);
    expect(req.request.method).toBe('GET');
    req.flush([purchase]);
  });

  it('getById hace GET a /orders/:id', () => {
    service.getById(1).subscribe(res => expect(res).toEqual(purchase));
    const req = httpMock.expectOne(`${API}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(purchase);
  });
});
