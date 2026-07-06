import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { UserRole } from '../../shared/enums/user-role.enum';
import { UserStatus } from '../../shared/enums/user-status.enum';
import { User } from '../../shared/interfaces/user.interface';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerMock: { navigate: ReturnType<typeof vi.fn> };

  const mockUser: User = {
    id_users: 1,
    username: 'toybox_user',
    email: 'user@toybox.com',
    profile_picture: null,
    role: UserRole.User,
    status: UserStatus.Active,
    registration_date: '2026-01-01',
    user_birthday: '2000-01-01',
    user_city: 'Madrid',
    user_province: 'Madrid',
    user_zipcode: '28001',
    first_name: 'Toy',
    last_name: 'Box',
    phone_number: null,
  };

  beforeEach(() => {
    localStorage.clear();
    routerMock = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerMock },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('se crea sin usuario logueado si localStorage está vacío', () => {
    expect(service.currentUser()).toBeNull();
  });

  describe('login', () => {
    it('hace POST a /auth/login y guarda token/user en localStorage', () => {
      service.login({ email: mockUser.email, password: 'Password1!' }).subscribe(res => {
        expect(res.user).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: mockUser.email, password: 'Password1!' });

      req.flush({ token: 'jwt-token', user: mockUser });

      expect(localStorage.getItem('token')).toBe('jwt-token');
      expect(JSON.parse(localStorage.getItem('user') ?? 'null')).toEqual(mockUser);
      expect(service.currentUser()).toEqual(mockUser);
    });
  });

  describe('register', () => {
    it('hace POST a /auth/register y guarda token/user en localStorage', () => {
      const body = {
        username: mockUser.username,
        email: mockUser.email,
        password: 'Password1!',
        first_name: mockUser.first_name,
        last_name: mockUser.last_name,
        user_birthday: mockUser.user_birthday,
        user_city: mockUser.user_city,
        user_province: mockUser.user_province,
        user_zipcode: mockUser.user_zipcode,
      };

      service.register(body).subscribe(res => {
        expect(res.user).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);

      req.flush({ token: 'jwt-token-2', user: mockUser });

      expect(localStorage.getItem('token')).toBe('jwt-token-2');
      expect(service.currentUser()).toEqual(mockUser);
    });
  });

  describe('forgotPassword', () => {
    it('hace POST a /auth/forgot-password', () => {
      service.forgotPassword({ email: mockUser.email }).subscribe(res => {
        expect(res.message).toBe('ok');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/forgot-password`);
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'ok', email: mockUser.email });
    });
  });

  describe('logout', () => {
    it('limpia localStorage, pone currentUser a null y navega a /auth/login', () => {
      localStorage.setItem('token', 'jwt-token');
      localStorage.setItem('user', JSON.stringify(mockUser));

      service.logout();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      expect(req.request.method).toBe('POST');
      req.flush({});

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('getToken / isLoggedIn / hasRole', () => {
    it('getToken devuelve null si no hay token guardado', () => {
      expect(service.getToken()).toBeNull();
      expect(service.isLoggedIn()).toBe(false);
    });

    it('getToken devuelve el token guardado e isLoggedIn es true', () => {
      localStorage.setItem('token', 'jwt-token');
      expect(service.getToken()).toBe('jwt-token');
      expect(service.isLoggedIn()).toBe(true);
    });

    it('hasRole compara con el rol del currentUser', () => {
      service.login({ email: mockUser.email, password: 'x' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({ token: 't', user: mockUser });

      expect(service.hasRole(UserRole.User)).toBe(true);
      expect(service.hasRole(UserRole.Administrator)).toBe(false);
    });
  });

  describe('updateCurrentUser', () => {
    it('hace merge con el usuario actual y persiste en localStorage', () => {
      service.login({ email: mockUser.email, password: 'x' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({ token: 't', user: mockUser });

      service.updateCurrentUser({ first_name: 'Nuevo' });

      expect(service.currentUser()?.first_name).toBe('Nuevo');
      expect(service.currentUser()?.username).toBe(mockUser.username);

      const stored = JSON.parse(localStorage.getItem('user') ?? 'null');
      expect(stored.first_name).toBe('Nuevo');
    });

    it('no hace nada si no hay usuario logueado', () => {
      service.updateCurrentUser({ first_name: 'Nuevo' });
      expect(service.currentUser()).toBeNull();
    });
  });
});
