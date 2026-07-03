import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { LocationsService } from '../../../core/services/locations.service';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb';
import { MapStaticComponent } from '../../../shared/components/map-static/map-static';
import { UserAvatarComponent } from '../../../shared/components/user-avatar/user-avatar';
import { ModalConfirmComponent } from '../../../shared/components/modal-confirm/modal-confirm';
import { User, UpdateUserProfileRequest } from '../../../shared/interfaces/user.interface';


@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [ReactiveFormsModule, BreadcrumbComponent, MapStaticComponent, UserAvatarComponent, ModalConfirmComponent],
  templateUrl: './edit-profile.html',
  styleUrls: ['./edit-profile.css']
})
export class EditProfileComponent implements OnInit, OnDestroy {
  editProfileForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  errorMessage: string | null = null;
  showPasswordField = false;
  showPassword = false;
  profilePicturePreview: string | null = null;
  selectedFile: File | null = null;

  removeProfilePicture = false;

  provinces: string[] = [];
  cities: string[] = [];
  codigosPostales: string[] = [];

  previewLatitude: number | null = null;
  previewLongitude: number | null = null;

  breadcrumbItems: any[] = [];
  showSuccessModal = false;
  private successTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private destroy$ = new Subject<void>();

  private readonly requiredMessages: Record<string, string> = {
    first_name: 'El nombre es obligatorio',
    last_name: 'El apellido es obligatorio',
    email: 'El email es obligatorio',
    user_birthday: 'La fecha de nacimiento es obligatoria',
    user_province: 'La provincia es obligatoria',
    user_city: 'La ciudad es obligatoria',
    user_zipcode: 'El código postal es obligatorio',
    password: 'La contraseña es obligatoria'
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private usersService: UsersService,
    private locationsService: LocationsService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeBreadcrumbs();
    this.initializeForm();
    this.loadLocationData();
    this.loadUserData();
  }

  private initializeBreadcrumbs(): void {
    const isLoggedIn = this.authService.isLoggedIn();
    const homeRoute = isLoggedIn ? '/catalog' : '/home';

    this.breadcrumbItems = [
      { label: 'Inicio', route: homeRoute, icon: 'home' },
      { label: 'Mi Perfil', route: '/user/profile', icon: 'person' },
      { label: 'Editar Perfil', icon: 'edit' }
    ];
  }

  get avatarDisplayName(): string {
    const fn = this.editProfileForm?.get('first_name')?.value || '';
    const ln = this.editProfileForm?.get('last_name')?.value || '';
    return `${fn} ${ln}`.trim();
  }

  async loadLocationData(): Promise<void> {
    try {
      this.provinces = await this.locationsService.getProvincias();
    } catch (error) {
      this.errorMessage = 'Error al cargar las provincias.';
    }
    this.cdr.markForCheck();
  }

