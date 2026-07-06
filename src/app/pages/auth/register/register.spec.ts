import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { RegisterComponent } from './register';
import { AuthService } from '../../../core/services/auth.service';
import { LocationsService } from '../../../core/services/locations.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authServiceMock: { register: ReturnType<typeof vi.fn> };
  let locationsServiceMock: {
    getProvincias: ReturnType<typeof vi.fn>;
    getCiudadesByProvincia: ReturnType<typeof vi.fn>;
    getCodigosPostalesByCity: ReturnType<typeof vi.fn>;
    findUbicacionByCodigoPostal: ReturnType<typeof vi.fn>;
    validarUbicacion: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  function validFormValues() {
    return {
      firstName: 'Toy',
      lastName: 'Box',
      username: 'toybox_user',
      email: 'user@toybox.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      phone: '',
      birthdate: '2000-01-01',
      province: 'Madrid',
      city: 'Madrid',
      postalCode: '28001',
    };
  }

  beforeEach(async () => {
    authServiceMock = { register: vi.fn() };
    locationsServiceMock = {
      getProvincias: vi.fn().mockResolvedValue(['Madrid']),
      getCiudadesByProvincia: vi.fn().mockResolvedValue(['Madrid']),
      getCodigosPostalesByCity: vi.fn().mockResolvedValue(['28001']),
      findUbicacionByCodigoPostal: vi.fn().mockResolvedValue(null),
      validarUbicacion: vi.fn().mockResolvedValue({ valido: true }),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: LocationsService, useValue: locationsServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('validación de contraseña (ERS: min 8, mayúscula, carácter especial)', () => {
    it('rechaza contraseñas de menos de 8 caracteres', () => {
      const password = component.form.get('password');
      password?.setValue('Abc1!');
      expect(password?.hasError('minLength8')).toBe(true);
    });

    it('rechaza contraseñas sin mayúscula', () => {
      const password = component.form.get('password');
      password?.setValue('password1!');
      expect(password?.hasError('uppercase')).toBe(true);
    });

    it('rechaza contraseñas sin carácter especial', () => {
      const password = component.form.get('password');
      password?.setValue('Password1');
      expect(password?.hasError('special')).toBe(true);
    });

    it('acepta una contraseña válida', () => {
      const password = component.form.get('password');
      password?.setValue('Password1!');
      expect(password?.valid).toBe(true);
    });
  });

  describe('validación de confirmación de contraseña', () => {
    it('marca error passwordMismatch si las contraseñas no coinciden', () => {
      component.form.get('password')?.setValue('Password1!');
      component.form.get('confirmPassword')?.setValue('Otra1!');
      expect(component.form.hasError('passwordMismatch')).toBe(true);
    });

    it('no marca error si las contraseñas coinciden', () => {
      component.form.get('password')?.setValue('Password1!');
      component.form.get('confirmPassword')?.setValue('Password1!');
      expect(component.form.hasError('passwordMismatch')).toBe(false);
    });
  });

  describe('validación de edad mínima (18 años)', () => {
    it('rechaza una fecha de nacimiento de menor de edad', () => {
      const birthdate = component.form.get('birthdate');
      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 10);
      birthdate?.setValue(lastYear.toISOString().slice(0, 10));
      expect(birthdate?.hasError('minAge18')).toBe(true);
    });

    it('acepta una fecha de nacimiento de mayor de edad', () => {
      const birthdate = component.form.get('birthdate');
      birthdate?.setValue('2000-01-01');
      expect(birthdate?.hasError('minAge18')).toBe(false);
    });
  });

  describe('validación de username/email requeridos (ERS: únicos, validados en backend)', () => {
    it('el username es requerido y solo admite [a-zA-Z0-9_.]', () => {
      const username = component.form.get('username');
      username?.setValue('usuario con espacios');
      expect(username?.hasError('pattern')).toBe(true);

      username?.setValue('toybox_user.1');
      expect(username?.valid).toBe(true);
    });

    it('el email debe tener formato válido', () => {
      const email = component.form.get('email');
      email?.setValue('no-es-email');
      expect(email?.hasError('pattern')).toBe(true);
    });
  });

  describe('onSubmit', () => {
    it('no llama a register si el formulario es inválido', async () => {
      await component.onSubmit();
      expect(authServiceMock.register).not.toHaveBeenCalled();
    });

    it('llama a AuthService.register con los datos mapeados si el formulario es válido', async () => {
      component.form.setValue(validFormValues());
      authServiceMock.register.mockReturnValue(of({ token: 't', user: {} }));

      await component.onSubmit();

      expect(authServiceMock.register).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'toybox_user',
          email: 'user@toybox.com',
          user_city: 'Madrid',
          user_province: 'Madrid',
          user_zipcode: '28001',
        })
      );
    });

    it('muestra un toast de error si el registro falla por conflicto (409)', async () => {
      component.form.setValue(validFormValues());
      authServiceMock.register.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 409, error: { error: 'Usuario ya existe' } }))
      );

      await component.onSubmit();

      expect(component.toastType).toBe('error');
      expect(component.toastMessage).toBe('Usuario ya existe');
    });

    it('no continúa si la validación de ubicación falla', async () => {
      component.form.setValue(validFormValues());
      locationsServiceMock.validarUbicacion.mockResolvedValue({ valido: false, error: 'CP inválido' });

      await component.onSubmit();

      expect(authServiceMock.register).not.toHaveBeenCalled();
      expect(component.ubicacionError).toBe('CP inválido');
    });
  });
});
