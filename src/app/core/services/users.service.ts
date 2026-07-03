import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../shared/interfaces/user.interface';

export interface AdminUsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly API = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.API}/${id}`);
  }

  getMe(): Observable<User> { 
    return this.http.get<User>(`${this.API}/me`);
  }

  updateProfile(id: number, body: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.API}/${id}`, body);
  }

  updateProfileImage(id: number, file: FormData): Observable<User> {
    return this.http.patch<User>(`${this.API}/${id}/avatar`, file);
  }

  // Admin only
  getAllUsers(): Observable<AdminUsersResponse> {
    return this.http.get<AdminUsersResponse>(`${environment.apiUrl}/admin/users`);
  }

  setRole(id: number, role: string): Observable<User> {
    return this.http.patch<User>(`${environment.apiUrl}/admin/users/${id}/role`, { role });
  }

  setStatus(id: number, status: 'active' | 'blocked'): Observable<User> {
    return this.http.patch<User>(`${environment.apiUrl}/admin/users/${id}/active`, { status });
  }

  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}