  initializeForm(): void {
    this.editProfileForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone_number: ['', [Validators.pattern(/^\d{9,15}$/)]],
      user_birthday: ['', [Validators.required, this.minAgeValidator(18)]],
      user_province: ['', [Validators.required]],
      user_city: ['', [Validators.required]],
      user_zipcode: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
      password: ['', []]
    });

    this.editProfileForm.get('user_province')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (province) => {
        await this.onProvinceChange(province);
      });

    this.editProfileForm.get('user_city')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (city) => {
        await this.onCityChange(city);
      });
  }

  loadUserData(): void {
    this.isLoading = true;
    const currentUser = this.authService.currentUser();

    if (!currentUser) {
      this.isLoading = false;
      this.errorMessage = 'No hay usuario autenticado.';
      this.cdr.markForCheck();
      return;
    }

    this.usersService.getMe()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (user: User) => {
          this.editProfileForm.patchValue({
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone_number: user.phone_number,
            user_birthday: user.user_birthday ? String(user.user_birthday).substring(0, 10) : '',
            user_province: user.user_province,
            user_city: user.user_city,
            user_zipcode: user.user_zipcode
          }, { emitEvent: false });

          this.editProfileForm.markAsPristine();

          if (user.user_province) {
            try {
              this.cities = await this.locationsService.getCiudadesByProvincia(user.user_province);
            } catch {
              this.cities = [];
            }
          }

          if (user.user_province && user.user_city) {
            await this.populateLocationOnLoad(user.user_province, user.user_city);
          }

          if (user.profile_picture) {
            this.profilePicturePreview = user.profile_picture;
          }

          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error al cargar tus datos.';
          this.cdr.markForCheck();
        }
      });
  }

  private async populateLocationOnLoad(province: string, city: string): Promise<void> {
    try {
      this.codigosPostales = await this.locationsService.getCodigosPostalesByCity(province, city);
    } catch {
      this.codigosPostales = [];
    }
    try {
      const coordinates = await this.locationsService.getCoordinates(province, city);
      this.previewLatitude = coordinates ? coordinates.lat : null;
      this.previewLongitude = coordinates ? coordinates.lng : null;
    } catch {
      this.previewLatitude = null;
      this.previewLongitude = null;
    }
  }

  async onProvinceChange(province: string): Promise<void> {
    if (province) {
      try {
        this.cities = await this.locationsService.getCiudadesByProvincia(province);
        this.editProfileForm.get('user_city')?.reset();
        this.editProfileForm.get('user_zipcode')?.reset();
        this.codigosPostales = [];
        this.previewLatitude = null;
        this.previewLongitude = null;
      } catch (error) {
        this.cities = [];
      }
    } else {
      this.cities = [];
      this.codigosPostales = [];
      this.previewLatitude = null;
      this.previewLongitude = null;
    }
    this.cdr.markForCheck();
  }

  async onCityChange(city: string): Promise<void> {
    const province = this.editProfileForm.get('user_province')?.value;

    if (city && province) {
      try {
        this.codigosPostales = await this.locationsService.getCodigosPostalesByCity(province, city);
      } catch {
        this.codigosPostales = [];
      }
      this.editProfileForm.get('user_zipcode')?.reset();

      try {
        const coordinates = await this.locationsService.getCoordinates(province, city);
        if (coordinates) {
          this.previewLatitude = coordinates.lat;
          this.previewLongitude = coordinates.lng;
        } else {
          this.previewLatitude = null;
          this.previewLongitude = null;
        }
      } catch (error) {
        this.previewLatitude = null;
        this.previewLongitude = null;
      }
    } else {
      this.codigosPostales = [];
      this.previewLatitude = null;
      this.previewLongitude = null;
    }
    this.cdr.markForCheck();
  }

  minAgeValidator(minAge: number): (control: AbstractControl) => ValidationErrors | null {
    return (control: AbstractControl): ValidationErrors | null => {
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

      return age >= minAge ? null : { minAge: { requiredAge: minAge, actualAge: age } };
    };
  }

  private minLength8(control: AbstractControl): ValidationErrors | null {
    return control.value && control.value.length >= 8 ? null : { minLength8: true };
  }

  private hasUppercase(control: AbstractControl): ValidationErrors | null {
    return /[A-Z]/.test(control.value || '') ? null : { uppercase: true };
  }

  private hasSpecialChar(control: AbstractControl): ValidationErrors | null {
    return /[!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]/.test(control.value || '') ? null : { special: true };
  }

  onAvatarFileChanged(file: File): void {
    this.selectedFile = file;
    this.removeProfilePicture = false;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      this.profilePicturePreview = (e.target as FileReader).result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  onAvatarImageDeleted(): void {
    this.selectedFile = null;
    this.profilePicturePreview = null;
    this.removeProfilePicture = true;
    this.cdr.markForCheck();
  }

  get hasChanges(): boolean {
    return this.editProfileForm.dirty || this.selectedFile !== null || this.removeProfilePicture;
  }

  togglePasswordField(): void {
    this.showPasswordField = !this.showPasswordField;
    const passwordControl = this.editProfileForm.get('password');
    if (this.showPasswordField) {
      passwordControl?.setValidators([
        Validators.required,
        this.minLength8.bind(this),
        this.hasUppercase.bind(this),
        this.hasSpecialChar.bind(this)
      ]);
    } else {
      passwordControl?.clearValidators();
      passwordControl?.reset();
      this.showPassword = false;
    }
    passwordControl?.updateValueAndValidity();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSaveProfile(): void {
    if (this.editProfileForm.invalid) {
      this.markFormGroupTouched(this.editProfileForm);
      this.cdr.markForCheck();
      return;
    }

    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.errorMessage = 'No hay usuario autenticado.';
      this.cdr.markForCheck();
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    const formValue = this.editProfileForm.value;
    const updateData: UpdateUserProfileRequest = {
      first_name: formValue.first_name,
      last_name: formValue.last_name,
      email: formValue.email,
      phone_number: formValue.phone_number,
      user_birthday: formValue.user_birthday,
      user_province: formValue.user_province,
      user_city: formValue.user_city,
      user_zipcode: formValue.user_zipcode
    };

    if (formValue.password) {
      updateData.password = formValue.password;
    }

    if (this.removeProfilePicture && !this.selectedFile) {
      updateData.remove_profile_picture = true;
    }

    this.usersService.updateProfile(currentUser.id_users, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser: User) => {
          this.authService.updateCurrentUser(updatedUser);

          if (this.selectedFile) {
            const formData = new FormData();
            formData.append('avatar', this.selectedFile);
            this.usersService.updateProfileImage(currentUser.id_users, formData)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (userWithImage: User) => {
                  this.authService.updateCurrentUser(userWithImage);
                  this.isSaving = false;
                  this.showSuccessAndRedirect();
                },
                error: (error: HttpErrorResponse) => {
                  this.isSaving = false;
                  this.errorMessage = 'Tus datos se han guardado, pero la foto no se pudo subir: '
                    + (error.error?.error || error.error?.message || 'inténtalo de nuevo.');
                  this.cdr.markForCheck();
                }
              });
          } else {
            this.isSaving = false;
            this.showSuccessAndRedirect();
          }
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving = false;
          this.errorMessage = error.error?.message || 'Error al actualizar el perfil.';
          this.cdr.markForCheck();
        }
      });
  }

  private showSuccessAndRedirect(): void {
    this.showSuccessModal = true;
    this.cdr.markForCheck();
    this.successTimeoutId = setTimeout(() => {
      this.goToProfileNow();
    }, 1800);
  }

  goToProfileNow(): void {
    if (this.successTimeoutId) {
      clearTimeout(this.successTimeoutId);
      this.successTimeoutId = null;
    }
    this.showSuccessModal = false;
    this.router.navigate(['/user/profile']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getErrorMessage(fieldName: string): string | null {
    const control = this.editProfileForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return null;
    }

    if (control.errors['required']) {
      return this.requiredMessages[fieldName] || 'Este campo es obligatorio';
    }
    if (control.errors['email']) {
      return 'El email no es válido';
    }
    if (control.errors['minLength']) {
      return `Mínimo ${control.errors['minLength'].requiredLength} caracteres`;
    }
    if (control.errors['pattern']) {
      if (fieldName === 'phone_number') {
        return 'Teléfono inválido (9-15 dígitos)';
      }
      if (fieldName === 'user_zipcode') {
        return 'Código postal inválido (4-6 dígitos)';
      }
    }
    if (control.errors['minAge']) {
      return `Debes tener al menos ${control.errors['minAge'].requiredAge} años`;
    }
    if (control.errors['minLength8']) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (control.errors['uppercase']) {
      return 'La contraseña debe tener al menos una mayúscula';
    }
    if (control.errors['special']) {
      return 'La contraseña debe tener al menos un carácter especial';
    }
    return null;
  }

  ngOnDestroy(): void {
    if (this.successTimeoutId) {
      clearTimeout(this.successTimeoutId);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}