import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Report } from '../../shared/interfaces/report.interface';

// Report as returned by the admin/moderation endpoints, enriched with
// denormalized display fields (item and username details) not present
// on the base Report entity.
export interface ReportApi extends Report {
  item_title: string;
  item_description: string | null;
  item_conservation_status: string;
  reported_username: string; // Username of the reported product's owner.
  reporter_username: string; // Username of the user who filed the report.
}

// Paginated response for the admin reports listing.
export interface ReportsResponse {
  reports: ReportApi[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Service handling product reports: filing a report as a regular user,
 * and moderator/admin operations to list, inspect, approve, or withdraw
 * reported products.
 */
@Injectable({ providedIn: 'root' })
export class ReportsService {
  // Base URL for admin/moderation report endpoints.
  private readonly ADMIN_API = `${environment.apiUrl}/admin/reports`;
  // Base URL for general report endpoints (currently unused directly, kept for reference).
  private readonly REPORTS_API = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

/**
 * Files a new report against a product.
 * HTTP: POST {apiUrl}/products/{productId}/report
 * @param productId Identifier of the reported product.
 * @param reason Free-text reason for the report.
 * @returns Observable emitting the created Report.
 */
create(productId: number, reason: string): Observable<Report> {
  return this.http.post<Report>(`${environment.apiUrl}/products/${productId}/report`, {
    reason
  });
}

  /**
   * Fetches all reports for moderation (admin/moderator only).
   * HTTP: GET {apiUrl}/admin/reports
   * @returns Observable emitting the paginated ReportsResponse.
   */
  getAll(): Observable<ReportsResponse> {
    return this.http.get<ReportsResponse>(this.ADMIN_API);
  }

  /**
   * Fetches a single report's detail (admin/moderator only).
   * HTTP: GET {apiUrl}/admin/reports/{id}
   * @param id Report identifier.
   * @returns Observable emitting the ReportApi detail.
   */
  getById(id: number): Observable<ReportApi> {
    return this.http.get<ReportApi>(`${this.ADMIN_API}/${id}`);
  }

  /**
   * Approves a report, typically resulting in moderation action against
   * the reported product (admin/moderator only).
   * HTTP: PATCH {apiUrl}/admin/reports/{productId}/approve
   * @param productId Identifier of the reported product.
   * @returns Observable that completes when the approval succeeds.
   */
  approve(productId: number): Observable<void> {
    return this.http.patch<void>(`${this.ADMIN_API}/${productId}/approve`, {});
  }

  /**
   * Withdraws/dismisses a report, leaving the product unaffected
   * (admin/moderator only).
   * HTTP: PATCH {apiUrl}/admin/reports/{productId}/withdraw
   * @param productId Identifier of the reported product.
   * @returns Observable that completes when the withdrawal succeeds.
   */
  withdraw(productId: number): Observable<void> {
    return this.http.patch<void>(`${this.ADMIN_API}/${productId}/withdraw`, {});
  }
}
