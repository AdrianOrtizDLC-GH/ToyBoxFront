import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { ReviewsService } from '../../../core/services/reviews.service';
import { LocationsService } from '../../../core/services/locations.service';
import { ProductsService } from '../../../core/services/products.service';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/breadcrumb/breadcrumb';
import { StarRatingComponent } from '../../../shared/components/star-rating/star-rating';
import { MapStaticComponent } from '../../../shared/components/map-static/map-static';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card';
import { ModalConfirmComponent } from '../../../shared/components/modal-confirm/modal-confirm';
import { ToastComponent } from '../../../shared/components/toast/toast';
import { User } from '../../../shared/interfaces/user.interface';
import { Review } from '../../../shared/interfaces/review.interface';
import { ItemCard } from '../../../shared/interfaces/item.interface';
import { UserRole } from '../../../shared/enums/user-role.enum';
import { UserAvatarComponent } from '../../../shared/components/user-avatar/user-avatar';

interface SellerProductCard {
  id: number;
  title: string;
  category: string;
  price: number;
  location: string;
  status: string;
  image: string;
  badge: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, BreadcrumbComponent, StarRatingComponent, MapStaticComponent, UserAvatarComponent, ProductCardComponent,
    ModalConfirmComponent, ToastComponent,],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  user: User | null = null;
  reviews: Review[] = [];
  isCurrentUser = false;
  isAdmin = false;
  isModerator = false;
  isLoading = true;
  errorMessage: string | null = null;

  showAvatarModal = false;
  showMapModal = false;
  showDeleteModal = false;
  showLogoutModal = false;

  currentUserId: number | null = null;

  userLatitude: number | null = null;
  userLongitude: number | null = null;

  sellerProducts: SellerProductCard[] = [];

  toastVisible = false;
  toastType: 'success' | 'error' | 'warning' | 'info' = 'success';
  toastTitle = '';
  toastMessage = '';

  private destroy$ = new Subject<void>();

  breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', route: '/', icon: 'home' },
    { label: 'Perfil', route: '/user/profile', icon: 'person' }
  ];

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private reviewsService: ReviewsService,
    private locationsService: LocationsService,
    private productsService: ProductsService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.currentUser();
    this.currentUserId = currentUser?.id_users ?? null;
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const userId = params['id'];

        if (userId) {
          this.loadPublicProfile(parseInt(userId));
        } else if (this.authService.isLoggedIn()) {
          this.loadPrivateProfile();
        } else {
          this.loadPublicProfile(1);
        }
      });
  }

  loadPublicProfile(userId: number): void {
    this.isLoading = true;
    this.isCurrentUser = false;
    this.errorMessage = null;

    this.usersService.getById(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (user: User) => {
          this.user = user;
          this.loadReviews(userId);
          this.loadSellerProducts(userId);
          this.updateBreadcrumb();
          this.cdr.markForCheck();
          await this.loadCoordinates();
        },
        error: (error: any) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error al cargar el perfil del usuario.';
          this.cdr.markForCheck();
        }
      });
  }

  loadPrivateProfile(): void {
    this.isLoading = true;
    this.isCurrentUser = true;
    this.errorMessage = null;

    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.isLoading = false;
      this.errorMessage = 'No hay usuario autenticado.';
      return;
    }

    this.usersService.getMe()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (user: User) => {
          this.user = user;
          this.isAdmin = user.role === UserRole.Administrator;
          this.isModerator = user.role === UserRole.Moderator || this.isAdmin;
          this.loadReviews(user.id_users);
          this.updateBreadcrumb();
          this.cdr.markForCheck();
          await this.loadCoordinates();
        },
        error: (error: any) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error al cargar tu perfil.';
          this.cdr.markForCheck();
        }
      });
  }

  loadReviews(userId: number): void {
    this.reviewsService.getBySeller(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reviews: Review[]) => {
          this.reviews = reviews;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadSellerProducts(userId: number): void {
    this.productsService.getAll({ sellerId: userId, limit: 4 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.sellerProducts = res.items.map(this.toSellerCard);
          this.cdr.markForCheck();
        },
        error: () => {
          this.sellerProducts = [];
          this.cdr.markForCheck();
        }
      });
  }

  private toSellerCard(item: ItemCard): SellerProductCard {
    return {
      id: item.id_items,
      title: item.title,
      category: item.category?.name ?? 'Sin categoría',
      price: item.price,
      location: item.location,
      status: 'Disponible',
      image: item.image || '/assets/images/Iconos%20categorias/icono_educativo.svg',
      badge: 'Disponible',
    };
  }

  async loadCoordinates(): Promise<void> {
    if (!this.user || !this.user.user_city || !this.user.user_province) return;

    try {
      const coordinates = await this.locationsService.getCoordinates(
        this.user.user_province,
        this.user.user_city
      );
      if (coordinates) {
        this.userLatitude = coordinates.lat;
        this.userLongitude = coordinates.lng;
      }
    } catch {
    }
  }

  updateBreadcrumb(): void {
    if (this.user) {
      this.breadcrumbItems = [
        { label: 'Inicio', route: '/', icon: 'home' },
        { label: `${this.user.first_name} ${this.user.last_name}`, route: '/user/profile', icon: 'person' }
      ];
    }
  }

  getAverageRating(): number {
    if (this.reviews.length === 0) return 0;
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / this.reviews.length;
  }

  getFullName(): string {
    if (!this.user) return '';
    return `${this.user.first_name} ${this.user.last_name}`;
  }

  get birthdayValue(): string {
    if (!this.user?.user_birthday) return '';
    return String(this.user.user_birthday).substring(0, 10);
  }

  toggleAvatarModal(): void {
    this.showAvatarModal = !this.showAvatarModal;
  }

  toggleMapModal(): void {
    this.showMapModal = !this.showMapModal;
  }

  goToEditProfile(): void {
    this.router.navigate(['/user/edit-profile']);
  }

  goToCategoriesManagement(): void {
    this.router.navigate(['/admin/categories']);
  }

  goToUsersManagement(): void {
    this.router.navigate(['/admin/users']);
  }

  goToDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  goToReports(): void {
    this.router.navigate(['/moderator/reports']);
  }

  logout(): void {
    this.showLogoutModal = true;
  }

  closeLogoutModal(): void {
    this.showLogoutModal = false;
  }

  confirmLogout(): void {
    this.showLogoutModal = false;
    this.authService.logout(); 
  }

  openDeleteModal(): void {
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  confirmDeactivateAccount(): void {
    if (!this.user) return;

    this.usersService.deleteAccount(this.user.id_users)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showDeleteModal = false;
          this.showToast('success', 'Cuenta dada de baja', 'Tu cuenta ha quedado bloqueada correctamente.');
          setTimeout(() => {
            this.authService.logout(); 
          }, 1500);
        },
        error: (error) => {
          this.showDeleteModal = false;
          this.showToast('error', 'Error', error.error?.message || 'No se pudo dar de baja la cuenta.');
        }
      });
  }

  private showToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    this.toastType = type;
    this.toastTitle = title;
    this.toastMessage = message;
    this.toastVisible = true;
    setTimeout(() => { this.toastVisible = false; }, 3000);
  }

  onToastDismissed(): void {
    this.toastVisible = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}