import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Item, ItemCard, Itemfilters, ItemFormData, PaginatedItems } from '../../shared/interfaces/item.interface';
import { Category } from '../../shared/interfaces/category.interface';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly API = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

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

getById(id: number): Observable<any> {
  const params = new HttpParams().set('_', String(Date.now()));
  return this.http.get<any>(`${this.API}/${id}`, { params });
}

  create(body: ItemFormData): Observable<Item> {
    return this.http.post<Item>(this.API, body);
  }

  update(id: number, body: Partial<ItemFormData>): Observable<Item> {
    return this.http.put<Item>(`${this.API}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  uploadImages(id: number, files: FormData): Observable<void> {
    return this.http.post<void>(`${this.API}/${id}/images`, files);
  }

  report(id: number, reason: string): Observable<void> {
    return this.http.post<void>(`${this.API}/${id}/report`, { reason });
  }

  publish(id: number): Observable<Item> {
    return this.http.patch<Item>(`${this.API}/${id}/publish`, {});
  }

  markAsSold(id: number): Observable<Item> {
    return this.http.patch<Item>(`${this.API}/${id}/sold`, {});
  }
}
