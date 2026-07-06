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

/** Simplified product card shape used to display a seller's items on their public profile. */
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

/**
 * Component that displays a user's profile page. Shows either the current
 * user's own private profile (with personal data and admin/moderator panels)
 * or another user's public profile (with their reviews and products for sale),
 * depending on whether a route `id` param is present.
 */
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
  // Whether the profile being viewed belongs to the logged-in user (enables edit/admin actions).
  isCurrentUser = false;
  isAdmin = false;
  isModerator = false;
  isLoading = true;
  errorMessage: string | null = null;

  showAvatarModal = false;
  showMapModal = false;
  showDeleteModal = false;
  showLogoutModal = false;

  // Coordinates used to render the user's location map preview.
  userLatitude: number | null = null;
  userLongitude: number | null = null;

  // Products for sale by this user, shown when viewing another user's public profile.
  sellerProducts: SellerProductCard[] = [];

  toastVisible = false;
  toastType: 'success' | 'error' | 'warning' | 'info' = 'success';
  toastTitle = '';
  toastMessage = '';

  // Emits on component destruction to unsubscribe all pending observables.
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

  /** Angular lifecycle hook. Kicks off loading of the appropriate profile (own or public). */
  ngOnInit(): void {
    this.loadUserProfile();
  }

  /**
   * Determines which profile to load based on the route's `id` param:
   * a specific user's public profile, the logged-in user's own profile,
   * or a fallback public profile if not authenticated.
   */
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

  /** Loads another user's public profile data, their reviews, and products for sale. */
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

  /** Loads the logged-in user's own profile data, role flags, and reviews. */
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

  /** Fetches the reviews received by a user in their role as seller. */
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

  /** Fetches up to 4 products currently for sale by the given user, for public profile display. */
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

  /** Maps a raw API item card into the simplified SellerProductCard shape. */
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

  /** Resolves map coordinates for the profile user's city/province, if available. */
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
      } else {
        this.userLatitude = null;
        this.userLongitude = null;
      }
    } catch (error) {
      this.userLatitude = null;
      this.userLongitude = null;
    }
    this.cdr.markForCheck();
  }

  /** Updates the breadcrumb trail to include the profile owner's full name. */
  updateBreadcrumb(): void {
    if (this.user) {
      this.breadcrumbItems = [
        { label: 'Inicio', route: '/', icon: 'home' },
        { label: `${this.user.first_name} ${this.user.last_name}`, route: '/user/profile', icon: 'person' }
      ];
    }
  }

  /** Computes the average rating across all reviews received by the profile user. */
  getAverageRating(): number {
    if (this.reviews.length === 0) return 0;
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / this.reviews.length;
  }

  /** Returns the profile user's full display name. */
  getFullName(): string {
    if (!this.user) return '';
    return `${this.user.first_name} ${this.user.last_name}`;
  }

  get birthdayValue(): string {
    if (!this.user?.user_birthday) return '';
    return String(this.user.user_birthday).substring(0, 10);
  }

  /** Toggles the full-size avatar preview modal. */
  toggleAvatarModal(): void {
    this.showAvatarModal = !this.showAvatarModal;
  }

  /** Toggles the full-size location map modal. */
  toggleMapModal(): void {
    this.showMapModal = !this.showMapModal;
  }

  /** Navigates to the edit-profile page. */
  goToEditProfile(): void {
    this.router.navigate(['/user/edit-profile']);
  }

  /** Navigates to the admin categories management page. */
  goToCategoriesManagement(): void {
    this.router.navigate(['/admin/categories']);
  }

  /** Navigates to the admin users management page. */
  goToUsersManagement(): void {
    this.router.navigate(['/admin/users']);
  }

  /** Navigates to the admin dashboard. */
  goToDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  /** Navigates to the moderator reports page. */
  goToReports(): void {
    this.router.navigate(['/moderator/reports']);
  }

  /** Opens the logout confirmation modal. */
  logout(): void {
    this.showLogoutModal = true;
  }

  /** Closes the logout confirmation modal without logging out. */
  closeLogoutModal(): void {
    this.showLogoutModal = false;
  }

  /** Confirms logout and delegates to AuthService. */
  confirmLogout(): void {
    this.showLogoutModal = false;
    this.authService.logout();
  }

  /** Opens the account deactivation confirmation modal. */
  openDeleteModal(): void {
    this.showDeleteModal = true;
  }

  /** Closes the account deactivation confirmation modal without deactivating. */
  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  /**
   * Deactivates (soft-deletes) the current user's account, then logs the
   * user out automatically after showing a success toast.
   */
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

  /** Displays a toast notification and auto-hides it after 3 seconds. */
  private showToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    this.toastType = type;
    this.toastTitle = title;
    this.toastMessage = message;
    this.toastVisible = true;
    setTimeout(() => { this.toastVisible = false; }, 3000);
  }

  /** Hides the toast when dismissed by the user or its timer. */
  onToastDismissed(): void {
    this.toastVisible = false;
  }

  /** Angular lifecycle hook. Completes the destroy subject to unsubscribe observables. */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}