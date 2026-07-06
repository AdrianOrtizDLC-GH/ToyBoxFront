import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CatalogComponent } from './catalog';
import { ProductsService } from '../../core/services/products.service';
import { CategoriesService } from '../../core/services/categories.service';
import { PaginatedItems } from '../../shared/interfaces/item.interface';

describe('CatalogComponent', () => {
  let component: CatalogComponent;
  let fixture: ComponentFixture<CatalogComponent>;
  let productsServiceMock: { getAll: ReturnType<typeof vi.fn> };
  let categoriesServiceMock: { getAll: ReturnType<typeof vi.fn> };

  const paginatedResponse: PaginatedItems = {
    items: [
      {
        id_items: 1,
        title: 'Coche de juguete',
        price: 15,
        location: 'Madrid',
        category: { id_categories: 1, name: 'Vehículos', description: null },
        conservation_status: 'published' as any,
        item_status: 'available' as any,
        publication_date: '2026-01-01',
        image: 'coche.jpg',
        badge: 'available',
      },
    ],
    total: 1,
    page: 1,
    limit: 12,
    totalPages: 1,
  };

  beforeEach(async () => {
    productsServiceMock = { getAll: vi.fn().mockReturnValue(of(paginatedResponse)) };
    categoriesServiceMock = { getAll: vi.fn().mockReturnValue(of([])) };

    await TestBed.configureTestingModule({
      imports: [CatalogComponent],
      providers: [
        provideRouter([]),
        { provide: ProductsService, useValue: productsServiceMock },
        { provide: CategoriesService, useValue: categoriesServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carga los productos en ngOnInit y actualiza la propiedad products del componente', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.products.length).toBe(1);
    expect(component.products[0].title).toBe('Coche de juguete');
  });

  it('refleja los productos cargados de forma async en el DOM (test de regresión del bug zoneless)', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Coche de juguete');
  });

  it('llama a productsService.getAll con los filtros de categoría al seleccionar una categoría', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    productsServiceMock.getAll.mockClear();
    component.onCategorySelected(1);

    expect(productsServiceMock.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ fk_categories_id: 1, categoryId: 1 })
    );
  });

  it('onSearch actualiza el searchTerm y recarga productos con el filtro de búsqueda', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    productsServiceMock.getAll.mockClear();
    component.onSearch('lego');

    expect(component.searchTerm).toBe('lego');
    expect(productsServiceMock.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'lego' })
    );
  });
});
