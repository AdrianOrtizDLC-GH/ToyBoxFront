import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReviewsService } from './reviews.service';
import { environment } from '../../../environments/environment';
import { CreateReviewRequest, Review } from '../../shared/interfaces/review.interface';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let httpMock: HttpTestingController;
  const API = `${environment.apiUrl}/reviews`;

  const review: Review = {
    id_reviews: 1,
    rating: 5,
    comment: 'Genial',
    review_date: '2026-01-01',
    fk_items_id: 1,
    fk_reviewer_id: 2,
    fk_reviewed_id: 3,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReviewsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getByProduct hace GET a /reviews/product/:id', () => {
    service.getByProduct(1).subscribe(res => expect(res).toEqual([review]));
    const req = httpMock.expectOne(`${API}/product/1`);
    expect(req.request.method).toBe('GET');
    req.flush([review]);
  });

  it('getByReviewer hace GET a /reviews/reviewer/:id', () => {
    service.getByReviewer(2).subscribe(res => expect(res).toEqual([review]));
    const req = httpMock.expectOne(`${API}/reviewer/2`);
    expect(req.request.method).toBe('GET');
    req.flush([review]);
  });

  it('getBySeller hace GET a /reviews/seller/:id', () => {
    service.getBySeller(3).subscribe(res => expect(res).toEqual([review]));
    const req = httpMock.expectOne(`${API}/seller/3`);
    expect(req.request.method).toBe('GET');
    req.flush([review]);
  });

  it('create hace POST a /reviews con el body', () => {
    const body: CreateReviewRequest = { rating: 5, comment: 'Genial', fk_items_id: 1, fk_reviewed_id: 3 };
    service.create(body).subscribe(res => expect(res).toEqual(review));
    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(review);
  });
});
