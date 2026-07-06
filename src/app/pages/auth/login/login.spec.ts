import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login';
import { AuthService } from '../../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: { login: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    authServiceMock = { login: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('validación del formulario reactivo', () => {
    it('el formulario es inválido si email y password están vacíos', () => {
      expect(component.loginForm.invalid).toBe(true);
    });

    it('el email debe cumplir el patrón de un email válido', () => {
      const email = component.loginForm.get('email');
      email?.setValue('no-es-un-email');
      expect(email?.hasError('pattern')).toBe(true);

      email?.setValue('user@toybox.com');
      expect(email?.valid).toBe(true);
    });

    it('el password requiere al menos 6 caracteres', () => {
      const password = component.loginForm.get('password');
      password?.setValue('123');
      expect(password?.hasError('minlength')).toBe(true);

      password?.setValue('123456');
      expect(password?.valid).toBe(true);
    });

    it('onSubmit no llama a AuthService.login si el formulario es inválido', () => {
      component.onSubmit();
      expect(authServiceMock.login).not.toHaveBeenCalled();
      expect(component.loginForm.touched).toBe(true);
    });
  });

  describe('onSubmit con formulario válido', () => {
    beforeEach(() => {
      component.loginForm.setValue({ email: 'user@toybox.com', password: '123456' });
    });

    it('llama a AuthService.login con las credenciales', () => {
      authServiceMock.login.mockReturnValue(of({ token: 't', user: { role: 'user' } }));

      component.onSubmit();

      expect(authServiceMock.login).toHaveBeenCalledWith({
        email: 'user@toybox.com',
        password: '123456',
      });
    });

    it('navega a /catalog para un usuario normal', () => {
      authServiceMock.login.mockReturnValue(of({ token: 't', user: { role: 'user' } }));

      component.onSubmit();

      expect(router.navigate).toHaveBeenCalledWith(['/catalog']);
    });

    it('navega a /admin/dashboard para un administrador', () => {
      authServiceMock.login.mockReturnValue(of({ token: 't', user: { role: 'administrator' } }));

      component.onSubmit();

      expect(router.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
    });

    it('navega a /moderator/reports para un moderador', () => {
      authServiceMock.login.mockReturnValue(of({ token: 't', user: { role: 'moderator' } }));

      component.onSubmit();

      expect(router.navigate).toHaveBeenCalledWith(['/moderator/reports']);
    });

    it('muestra error de credenciales incorrectas en un 401', () => {
      authServiceMock.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

      component.onSubmit();

      expect(component.loginError).toBe('Email o contraseña incorrectos');
      expect(component.isLoading).toBe(false);
    });

    it('muestra error de cuenta bloqueada en un 403', () => {
      authServiceMock.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));

      component.onSubmit();

      expect(component.loginError).toBe('Tu cuenta ha sido bloqueada');
    });

    it('muestra error de conexión cuando status es 0', () => {
      authServiceMock.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

      component.onSubmit();

      expect(component.loginError).toBe('No hay conexión con el servidor');
    });
  });
});
