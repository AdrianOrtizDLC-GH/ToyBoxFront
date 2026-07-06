import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CreateProductComponent } from './create-product';
import { ProductsService } from '../../../core/services/products.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { LocationsService } from '../../../core/services/locations.service';
import { UsersService } from '../../../core/services/users.service';

describe('CreateProductComponent', () => {
  let component: CreateProductComponent;
  let fixture: ComponentFixture<CreateProductComponent>;
  let productsServiceMock: { create: ReturnType<typeof vi.fn>; uploadImages: ReturnType<typeof vi.fn>; publish: ReturnType<typeof vi.fn> };
  let categoriesServiceMock: { getAll: ReturnType<typeof vi.fn> };
  let locationsServiceMock: {
    getProvincias: ReturnType<typeof vi.fn>;
    getCiudadesByProvincia: ReturnType<typeof vi.fn>;
  };
  let usersServiceMock: { getMe: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    localStorage.clear();

    productsServiceMock = {
      create: vi.fn().mockReturnValue(of({ id_items: 1 })),
      uploadImages: vi.fn().mockReturnValue(of(undefined)),
      publish: vi.fn().mockReturnValue(of({})),
    };
    categoriesServiceMock = { getAll: vi.fn().mockReturnValue(of([])) };
    locationsServiceMock = {
      getProvincias: vi.fn().mockResolvedValue([]),
      getCiudadesByProvincia: vi.fn().mockResolvedValue([]),
    };
    usersServiceMock = {
      getMe: vi.fn().mockReturnValue(of({ user_province: 'Madrid', user_city: 'Madrid' })),
    };

    await TestBed.configureTestingModule({
      imports: [CreateProductComponent],
      providers: [
        provideRouter([]),
        { provide: ProductsService, useValue: productsServiceMock },
        { provide: CategoriesService, useValue: categoriesServiceMock },
        { provide: LocationsService, useValue: locationsServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateProductComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => localStorage.clear());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('validación de título (ERS: requerido, máx 150 caracteres reales validados en 80 por el componente)', () => {
    it('exige un título no vacío', () => {
      component.formData.title = '';
      component.showValidationErrors = true;
      expect(component.getFieldError('title')).toBe('Introduce un título para el producto.');
    });

    it('exige un mínimo de 3 caracteres', () => {
      component.formData.title = 'ab';
      component.showValidationErrors = true;
      expect(component.getFieldError('title')).toContain('al menos 3 caracteres');
    });

    it('rechaza títulos de más de 80 caracteres', () => {
      component.formData.title = 'a'.repeat(81);
      component.showValidationErrors = true;
      expect(component.getFieldError('title')).toContain('no puede superar los 80 caracteres');
    });

    it('acepta un título válido', () => {
      component.formData.title = 'Coche de juguete';
      component.showValidationErrors = true;
      expect(component.getFieldError('title')).toBe('');
    });
  });

  describe('validación de precio (ERS: requerido, > 0)', () => {
    it('exige un precio', () => {
      component.formData.price = null;
      component.showValidationErrors = true;
      expect(component.getFieldError('price')).toBe('Introduce un precio.');
    });

    it('rechaza precio 0 o negativo', () => {
      component.formData.price = 0;
      component.showValidationErrors = true;
      expect(component.getFieldError('price')).toBe('Introduce un precio.');

      component.formData.price = -5;
      expect(component.getFieldError('price')).toBe('Introduce un precio válido.');
    });

    it('rechaza precios superiores a 1000', () => {
      component.formData.price = 1500;
      component.showValidationErrors = true;
      expect(component.getFieldError('price')).toContain('máximo permitido es 1000');
    });

    it('acepta un precio válido', () => {
      component.formData.price = 25;
      component.showValidationErrors = true;
      expect(component.getFieldError('price')).toBe('');
    });
  });

  describe('validación de descripción (ERS: máx 255, aquí validado en 600, mín 20)', () => {
    it('exige una descripción no vacía', () => {
      component.formData.description = '';
      component.showValidationErrors = true;
      expect(component.getFieldError('description')).toContain('Añade una descripción');
    });

    it('rechaza descripciones muy cortas', () => {
      component.formData.description = 'corta';
      component.showValidationErrors = true;
      expect(component.getFieldError('description')).toContain('al menos 20 caracteres');
    });

    it('rechaza descripciones de más de 600 caracteres', () => {
      component.formData.description = 'a'.repeat(601);
      component.showValidationErrors = true;
      expect(component.getFieldError('description')).toContain('no puede superar los 600 caracteres');
    });
  });

  describe('validación de categoría e imágenes', () => {
    it('exige seleccionar una categoría', () => {
      component.formData.fk_categories_id = null;
      component.showValidationErrors = true;
      expect(component.getFieldError('fk_categories_id')).toBe('Selecciona una categoría.');
    });

    it('exige al menos una imagen para publicar (ERS)', () => {
      component.showValidationErrors = true;
      expect(component.getFieldError('images')).toBe('Sube al menos una imagen del producto.');
    });
  });

  describe('selectCategory', () => {
    it('asigna la categoría seleccionada y marca el campo como tocado', () => {
      component.selectCategory(3);
      expect(component.formData.fk_categories_id).toBe(3);
      expect(component.getFieldError('fk_categories_id')).toBe('');
    });
  });
});
