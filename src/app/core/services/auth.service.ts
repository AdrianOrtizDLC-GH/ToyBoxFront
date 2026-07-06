import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../../shared/interfaces/user.interface';

// Payload for the "forgot password" request: the email address to send a reset link/code to.
export interface ForgotPasswordRequest {
  email: string;
}

// API response for a "forgot password" request.
export interface ForgotPasswordResponse {
  message: string;
  email: string;
}

/**
 * Service handling authentication and session state: login, registration,
 * password recovery, logout, and token/current-user storage.
 * Session state is kept both in an in-memory signal (`currentUser`) and
 * persisted to localStorage (`token`, `user`) so it survives page reloads
 * on the browser. Used by auth.guard.ts, role.guard.ts, auth.interceptor.ts
 * and error.interceptor.ts to check/react to the session state.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  // Base URL for all auth endpoints.
  private readonly API = `${environment.apiUrl}/auth`;
  // True only when running in the browser (false during SSR), since
  // localStorage is unavailable on the server.
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  // Internal writable signal holding the currently logged-in user (or null).
  private readonly _currentUser = signal<User | null>(null);
  // Public read-only view of the current user signal.
  readonly currentUser = this._currentUser.asReadonly();

  /**
   * On construction, attempts to restore a previously persisted user
   * from localStorage (browser only) so the session survives reloads.
   * If the stored value is corrupted JSON, it is discarded.
   */
  constructor(private http: HttpClient, private router: Router) {
    const saved = this.isBrowser ? localStorage.getItem('user') : null;

    if (saved) {
      try {
        this._currentUser.set(JSON.parse(saved));
      } catch {
        localStorage.removeItem('user');
      }
    }
  }

  /**
   * Logs a user in.
   * HTTP: POST {apiUrl}/auth/login
   * @param body Login credentials (email/password).
   * @returns Observable emitting the AuthResponse (token + user). On success,
   * persists the token/user to localStorage (browser only) and updates the
   * current-user signal.
   */
  login(body: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/login`, body).pipe(
      tap(res => {
        if (this.isBrowser) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
        }
        this._currentUser.set(res.user);
      })
    );
  }

  /**
   * Registers a new user account.
   * HTTP: POST {apiUrl}/auth/register
   * @param body Registration data for the new account.
   * @returns Observable emitting the AuthResponse (token + user). On success,
   * persists the token/user to localStorage (browser only) and updates the
   * current-user signal, effectively logging the new user in.
   */
  register(body: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/register`, body).pipe(
      tap(res => {
        if (this.isBrowser) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
        }
        this._currentUser.set(res.user);
      })
    );
  }

  /**
   * Requests a password reset for the given email.
   * HTTP: POST {apiUrl}/auth/forgot-password
   * @param body The email address to send the reset instructions to.
   * @returns Observable emitting a confirmation message/email.
   */
  forgotPassword(body: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(`${this.API}/forgot-password`, body);
  }

  /**
   * Logs the current user out.
   * HTTP: POST {apiUrl}/auth/logout (best-effort, browser only)
   * Asks the backend to clear the httpOnly session cookie, but does not
   * block the local logout on this call: even if it fails or is slow, the
   * user is signed out of the app immediately, as before. Also clears the
   * locally stored token/user, resets the current-user signal to null, and
   * redirects to the login page.
   */
  logout(): void {
    if (this.isBrowser) {
      this.http.post(`${this.API}/logout`, {}, { withCredentials: true }).subscribe({ error: () => {} });
    }

    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this._currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  /**
   * Reads the current auth token from localStorage.
   * @returns The stored JWT token, or null if not present or running on the server.
   */
  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem('token') : null;
  }

  /**
   * Checks whether a user is currently authenticated.
   * @returns True if a token is present in storage.
   */
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  /**
   * Checks whether the current user has a given role.
   * @param role The role name to check against the current user.
   * @returns True if the current user exists and has the given role.
   */
  hasRole(role: string): boolean {
    return this.currentUser()?.role === role;
  }

  /**
   * Merges partial updates into the current user (e.g. after profile edits)
   * without a fresh login/register call, and persists the merged result
   * to localStorage (browser only).
   * @param updatedUser Partial fields to merge into the current user object.
   */
  updateCurrentUser(updatedUser: Partial<User>): void {
    const currentValue = this.currentUser();
    if (currentValue) {
      const merged = { ...currentValue, ...updatedUser };
      this._currentUser.set(merged);
      if (this.isBrowser) {
        localStorage.setItem('user', JSON.stringify(merged));
      }
    }
  }
}
