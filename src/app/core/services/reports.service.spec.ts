import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportApi, ReportsService } from './reports.service';
import { environment } from '../../../environments/environment';
import { ReportStatus } from '../../shared/enums/report-status.enum';

describe('ReportsService', () => {
  let service: ReportsService;
  let httpMock: HttpTestingController;
  const ADMIN_API = `${environment.apiUrl}/admin/reports`;

  const reportApi: ReportApi = {
    id_reports: 1,
    reason: 'Producto duplicado',
    status: ReportStatus.Pending,
    report_date: '2026-01-01',
    resolution_date: null,
    fk_items_id: 1,
    fk_user_reported: 2,
    fk_user_reports_received: 3,
    fk_moderator_id: 4,
    item_title: 'Coche de juguete',
    item_description: null,
    item_conservation_status: 'published',
    reported_username: 'seller1',
    reporter_username: 'buyer1',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReportsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('create hace POST a /products/:id/report con el motivo', () => {
    service.create(1, 'Motivo').subscribe(res => expect(res).toEqual(reportApi));
    const req = httpMock.expectOne(`${environment.apiUrl}/products/1/report`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reason: 'Motivo' });
    req.flush(reportApi);
  });

  it('getAll hace GET a /admin/reports', () => {
    const response = { reports: [reportApi], total: 1, page: 1, limit: 12 };
    service.getAll().subscribe(res => expect(res).toEqual(response));
    const req = httpMock.expectOne(ADMIN_API);
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });

  it('getById hace GET a /admin/reports/:id', () => {
    service.getById(1).subscribe(res => expect(res).toEqual(reportApi));
    const req = httpMock.expectOne(`${ADMIN_API}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(reportApi);
  });

  it('approve hace PATCH a /admin/reports/:productId/approve', () => {
    service.approve(1).subscribe(res => expect(res).toBeNull());
    const req = httpMock.expectOne(`${ADMIN_API}/1/approve`);
    expect(req.request.method).toBe('PATCH');
    req.flush(null);
  });

  it('withdraw hace PATCH a /admin/reports/:productId/withdraw', () => {
    service.withdraw(1).subscribe(res => expect(res).toBeNull());
    const req = httpMock.expectOne(`${ADMIN_API}/1/withdraw`);
    expect(req.request.method).toBe('PATCH');
    req.flush(null);
  });
});
