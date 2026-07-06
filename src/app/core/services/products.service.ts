import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Item, ItemCard, Itemfilters, ItemFormData, PaginatedItems } from '../../shared/interfaces/item.interface';
import { Category } from '../../shared/interfaces/category.interface';

/**
 * Service handling products (the app's core "items" catalog): paginated
 * search/listing with filters, single product retrieval, creation,
 * update, deletion, image upload, reporting, and publish/mark-as-sold
 * status transitions.
 */
@Injectable({ providedIn: 'root' })
export class ProductsService {
  // Base URL for product endpoints.
  private readonly API = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  /**
   * Fetches a paginated, filterable list of products for the catalog.
   * HTTP: GET {apiUrl}/products?<filters>
   * @param filters Optional query filters (e.g. category, search text,
   * pagination), serialized as query params; undefined values are skipped.
   * @returns Observable emitting a PaginatedItems object. The raw API
   * response is mapped into ItemCard view models (normalizing price to a
   * number, embedding a Category object, defaulting missing fields).
   */
  getAll(filters: Itemfilters = {}): Observable<PaginatedItems> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) params = params.set(k, String(v)); });
    return this.http.get<any>(this.API, { params }).pipe(
      map(res => ({
        items: (res.items ?? []).map((raw: any): ItemCard => ({
          id_items:            raw.id_items,
          title:               raw.title,
          price:               Number(raw.price),
          location:            raw.location ?? '',
          category:            { id_categories: raw.fk_categories_id, name: raw.category_name ?? '', description: null } as Category,
          conservation_status: raw.conservation_status,
          item_status:         raw.item_status,
          publication_date:    raw.publication_date,
          image:               raw.main_photo ?? '',
          badge:               raw.item_status ?? '',
        })),
        total:      res.total ?? 0,
        page:       res.page ?? 1,
        limit:      res.limit ?? 12,
        totalPages: res.totalPages ?? Math.ceil((res.total ?? 0) / (res.limit ?? 12)),
      } as PaginatedItems))
    );
  }

/**
 * Fetches a single product by id.
 * HTTP: GET {apiUrl}/products/{id}
 * A cache-busting `_` timestamp query param is added to avoid stale
 * cached responses (e.g. right after an update/publish/sold transition).
 * @param id Product identifier.
 * @returns Observable emitting the raw product data.
 */
getById(id: number): Observable<any> {
  const params = new HttpParams().set('_', String(Date.now()));
  return this.http.get<any>(`${this.API}/${id}`, { params });
}

  /**
   * Creates a new product listing.
   * HTTP: POST {apiUrl}/products
   * @param body Product form data.
   * @returns Observable emitting the created Item.
   */
  create(body: ItemFormData): Observable<Item> {
    return this.http.post<Item>(this.API, body);
  }

  /**
   * Updates an existing product.
   * HTTP: PUT {apiUrl}/products/{id}
   * @param id Product identifier.
   * @param body Partial product fields to update.
   * @returns Observable emitting the updated Item.
   */
  update(id: number, body: Partial<ItemFormData>): Observable<Item> {
    return this.http.put<Item>(`${this.API}/${id}`, body);
  }

  /**
   * Deletes a product.
   * HTTP: DELETE {apiUrl}/products/{id}
   * @param id Product identifier.
   * @returns Observable that completes when the deletion succeeds.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  /**
   * Uploads one or more images for a product.
   * HTTP: POST {apiUrl}/products/{id}/images
   * @param id Product identifier.
   * @param files FormData containing the image file(s).
   * @returns Observable that completes when the upload succeeds.
   */
  uploadImages(id: number, files: FormData): Observable<void> {
    return this.http.post<void>(`${this.API}/${id}/images`, files);
  }

  /**
   * Reports a product for moderation review.
   * HTTP: POST {apiUrl}/products/{id}/report
   * @param id Product identifier being reported.
   * @param reason Free-text reason for the report.
   * @returns Observable that completes when the report is submitted.
   */
  report(id: number, reason: string): Observable<void> {
    return this.http.post<void>(`${this.API}/${id}/report`, { reason });
  }

  /**
   * Publishes a product (makes it visible/active in the catalog).
   * HTTP: PATCH {apiUrl}/products/{id}/publish
   * @param id Product identifier.
   * @returns Observable emitting the updated Item.
   */
  publish(id: number): Observable<Item> {
    return this.http.patch<Item>(`${this.API}/${id}/publish`, {});
  }

  /**
   * Toggles the reserved state of a product.
   * HTTP: PATCH {apiUrl}/products/{id}/reserved
   * @param id Product identifier.
   * @returns Observable emitting the updated Item.
   */
  toggleReserved(id: number): Observable<Item> {
    return this.http.patch<Item>(`${this.API}/${id}/reserved`, {});
  }

  /**
   * Marks a product as sold, optionally recording the buyer and sale price.
   * HTTP: PATCH {apiUrl}/products/{id}/sold
   * @param id Product identifier.
   * @param fk_buyer_id Optional identifier of the buyer.
   * @param price Optional final sale price.
   * @returns Observable emitting the updated Item.
   */
  markAsSold(id: number, fk_buyer_id?: number, price?: number): Observable<Item> {
      return this.http.patch<Item>(`${this.API}/${id}/sold`, { fk_buyer_id, price });
  }
}
