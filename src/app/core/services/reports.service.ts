import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Report } from '../../shared/interfaces/report.interface';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly ADMIN_API = `${environment.apiUrl}/admin/reports`;
  private readonly REPORTS_API = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

create(productId: number, reason: string): Observable<Report> {
  return this.http.post<Report>(`${environment.apiUrl}/products/${productId}/report`, {
    reason
  });
}

  getPending(): Observable<any> {
    return this.http.get<any>(this.ADMIN_API);
  }

  getById(id: number): Observable<Report> {
    return this.http.get<Report>(`${this.ADMIN_API}/${id}`);
  }

  approve(productId: number): Observable<void> {
    return this.http.patch<void>(`${this.ADMIN_API}/${productId}/approve`, {});
  }

  withdraw(productId: number): Observable<void> {
    return this.http.patch<void>(`${this.ADMIN_API}/${productId}/withdraw`, {});
  }
}