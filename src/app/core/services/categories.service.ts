import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category } from '../../shared/interfaces/category.interface';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly API = `${environment.apiUrl}/categories`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Category[]> {
    return this.http.get<Category[]>(this.API);
  }

  create(body: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(this.API, body);
  }

  update(id: number, body: Partial<Category>): Observable<Category> {
    return this.http.put<Category>(`${this.API}/${id}`, body);
  }

  uploadIcon(id: number, file: FormData): Observable<Category> {
    return this.http.patch<Category>(`${this.API}/${id}/icon`, file);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}
