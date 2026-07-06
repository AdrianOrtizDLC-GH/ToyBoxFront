import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../../shared/enums/user-role.enum';

describe('roleGuard', () => {
  let authServiceMock: { currentUser: ReturnType<typeof vi.fn> };
  let routerMock: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = { currentUser: vi.fn() };
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

  function routeWithRoles(roles: string[]): ActivatedRouteSnapshot {
    return { data: { roles } } as unknown as ActivatedRouteSnapshot;
  }

  it('deja pasar siempre en SSR (server), sin comprobar el rol', () => {
    configure('server');

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(routeWithRoles([UserRole.Administrator]), {} as any)
    );

    expect(result).toBe(true);
    expect(authServiceMock.currentUser).not.toHaveBeenCalled();
  });

  it('deja pasar en browser si el rol del usuario está en route.data.roles', () => {
    configure('browser');
    authServiceMock.currentUser.mockReturnValue({ role: UserRole.Moderator });

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(routeWithRoles([UserRole.Moderator, UserRole.Administrator]), {} as any)
    );

    expect(result).toBe(true);
  });

  it('redirige a / en browser si el rol del usuario no está permitido', () => {
    configure('browser');
    authServiceMock.currentUser.mockReturnValue({ role: UserRole.User });

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(routeWithRoles([UserRole.Administrator]), {} as any)
    );

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/']);
    expect(result).toBe('URL_TREE');
  });

  it('redirige a / en browser si no hay usuario logueado', () => {
    configure('browser');
    authServiceMock.currentUser.mockReturnValue(null);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(routeWithRoles([UserRole.Administrator]), {} as any)
    );

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/']);
    expect(result).toBe('URL_TREE');
  });
});
