import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CategoriesService } from './categories.service';
import { environment } from '../../../environments/environment';
import { Category } from '../../shared/interfaces/category.interface';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let httpMock: HttpTestingController;
  const API = `${environment.apiUrl}/categories`;

  const category: Category = { id_categories: 1, name: 'Videojuegos', description: null };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CategoriesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll hace GET a /categories', () => {
    service.getAll().subscribe(res => expect(res).toEqual([category]));
    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('GET');
    req.flush([category]);
  });

  it('create hace POST a /categories con el body', () => {
    const body = { name: 'Nueva' };
    service.create(body).subscribe(res => expect(res).toEqual(category));
    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(category);
  });

  it('update hace PUT a /categories/:id con el body', () => {
    const body = { name: 'Editada' };
    service.update(1, body).subscribe(res => expect(res).toEqual(category));
    const req = httpMock.expectOne(`${API}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(category);
  });

  it('uploadIcon hace PATCH a /categories/:id/icon', () => {
    const formData = new FormData();
    service.uploadIcon(1, formData).subscribe(res => expect(res).toEqual(category));
    const req = httpMock.expectOne(`${API}/1/icon`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toBe(formData);
    req.flush(category);
  });

  it('delete hace DELETE a /categories/:id', () => {
    service.delete(1).subscribe(res => expect(res).toBeNull());
    const req = httpMock.expectOne(`${API}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
