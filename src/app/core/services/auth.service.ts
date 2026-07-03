import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../../shared/interfaces/user.interface';

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = `${environment.apiUrl}/auth`;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly _currentUser = signal<User | null>(null);
  readonly currentUser = this._currentUser.asReadonly();

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

  forgotPassword(body: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(`${this.API}/forgot-password`, body);
  }

  logout(): void {
    // Mejor esfuerzo: le pedimos al backend que borre la cookie httpOnly de
    // sesión. No bloqueamos el logout local por esto (si falla o tarda, el
    // usuario igual sale de la app al instante, como hacía antes).
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

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem('token') : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.role === role;
  }
  
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
