import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationResponse, NotificationsService } from './notifications.service';
import { environment } from '../../../environments/environment';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let httpMock: HttpTestingController;
  const API = `${environment.apiUrl}/notifications`;

  const notification: NotificationResponse = {
    id_notifications: 1,
    message: 'Tienes un nuevo mensaje',
    read: false,
    created_at: '2026-01-01',
    fk_users_id: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('el signal unreadCount arranca en 0', () => {
    expect(service.unreadCount()).toBe(0);
  });

  it('getMyNotifications hace GET a /notifications', () => {
    service.getMyNotifications().subscribe(res => expect(res).toEqual([notification]));
    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('GET');
    req.flush([notification]);
  });

  it('getUnreadCount hace GET a /notifications/unread-count', () => {
    service.getUnreadCount().subscribe(res => expect(res).toEqual({ unreadCount: 3 }));
    const req = httpMock.expectOne(`${API}/unread-count`);
    expect(req.request.method).toBe('GET');
    req.flush({ unreadCount: 3 });
  });

  it('refreshUnreadCount actualiza el signal unreadCount con la respuesta', () => {
    service.refreshUnreadCount();
    const req = httpMock.expectOne(`${API}/unread-count`);
    req.flush({ unreadCount: 5 });

    expect(service.unreadCount()).toBe(5);
  });

  it('refreshUnreadCount pone el signal a 0 si la petición falla', () => {
    service.refreshUnreadCount();
    const req = httpMock.expectOne(`${API}/unread-count`);
    req.flush('error', { status: 500, statusText: 'Server Error' });

    expect(service.unreadCount()).toBe(0);
  });

  it('markAsRead hace PATCH a /notifications/:id/read', () => {
    service.markAsRead(1).subscribe(res => expect(res).toEqual({ updated: 1 }));
    const req = httpMock.expectOne(`${API}/1/read`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ updated: 1 });
  });

  it('markAllAsRead hace PATCH a /notifications/read-all', () => {
    service.markAllAsRead().subscribe(res => expect(res).toEqual({ updated: 4 }));
    const req = httpMock.expectOne(`${API}/read-all`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ updated: 4 });
  });
});
