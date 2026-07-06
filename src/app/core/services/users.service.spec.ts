import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersService } from './users.service';
import { environment } from '../../../environments/environment';
import { User } from '../../shared/interfaces/user.interface';
import { UserRole } from '../../shared/enums/user-role.enum';
import { UserStatus } from '../../shared/enums/user-status.enum';

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;
  const API = `${environment.apiUrl}/users`;
  const ADMIN_API = `${environment.apiUrl}/admin/users`;

  const user: User = {
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
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getById hace GET a /users/:id', () => {
    service.getById(1).subscribe(res => expect(res).toEqual(user));
    const req = httpMock.expectOne(`${API}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(user);
  });

  it('getMe hace GET a /users/me', () => {
    service.getMe().subscribe(res => expect(res).toEqual(user));
    const req = httpMock.expectOne(`${API}/me`);
    expect(req.request.method).toBe('GET');
    req.flush(user);
  });

  it('updateProfile hace PUT a /users/:id con el body', () => {
    const body = { first_name: 'Nuevo' };
    service.updateProfile(1, body).subscribe(res => expect(res).toEqual(user));
    const req = httpMock.expectOne(`${API}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(user);
  });

  it('updateProfileImage hace PATCH a /users/:id/avatar', () => {
    const formData = new FormData();
    service.updateProfileImage(1, formData).subscribe(res => expect(res).toEqual(user));
    const req = httpMock.expectOne(`${API}/1/avatar`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toBe(formData);
    req.flush(user);
  });

  it('getAllUsers hace GET a /admin/users', () => {
    const response = { users: [user], total: 1, page: 1, limit: 12 };
    service.getAllUsers().subscribe(res => expect(res).toEqual(response));
    const req = httpMock.expectOne(ADMIN_API);
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });

  it('setRole hace PATCH a /admin/users/:id/role con el rol', () => {
    service.setRole(1, UserRole.Moderator).subscribe(res => expect(res).toEqual(user));
    const req = httpMock.expectOne(`${ADMIN_API}/1/role`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ role: UserRole.Moderator });
    req.flush(user);
  });

  it('setStatus hace PATCH a /admin/users/:id/active con el status', () => {
    service.setStatus(1, 'blocked').subscribe(res => expect(res).toEqual(user));
    const req = httpMock.expectOne(`${ADMIN_API}/1/active`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'blocked' });
    req.flush(user);
  });

  it('deleteAccount hace DELETE a /users/:id', () => {
    service.deleteAccount(1).subscribe(res => expect(res).toBeNull());
    const req = httpMock.expectOne(`${API}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
