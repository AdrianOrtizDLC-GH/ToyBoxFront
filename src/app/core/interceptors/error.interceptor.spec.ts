import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';

describe('errorInterceptor', () => {
  let authServiceMock: { logout: ReturnType<typeof vi.fn> };
  let routerMock: { navigate: ReturnType<typeof vi.fn> };
  let req: HttpRequest<unknown>;

  beforeEach(() => {
    authServiceMock = { logout: vi.fn() };
    routerMock = { navigate: vi.fn() };
    req = new HttpRequest('GET', '/api/products');

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('deja pasar la respuesta si no hay error', async () => {
    const nextSpy = vi.fn().mockReturnValue(of('ok' as any)) as unknown as HttpHandlerFn;

    const value = await firstValueFrom(
      TestBed.runInInjectionContext(() => errorInterceptor(req, nextSpy))
    );

    expect(value).toBe('ok');
    expect(authServiceMock.logout).not.toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('llama a logout() cuando el error es 401', async () => {
    const error = new HttpErrorResponse({ status: 401 });
    const nextSpy = vi.fn().mockReturnValue(throwError(() => error)) as unknown as HttpHandlerFn;

    await expect(
      firstValueFrom(TestBed.runInInjectionContext(() => errorInterceptor(req, nextSpy)))
    ).rejects.toBe(error);

    expect(authServiceMock.logout).toHaveBeenCalled();
  });

  it('navega a / cuando el error es 403', async () => {
    const error = new HttpErrorResponse({ status: 403 });
    const nextSpy = vi.fn().mockReturnValue(throwError(() => error)) as unknown as HttpHandlerFn;

    await expect(
      firstValueFrom(TestBed.runInInjectionContext(() => errorInterceptor(req, nextSpy)))
    ).rejects.toBe(error);

    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });

  it('propaga otros errores sin llamar a logout ni navegar', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    const nextSpy = vi.fn().mockReturnValue(throwError(() => error)) as unknown as HttpHandlerFn;

    await expect(
      firstValueFrom(TestBed.runInInjectionContext(() => errorInterceptor(req, nextSpy)))
    ).rejects.toBe(error);

    expect(authServiceMock.logout).not.toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });
});
