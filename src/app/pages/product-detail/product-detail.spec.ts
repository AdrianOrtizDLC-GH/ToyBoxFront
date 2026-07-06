import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ProductDetailComponent } from './product-detail';
import { ProductsService } from '../../core/services/products.service';
import { ReportsService } from '../../core/services/reports.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { ChatService } from '../../core/services/chat.service';
import { ReviewsService } from '../../core/services/reviews.service';
import { AuthService } from '../../core/services/auth.service';

describe('ProductDetailComponent', () => {
  let component: ProductDetailComponent;
  let fixture: ComponentFixture<ProductDetailComponent>;
  let productsServiceMock: { getById: ReturnType<typeof vi.fn>; getAll: ReturnType<typeof vi.fn> };
  let reportsServiceMock: { create: ReturnType<typeof vi.fn> };
  let favoritesServiceMock: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  let chatServiceMock: { startChat: ReturnType<typeof vi.fn> };
  let reviewsServiceMock: { getBySeller: ReturnType<typeof vi.fn> };
  let authServiceMock: { isLoggedIn: ReturnType<typeof vi.fn> };
  let router: Router;

  const rawProduct = {
    id_items: 10,
    title: 'Coche de juguete',
    description: 'Un coche',
    price: '25.50',
    location: 'Madrid',
    product_condition: 'good',
    item_status: 'available',
    main_photo: 'foto.jpg',
    category_name: 'Vehículos',
    fk_seller_id: 5,
    username: 'seller1',
    first_name: 'Ana',
    last_name: 'Vendedora',
    photos: [{ photo_url: 'foto.jpg' }],
    fk_categories_id: 2,
  };

  function configureComponent(routeParams: Record<string, any> = { id: '10' }) {
    return TestBed.configureTestingModule({
      imports: [ProductDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ProductsService, useValue: productsServiceMock },
        { provide: ReportsService, useValue: reportsServiceMock },
        { provide: FavoritesService, useValue: favoritesServiceMock },
        { provide: ChatService, useValue: chatServiceMock },
        { provide: ReviewsService, useValue: reviewsServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        {
          provide: ActivatedRoute,
          useValue: { params: of(routeParams) },
        },
      ],
    }).compileComponents();
  }

  beforeEach(async () => {
    productsServiceMock = {
      getById: vi.fn().mockReturnValue(of(rawProduct)),
      getAll: vi.fn().mockReturnValue(of({ items: [], total: 0, page: 1, limit: 12, totalPages: 0 })),
    };
    reportsServiceMock = { create: vi.fn().mockReturnValue(of({})) };
    favoritesServiceMock = { add: vi.fn().mockReturnValue(of({})), remove: vi.fn().mockReturnValue(of({})) };
    chatServiceMock = { startChat: vi.fn() };
    reviewsServiceMock = { getBySeller: vi.fn().mockReturnValue(of([])) };
    authServiceMock = { isLoggedIn: vi.fn().mockReturnValue(true) };

    await configureComponent();

    fixture = TestBed.createComponent(ProductDetailComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carga el producto a partir del id de la ruta y mapea sus datos', () => {
    fixture.detectChanges();

    expect(productsServiceMock.getById).toHaveBeenCalledWith(10);
    expect(component.product.title).toBe('Coche de juguete');
    expect(component.product.price).toBe(25.5);
    expect(component.product.seller.id_users).toBe(5);
    expect(component.isLoading).toBe(false);
  });

  it('muestra error "Producto no encontrado" en un 404', () => {
    productsServiceMock.getById.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 }))
    );

    fixture.detectChanges();

    expect(component.error).toBe('Producto no encontrado.');
    expect(component.isLoading).toBe(false);
  });

  describe('onToggleFavorite (botón condicional según login)', () => {
    it('exige login para añadir a favoritos', () => {
      fixture.detectChanges();
      authServiceMock.isLoggedIn.mockReturnValue(false);

      component.onToggleFavorite();

      expect(component.favoriteError).toBe('Debes iniciar sesión para añadir favoritos.');
      expect(favoritesServiceMock.add).not.toHaveBeenCalled();
    });

    it('añade a favoritos si el usuario está logueado y no es favorito', () => {
      fixture.detectChanges();
      authServiceMock.isLoggedIn.mockReturnValue(true);

      component.onToggleFavorite();

      expect(favoritesServiceMock.add).toHaveBeenCalledWith(10);
      expect(component.isFavorite).toBe(true);
    });
  });

  describe('contactSeller (botón condicional según login)', () => {
    it('exige login para contactar con el vendedor', () => {
      fixture.detectChanges();
      authServiceMock.isLoggedIn.mockReturnValue(false);

      component.contactSeller();

      expect(component.chatError).toBe('Debes iniciar sesión para contactar con el vendedor.');
      expect(chatServiceMock.startChat).not.toHaveBeenCalled();
    });

    it('inicia el chat y navega si el usuario está logueado', () => {
      fixture.detectChanges();
      authServiceMock.isLoggedIn.mockReturnValue(true);
      chatServiceMock.startChat.mockReturnValue(of({ id_conversations: 99 }));

      component.contactSeller();

      expect(chatServiceMock.startChat).toHaveBeenCalledWith(10);
      expect(router.navigate).toHaveBeenCalledWith(
        ['/chat', 99],
        expect.objectContaining({ queryParams: expect.any(Object) })
      );
    });
  });

  describe('submitReport', () => {
    it('exige login para reportar', () => {
      fixture.detectChanges();
      authServiceMock.isLoggedIn.mockReturnValue(false);

      component.submitReport();

      expect(component.reportError).toBe('Debes iniciar sesión para reportar un producto.');
      expect(reportsServiceMock.create).not.toHaveBeenCalled();
    });

    it('exige seleccionar un motivo', () => {
      fixture.detectChanges();
      authServiceMock.isLoggedIn.mockReturnValue(true);
      component.selectedReportReason = '';

      component.submitReport();

      expect(component.reportError).toBe('Selecciona un motivo para enviar el reporte.');
    });

    it('envía el reporte con el motivo seleccionado', () => {
      fixture.detectChanges();
      authServiceMock.isLoggedIn.mockReturnValue(true);
      component.selectedReportReason = 'Producto duplicado';

      component.submitReport();

      expect(reportsServiceMock.create).toHaveBeenCalledWith(10, 'Producto duplicado');
    });
  });

  it('goToSellerProfile navega al perfil del vendedor', () => {
    fixture.detectChanges();

    component.goToSellerProfile();

    expect(router.navigate).toHaveBeenCalledWith(['/user/profile', 5]);
  });
});
