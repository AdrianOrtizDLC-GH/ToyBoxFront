import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category } from '../../shared/interfaces/category.interface';

/**
 * Service handling product categories: listing, creation, update,
 * icon upload, and deletion. Used both by the public catalog (getAll)
 * and by the admin categories-management page (create/update/uploadIcon/delete).
 */
@Injectable({ providedIn: 'root' })
export class CategoriesService {
  // Base URL for category endpoints.
  private readonly API = `${environment.apiUrl}/categories`;

  constructor(private http: HttpClient) {}

  /**
   * Fetches all categories.
   * HTTP: GET {apiUrl}/categories
   * @returns Observable emitting the list of categories.
   */
  getAll(): Observable<Category[]> {
    return this.http.get<Category[]>(this.API);
  }

  /**
   * Creates a new category.
   * HTTP: POST {apiUrl}/categories
   * @param body Partial category data (name, description, etc.).
   * @returns Observable emitting the created Category.
   */
  create(body: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(this.API, body);
  }

  /**
   * Updates an existing category.
   * HTTP: PUT {apiUrl}/categories/{id}
   * @param id Category identifier.
   * @param body Partial category fields to update.
   * @returns Observable emitting the updated Category.
   */
  update(id: number, body: Partial<Category>): Observable<Category> {
    return this.http.put<Category>(`${this.API}/${id}`, body);
  }

  /**
   * Uploads/replaces the icon image for a category.
   * HTTP: PATCH {apiUrl}/categories/{id}/icon
   * @param id Category identifier.
   * @param file FormData containing the icon image file.
   * @returns Observable emitting the updated Category.
   */
  uploadIcon(id: number, file: FormData): Observable<Category> {
    return this.http.patch<Category>(`${this.API}/${id}/icon`, file);
  }

  /**
   * Deletes a category.
   * HTTP: DELETE {apiUrl}/categories/{id}
   * @param id Category identifier.
   * @returns Observable that completes when the deletion succeeds.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}
