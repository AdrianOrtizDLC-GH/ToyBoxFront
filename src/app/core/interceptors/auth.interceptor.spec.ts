import { TestBed } from '@angular/core/testing';
import { HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  let authServiceMock: { getToken: ReturnType<typeof vi.fn> };
  let nextSpy: HttpHandlerFn;

  beforeEach(() => {
    authServiceMock = { getToken: vi.fn() };
    nextSpy = vi.fn().mockReturnValue(of({} as any)) as unknown as HttpHandlerFn;

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    });
  });

  it('deja pasar sin modificar peticiones que no son de la API propia', () => {
    const req = new HttpRequest('GET', 'https://nominatim.openstreetmap.org/search');

    TestBed.runInInjectionContext(() => authInterceptor(req, nextSpy));

    expect(authServiceMock.getToken).not.toHaveBeenCalled();
    expect(nextSpy as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(req);
  });

  it('añade el header Authorization y withCredentials si hay token y la petición es a la API', () => {
    authServiceMock.getToken.mockReturnValue('mi-token');
    const req = new HttpRequest('GET', `${environment.apiUrl}/products`);

    TestBed.runInInjectionContext(() => authInterceptor(req, nextSpy));

    const clonedReq = (nextSpy as ReturnType<typeof vi.fn>).mock.calls[0][0] as HttpRequest<unknown>;
    expect(clonedReq.withCredentials).toBe(true);
    expect(clonedReq.headers.get('Authorization')).toBe('Bearer mi-token');
  });

  it('no añade Authorization si no hay token, pero mantiene withCredentials', () => {
    authServiceMock.getToken.mockReturnValue(null);
    const req = new HttpRequest('GET', `${environment.apiUrl}/products`);

    TestBed.runInInjectionContext(() => authInterceptor(req, nextSpy));

    const clonedReq = (nextSpy as ReturnType<typeof vi.fn>).mock.calls[0][0] as HttpRequest<unknown>;
    expect(clonedReq.withCredentials).toBe(true);
    expect(clonedReq.headers.has('Authorization')).toBe(false);
  });
});
