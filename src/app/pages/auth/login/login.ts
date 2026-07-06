import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Login page component. Authenticates the user via AuthService and
 * redirects to the appropriate area (admin dashboard, moderator reports,
 * or catalog) based on the returned user role.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  // Used to guard browser-only APIs when the app is server-rendered.
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  showPassword = false;
  isLoading = false;
  loginError = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  // Reactive form with email (required + pattern) and password (required + min length) validation.
  loginForm = new FormGroup({
    email: new FormControl(
      { value: '', disabled: false },
      [
        Validators.required,
        Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      ]
    ),
    password: new FormControl(
      { value: '', disabled: false },
      [
        Validators.required,
        Validators.minLength(6)
      ]
    )
  });

  /** Toggles visibility of the password field between masked and plain text. */
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Checks whether a given form control has a specific validation error
   * and has been touched, used to conditionally show error messages.
   * @param control Name of the form control.
   * @param error Validation error key to check for.
   * @returns True if the control was touched and has the given error.
   */
  checkControl(control: string, error: string): boolean {
    const c = this.loginForm.get(control);
    return !!(c && c.touched && c.hasError(error));
  }

  /**
   * Validates the login form and authenticates the user. On success,
   * routes to the section matching the user's role; on failure, maps
   * the HTTP error status to a user-friendly message.
   */
  onSubmit(): void {
    this.loginError = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    
    this.disableForm();

    const credentials = this.loginForm.getRawValue();

    this.authService.login(credentials as any).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.enableForm();

        switch (res.user.role) {
          case 'administrator':
            this.router.navigate(['/admin/dashboard']);
            break;
          case 'moderator':
            this.router.navigate(['/moderator/reports']);
            break;
          default:
            this.router.navigate(['/catalog']); 
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.enableForm();
        const backendError = err.error?.error || '';

        if (err.status === 401) {
          this.loginError = 'Email o contraseña incorrectos';
        } else if (err.status === 403) {
          this.loginError = 'Tu cuenta ha sido bloqueada';
        } else if (err.status === 400) {
          this.loginError = backendError || 'Campos requeridos faltantes';
        } else if (err.status === 0) {
          this.loginError = 'No hay conexión con el servidor';
        } else {
          this.loginError = backendError || 'Error al iniciar sesión';
        }
      }
    });
  }

  /** Disables the form controls while the login request is in flight. */
  private disableForm(): void {
    this.loginForm.disable({ emitEvent: false });
  }

  /** Re-enables the form controls after the login request completes. */
  private enableForm(): void {
    this.loginForm.enable({ emitEvent: false });
  }

  /** Navigates to the forgot-password page. */
  goToForgotPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
  }

  /** Navigates to the registration page. */
  goToRegister(): void {
    this.router.navigate(['/auth/register']);
  }
}