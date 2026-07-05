import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { LocationsService } from '../../../core/services/locations.service';
import { ToastComponent } from "../../../shared/components/toast/toast";
import { ModalConfirmComponent } from "../../../shared/components/modal-confirm/modal-confirm";
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, ToastComponent, ModalConfirmComponent],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private locationsService = inject(LocationsService);
  public router = inject(Router);

  private destroy$ = new Subject<void>();

  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  showSuccessModal = false;

  provincias: string[] = [];
  ciudadesDisponibles: string[] = [];
  codigosPostalesDisponibles: string[] = [];
  ubicacionValidada = false;
  ubicacionError = '';

  toastVisible = false;
  toastType: 'success' | 'error' | 'warning' | 'info' = 'success';
  toastTitle = '';
  toastMessage = '';

  private minLength8(control: FormControl): ValidationErrors | null {
    return control.value && control.value.length >= 8 ? null : { minLength8: true };
  }

  private hasUppercase(control: FormControl): ValidationErrors | null {
    return /[A-Z]/.test(control.value) ? null : { uppercase: true };
  }

  private hasSpecialChar(control: FormControl): ValidationErrors | null {
    return /[!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]/.test(control.value) ? null : { special: true };
  }

  private minAge18(control: FormControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }

    const birthDate = new Date(control.value);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= 18 ? null : { minAge18: true };
  }

  private passwordsMatch(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  form = new FormGroup({
    firstName: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]),
    lastName: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]),
    username: new FormControl('', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_.]+$/)]),
    email: new FormControl('', [Validators.required, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)]),
    password: new FormControl('', [
      Validators.required,
      this.minLength8.bind(this),
      this.hasUppercase.bind(this),
      this.hasSpecialChar.bind(this)
    ]),
    confirmPassword: new FormControl('', [Validators.required]),
    phone: new FormControl('', [Validators.pattern(/^\d{9}$/)]),
    birthdate: new FormControl('', [Validators.required, this.minAge18.bind(this)]),
    province: new FormControl('', [Validators.required]),
    city: new FormControl('', [Validators.required]),
    postalCode: new FormControl('', [Validators.required, Validators.pattern(/^\d{5}$/)]),
  }, { validators: this.passwordsMatch.bind(this) });

  async ngOnInit(): Promise<void> {
    this.provincias = await this.locationsService.getProvincias();

    this.form.get('province')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (provincia) => {
        if (provincia) {
          this.ciudadesDisponibles = await this.locationsService.getCiudadesByProvincia(provincia);
          this.form.patchValue({ city: '', postalCode: '' });
          this.ubicacionError = '';
        } else {
          this.ciudadesDisponibles = [];
          this.codigosPostalesDisponibles = [];
          this.form.patchValue({ city: '', postalCode: '' });
          this.ubicacionError = '';
        }
      });

    this.form.get('city')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (ciudad) => {
        const provincia = this.form.get('province')?.value;

        if (ciudad && provincia) {
          this.codigosPostalesDisponibles = await this.locationsService.getCodigosPostalesByCity(provincia, ciudad);
          this.form.patchValue({ postalCode: '' });
          this.ubicacionError = '';
        } else {
          this.codigosPostalesDisponibles = [];
          this.form.patchValue({ postalCode: '' });
          this.ubicacionError = '';
        }
      });

    this.form.get('postalCode')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (codigo) => {
        if (codigo && codigo.length === 5) {
          const ubicacion = await this.locationsService.findUbicacionByCodigoPostal(codigo);
          if (ubicacion) {
            this.form.patchValue({ province: ubicacion.provincia, city: ubicacion.ciudad }, { emitEvent: false });
            this.ciudadesDisponibles = await this.locationsService.getCiudadesByProvincia(ubicacion.provincia);
            this.codigosPostalesDisponibles = await this.locationsService.getCodigosPostalesByCity(ubicacion.provincia, ubicacion.ciudad);
            this.ubicacionValidada = true;
            this.ubicacionError = '';
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  showToast(type: 'success' | 'error', title: string, message: string): void {
    this.toastType = type;
    this.toastTitle = title;
    this.toastMessage = message;
    this.toastVisible = true;
    
    setTimeout(() => {
      this.toastVisible = false;
    }, 4000);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  checkControl(control: string, error: string): boolean {
    const c = this.form.get(control);
    return !!(c && c.touched && c.hasError(error));
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const provincia = this.form.get('province')?.value || '';
    const ciudad = this.form.get('city')?.value || '';
    const codigoPostal = this.form.get('postalCode')?.value || '';

    if (!provincia || !ciudad || !codigoPostal) {
      this.ubicacionError = 'Completa todos los campos de ubicación';
      return;
    }

    const validacion = await this.locationsService.validarUbicacion(provincia, ciudad, codigoPostal);
    if (!validacion.valido) {
      this.ubicacionError = validacion.error || 'Ubicación no válida';
      return;
    }

    this.isLoading = true;
    this.form.disable();

    const rawValue = this.form.getRawValue();
    const newUser = {
      username: rawValue.username || '',
      email: rawValue.email || '',
      password: rawValue.password || '',
      first_name: rawValue.firstName || '',
      last_name: rawValue.lastName || '',
      user_birthday: rawValue.birthdate || '',
      user_city: rawValue.city || '',
      user_province: rawValue.province || '',
      user_zipcode: rawValue.postalCode || '',
      phone_number: rawValue.phone || null,
    };

    this.authService.register(newUser).subscribe({
      next: () => {
        this.isLoading = false;
        this.form.enable();
        this.showSuccessModal = true;

        setTimeout(() => {
          this.router.navigate(['/catalog']);
        }, 2000);
      },
      error: (err: HttpErrorResponse) => {
          this.isLoading = false;
          this.form.enable({ emitEvent: false });
          
          let errorMsg = 'Error al registrar usuario. Intenta de nuevo.';
          if (err.status === 409) {
            errorMsg = err.error?.error || 'El email o usuario ya están registrados.';
          } else if (err.status === 422) {
            errorMsg = 'Datos inválidos. Verifica todos los campos';
          }
          this.showToast('error', 'Error de registro', errorMsg);
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}