import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authServiceMock: { isLoggedIn: ReturnType<typeof vi.fn> };
  let routerMock: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = { isLoggedIn: vi.fn() };
    routerMock = { createUrlTree: vi.fn().mockReturnValue('URL_TREE') };
  });

  function configure(platform: 'browser' | 'server') {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
  }

  it('deja pasar siempre en SSR (server), sin comprobar sesión', () => {
    configure('server');

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, {} as any)
    );

    expect(result).toBe(true);
    expect(authServiceMock.isLoggedIn).not.toHaveBeenCalled();
  });

  it('deja pasar en browser si el usuario está logueado', () => {
    configure('browser');
    authServiceMock.isLoggedIn.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, {} as any)
    );

    expect(result).toBe(true);
  });

  it('redirige a /auth/login en browser si el usuario no está logueado', () => {
    configure('browser');
    authServiceMock.isLoggedIn.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, {} as any)
    );

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
    expect(result).toBe('URL_TREE');
  });
});
