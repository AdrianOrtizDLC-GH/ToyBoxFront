import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Report } from '../../shared/interfaces/report.interface';

export interface ReportApi extends Report {
  item_title: string;
  item_description: string | null;
  item_conservation_status: string;
  reported_username: string;
  reporter_username: string;
}

export interface ReportsResponse {
  reports: ReportApi[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly ADMIN_API = `${environment.apiUrl}/admin/reports`;
  private readonly REPORTS_API = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  create(productId: number, reason: string): Observable<Report> {
    return this.http.post<Report>(this.REPORTS_API, {
      fk_items_id: productId,
      reason
    });
  }

  getAll(): Observable<ReportsResponse> {
    return this.http.get<ReportsResponse>(this.ADMIN_API);
  }

  getById(id: number): Observable<ReportApi> {
    return this.http.get<ReportApi>(`${this.ADMIN_API}/${id}`);
  }

  approve(productId: number): Observable<void> {
    return this.http.patch<void>(`${this.ADMIN_API}/${productId}/approve`, {});
  }

  withdraw(productId: number): Observable<void> {
    return this.http.patch<void>(`${this.ADMIN_API}/${productId}/withdraw`, {});
  }
}
