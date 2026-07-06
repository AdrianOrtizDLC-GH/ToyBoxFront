import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FavoritesService } from './favorites.service';
import { environment } from '../../../environments/environment';
import { Favorite } from '../../shared/interfaces/favorite.interface';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let httpMock: HttpTestingController;
  const API = `${environment.apiUrl}/favorites`;

  const favorite: Favorite = {
    id_favorite: 1,
    saved_date: '2026-01-01',
    fk_users_id: 1,
    fk_items_id: 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FavoritesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getMyFavorites hace GET a /favorites', () => {
    service.getMyFavorites().subscribe(res => expect(res).toEqual([favorite]));
    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('GET');
    req.flush([favorite]);
  });

  it('add hace POST a /favorites/:productId', () => {
    service.add(2).subscribe(res => expect(res).toEqual(favorite));
    const req = httpMock.expectOne(`${API}/2`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(favorite);
  });

  it('remove hace DELETE a /favorites/:productId', () => {
    service.remove(2).subscribe(res => expect(res).toBeNull());
    const req = httpMock.expectOne(`${API}/2`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
