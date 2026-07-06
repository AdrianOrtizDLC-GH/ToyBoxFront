import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

/**
 * Forgot-password page component. Lets the user request a password reset
 * link by email; simulates the backend call and redirects to login on
 * success. Currently uses a mocked setTimeout instead of a real API call.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPasswordComponent {
  backendError = '';
  backendSuccess = '';
  isLoading = false;

  constructor(private router: Router) {}

  // Reactive form with a single required, pattern-validated email field.
  form: FormGroup = new FormGroup({
    email: new FormControl(
      { value: '', disabled: false },
      [
        Validators.required,
        Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      ]
    )
  });

  /**
   * Checks whether a given form control has a specific validation error
   * and has been touched, used to conditionally show error messages.
   * @param control Name of the form control.
   * @param error Validation error key to check for.
   * @returns True if the control was touched and has the given error.
   */
  checkControl(control: string, error: string): boolean {
    const c = this.form.get(control);
    return !!(c && c.touched && c.hasError(error));
  }

  /**
   * Validates the form and submits the password reset request. On success,
   * shows a confirmation message, resets the form, and redirects to login
   * after a short delay.
   */
  onSubmit(): void {
    this.backendError = '';
    this.backendSuccess = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.disableForm();

    setTimeout(() => {
      this.isLoading = false;
      this.enableForm();
      
      this.backendSuccess =
        'Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña en breve.';
      this.form.reset();
      
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 3000);
    }, 1000);

  }

  /** Disables the form controls while the request is in flight. */
  private disableForm(): void {
    this.form.disable({ emitEvent: false });
  }

  /** Re-enables the form controls after the request completes. */
  private enableForm(): void {
    this.form.enable({ emitEvent: false });
  }

  /** Navigates back to the login page. */
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}