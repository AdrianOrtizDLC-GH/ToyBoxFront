import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductsService } from './products.service';
import { environment } from '../../../environments/environment';

describe('ProductsService', () => {
  let service: ProductsService;
  let httpMock: HttpTestingController;
  const API = `${environment.apiUrl}/products`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll hace GET a /products y mapea la respuesta a PaginatedItems', () => {
    const rawResponse = {
      items: [
        {
          id_items: 1,
          title: 'Coche de juguete',
          price: '19.99',
          location: 'Madrid',
          fk_categories_id: 2,
          category_name: 'Construcción',
          conservation_status: 'published',
          item_status: 'available',
          publication_date: '2026-01-01',
          main_photo: 'foto.jpg',
        },
      ],
      total: 1,
      page: 1,
      limit: 12,
      totalPages: 1,
    };

    service.getAll().subscribe(res => {
      expect(res.total).toBe(1);
      expect(res.items.length).toBe(1);
      expect(res.items[0]).toEqual({
        id_items: 1,
        title: 'Coche de juguete',
        price: 19.99,
        location: 'Madrid',
        category: { id_categories: 2, name: 'Construcción', description: null },
        conservation_status: 'published',
        item_status: 'available',
        publication_date: '2026-01-01',
        image: 'foto.jpg',
        badge: 'available',
      });
    });

    const req = httpMock.expectOne(r => r.url === API);
    expect(req.request.method).toBe('GET');
    req.flush(rawResponse);
  });

  it('getAll envía los filtros como query params', () => {
    service.getAll({ search: 'coche', page: 2 }).subscribe();

    const req = httpMock.expectOne(
      r => r.url === API && r.params.get('search') === 'coche' && r.params.get('page') === '2'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], total: 0, page: 2, limit: 12, totalPages: 0 });
  });

  it('getById hace GET a /products/:id con un parámetro anti-caché', () => {
    service.getById(1).subscribe(res => expect(res).toEqual({ id_items: 1 }));
    const req = httpMock.expectOne(r => r.url === `${API}/1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('_')).toBe(true);
    req.flush({ id_items: 1 });
  });

  it('create hace POST a /products con el body', () => {
    const body = { title: 'Nuevo' } as any;
    service.create(body).subscribe();
    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('update hace PUT a /products/:id', () => {
    service.update(1, { title: 'Editado' }).subscribe();
    const req = httpMock.expectOne(`${API}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('delete hace DELETE a /products/:id', () => {
    service.delete(1).subscribe();
    const req = httpMock.expectOne(`${API}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('uploadImages hace POST a /products/:id/images con FormData', () => {
    const formData = new FormData();
    service.uploadImages(1, formData).subscribe();
    const req = httpMock.expectOne(`${API}/1/images`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(formData);
    req.flush(null);
  });

  it('report hace POST a /products/:id/report con el motivo', () => {
    service.report(1, 'Motivo').subscribe();
    const req = httpMock.expectOne(`${API}/1/report`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reason: 'Motivo' });
    req.flush(null);
  });

  it('publish hace PATCH a /products/:id/publish', () => {
    service.publish(1).subscribe();
    const req = httpMock.expectOne(`${API}/1/publish`);
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });

  it('markAsSold hace PATCH a /products/:id/sold con fk_buyer_id', () => {
    service.markAsSold(1, 2).subscribe();
    const req = httpMock.expectOne(`${API}/1/sold`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ fk_buyer_id: 2 });
    req.flush({});
  });
});
