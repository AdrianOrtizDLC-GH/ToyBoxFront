import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../shared/interfaces/user.interface';

// Paginated response for the admin users listing.
export interface AdminUsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Service handling user profile data and admin user management: fetching
 * a user's public profile, the current user's own profile, updating
 * profile data/avatar, deleting an account, and admin-only operations
 * to list all users, change roles, and activate/block accounts.
 */
@Injectable({ providedIn: 'root' })
export class UsersService {
  // Base URL for user endpoints.
  private readonly API = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  /**
   * Fetches a user's public profile by id.
   * HTTP: GET {apiUrl}/users/{id}
   * @param id User identifier.
   * @returns Observable emitting the User.
   */
  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.API}/${id}`);
  }

  /**
   * Fetches the currently authenticated user's own profile.
   * HTTP: GET {apiUrl}/users/me
   * @returns Observable emitting the current User.
   */
  getMe(): Observable<User> {
    return this.http.get<User>(`${this.API}/me`);
  }

  /**
   * Updates a user's profile data.
   * HTTP: PUT {apiUrl}/users/{id}
   * @param id User identifier.
   * @param body Partial user fields to update.
   * @returns Observable emitting the updated User.
   */
  updateProfile(id: number, body: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.API}/${id}`, body);
  }

  /**
   * Uploads/replaces a user's profile avatar image.
   * HTTP: PATCH {apiUrl}/users/{id}/avatar
   * @param id User identifier.
   * @param file FormData containing the avatar image file.
   * @returns Observable emitting the updated User.
   */
  updateProfileImage(id: number, file: FormData): Observable<User> {
    return this.http.patch<User>(`${this.API}/${id}/avatar`, file);
  }

  /**
   * Fetches all users for administration (admin only).
   * HTTP: GET {apiUrl}/admin/users
   * @returns Observable emitting the paginated AdminUsersResponse.
   */
  // Admin only
  getAllUsers(): Observable<AdminUsersResponse> {
    return this.http.get<AdminUsersResponse>(`${environment.apiUrl}/admin/users`);
  }

  /**
   * Changes a user's role (admin only).
   * HTTP: PATCH {apiUrl}/admin/users/{id}/role
   * @param id User identifier.
   * @param role New role to assign (e.g. 'user', 'moderator', 'administrator').
   * @returns Observable emitting the updated User.
   */
  setRole(id: number, role: string): Observable<User> {
    return this.http.patch<User>(`${environment.apiUrl}/admin/users/${id}/role`, { role });
  }

  /**
   * Activates or blocks a user account (admin only).
   * HTTP: PATCH {apiUrl}/admin/users/{id}/active
   * @param id User identifier.
   * @param status New status: 'active' or 'blocked'.
   * @returns Observable emitting the updated User.
   */
  setStatus(id: number, status: 'active' | 'blocked'): Observable<User> {
    return this.http.patch<User>(`${environment.apiUrl}/admin/users/${id}/active`, { status });
  }

  /**
   * Deletes a user's account.
   * HTTP: DELETE {apiUrl}/users/{id}
   * @param id User identifier.
   * @returns Observable that completes when the deletion succeeds.
   */
  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}
