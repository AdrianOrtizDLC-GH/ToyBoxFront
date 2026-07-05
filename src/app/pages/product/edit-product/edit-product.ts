import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { BreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/breadcrumb/breadcrumb';

import { ProductsService } from '../../../core/services/products.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { LocationsService } from '../../../core/services/locations.service';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../../../core/services/users.service';

import { Category } from '../../../shared/interfaces/category.interface';
import { ItemFormData } from '../../../shared/interfaces/item.interface';
import {
  ProductCondition,
  PRODUCT_CONDITION_LABELS
} from '../../../shared/enums/product-condition.enum';

interface ProductConditionOption {
  label: string;
  value: ProductCondition;
}

interface SelectedImage {
  file: File;
  preview: string;
}

interface CurrentImage {
  url: string;
  label?: string;
}

interface EditProductFormData {
  title: string;
  price: number | null;
  product_condition: ProductCondition | '';
  province: string;
  city: string;
  description: string;
  fk_categories_id: number | null;
}

type EditProductField =
  | 'title'
  | 'price'
  | 'product_condition'
  | 'province'
  | 'city'
  | 'description'
  | 'fk_categories_id'
  | 'images';

const CATEGORY_ICONS: Record<number, string> = {
  1: '/assets/images/Iconos%20categorias/icono_videojuegos.svg',
  2: '/assets/images/Iconos%20categorias/icono_construccion.svg',
  3: '/assets/images/Iconos%20categorias/icono_bebes.svg',
  4: '/assets/images/Iconos%20categorias/icono_juegosmesa.svg',
  5: '/assets/images/Iconos%20categorias/icono_imaginacion.svg',
  6: '/assets/images/Iconos%20categorias/icono_educativo.svg',
  7: '/assets/images/Iconos%20categorias/icono_munecosycoches.svg',
  8: '/assets/images/Iconos%20categorias/icono_airelibre.svg',
};

@Component({
  selector: 'app-edit-product',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './edit-product.html',
  styleUrl: './edit-product.css'
})
export class EditProductComponent implements OnInit, OnDestroy {
  breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', route: '/catalog', icon: 'home' },
    { label: 'Mis Productos', route: '/user/my-products', icon: 'store' },
    { label: 'Editar Producto', icon: 'edit' }
  ];

  categories: Category[] = [];

  productConditions: ProductConditionOption[] = [
    {
      label: PRODUCT_CONDITION_LABELS[ProductCondition.Excellent],
      value: ProductCondition.Excellent
    },
    {
      label: PRODUCT_CONDITION_LABELS[ProductCondition.VeryGood],
      value: ProductCondition.VeryGood
    },
    {
      label: PRODUCT_CONDITION_LABELS[ProductCondition.Good],
      value: ProductCondition.Good
    },
    {
      label: PRODUCT_CONDITION_LABELS[ProductCondition.Fair],
      value: ProductCondition.Fair
    }
  ];

  productId: number | null = null;

  formData: EditProductFormData = {
    title: '',
    price: null,
    product_condition: '',
    province: '',
    city: '',
    description: '',
    fk_categories_id: null
  };

  provincias: string[] = [];
  ciudadesDisponibles: string[] = [];

  currentImages: CurrentImage[] = [];
  selectedImages: SelectedImage[] = [];

  currentBadge = 'Publicado';

  isLoading = true;
  isSubmitting = false;
  isWithdrawing = false;
  isDragOver = false;
  showValidationErrors = false;
  isLoadingCategories = false;
  isLoadingLocations = false;
  isLoadingCities = false;
  isLoadingUserLocation = false;
  isUserLocationLocked = true;

  showWithdrawModal = false;

  successMessage = '';
  errorMessage = '';
  locationError = '';

  private readonly MAX_IMAGES = 5;
  private readonly MAX_IMAGE_SIZE_MB = 5;
  private readonly MAX_IMAGE_SIZE_BYTES = this.MAX_IMAGE_SIZE_MB * 1024 * 1024;

  private touchedFields: Record<EditProductField, boolean> = {
    title: false,
    price: false,
    product_condition: false,
    province: false,
    city: false,
    description: false,
    fk_categories_id: false,
    images: false
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private locationsService: LocationsService,
    private authService: AuthService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    void this.initializeLocations();

    this.route.params.subscribe(params => {
      const id = Number(params['id']);

      if (!id) {
        this.errorMessage = 'No se ha encontrado el identificador del producto.';
        this.isLoading = false;
        this.cdr.markForCheck();
        return;
      }

      this.productId = id;
      this.loadProduct(id);
    });
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private loadCategories(): void {
    this.isLoadingCategories = true;

    this.categoriesService.getAll().subscribe({
      next: (categories: Category[]) => {
        this.categories = categories.map(category => this.withCategoryIcon(category));
        this.isLoadingCategories = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoadingCategories = false;
        this.errorMessage = 'No se han podido cargar las categorías.';
        this.cdr.markForCheck();
        console.error('Error cargando categorías:', err);
      }
    });
  }

  private async initializeLocations(): Promise<void> {
    this.isLoadingLocations = true;
    this.locationError = '';

    try {
      this.provincias = await this.locationsService.getProvincias();

      if (this.formData.province) {
        await this.loadCitiesForProvince(this.formData.province);
      }
    } catch (error) {
      this.locationError = 'No se han podido cargar las provincias.';
      console.error('Error cargando ubicaciones:', error);
    } finally {
      this.isLoadingLocations = false;
      this.cdr.markForCheck();
    }
  }

  private async loadUserLocationFromProfile(): Promise<void> {
    this.isLoadingUserLocation = true;
    this.locationError = '';

    const currentUser = this.getCurrentUserFromAuth();

    if (this.hasUserLocation(currentUser)) {
      await this.applyUserLocationFromProfile(currentUser);
      return;
    }

    const userId = this.getCurrentUserId(currentUser);

    if (!userId) {
      this.isLoadingUserLocation = false;
      this.locationError = 'No se ha podido identificar el usuario autenticado.';
      this.cdr.markForCheck();
      return;
    }

    try {
      const user = await firstValueFrom(this.usersService.getById(userId));
      await this.applyUserLocationFromProfile(user);
    } catch (err) {
      this.isLoadingUserLocation = false;
      this.locationError = 'No se ha podido cargar la ubicación desde tu perfil.';
      this.cdr.markForCheck();
      console.error('Error cargando ubicación del perfil:', err);
    }
  }

  private getCurrentUserFromAuth(): any {
    const authService = this.authService as any;

    if (typeof authService.currentUser === 'function') {
      const userFromMethod = authService.currentUser();

      if (userFromMethod) {
        return userFromMethod;
      }
    }

    const userFromService =
      authService.currentUser ??
      authService.user ??
      authService.currentUserValue ??
      authService.userValue ??
      null;

    if (userFromService) {
      return userFromService;
    }

    return this.getCurrentUserFromLocalStorage();
  }

  private getCurrentUserFromLocalStorage(): any {
    if (!this.isBrowser()) return null;

    const possibleUserKeys = [
      'currentUser',
      'user',
      'authUser',
      'toybox-user',
      'toybox_current_user'
    ];

    for (const key of possibleUserKeys) {
      const value = window.localStorage.getItem(key);

      if (!value) continue;

      try {
        const parsed = JSON.parse(value);
        return parsed?.user ?? parsed;
      } catch {
        continue;
      }
    }

    return this.getUserFromStoredToken();
  }

  private getUserFromStoredToken(): any {
    if (!this.isBrowser()) return null;

    const possibleTokenKeys = [
      'token',
      'authToken',
      'access_token',
      'accessToken',
      'toybox-token',
      'toybox_token'
    ];

    for (const key of possibleTokenKeys) {
      const token = window.localStorage.getItem(key);
      const decodedUser = this.decodeJwtPayload(token);

      if (decodedUser) {
        return decodedUser;
      }
    }

    return null;
  }

  private decodeJwtPayload(token: string | null): any {
    if (!token || !this.isBrowser()) return null;

    try {
      const payload = token.split('.')[1];

      if (!payload) return null;

      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decodedPayload = window.atob(normalizedPayload);

      return JSON.parse(decodedPayload);
    } catch {
      return null;
    }
  }

  private getCurrentUserId(user: any): number | null {
    const rawId =
      user?.id_users ??
      user?.id ??
      user?.user_id ??
      user?.sub ??
      user?.user?.id_users ??
      user?.user?.id ??
      null;

    const userId = Number(rawId);

    return Number.isFinite(userId) && userId > 0 ? userId : null;
  }

  private hasUserLocation(user: any): boolean {
    const province =
      user?.user_province ??
      user?.province ??
      '';

    const city =
      user?.user_city ??
      user?.city ??
      '';

    return Boolean(province && city);
  }

  private async applyUserLocationFromProfile(user: any): Promise<void> {
    const profileProvince =
      user?.user_province ??
      user?.province ??
      '';

    const profileCity =
      user?.user_city ??
      user?.city ??
      '';

    if (!profileProvince || !profileCity) {
      this.isLoadingUserLocation = false;
      this.locationError = 'Completa provincia y ciudad en tu perfil antes de editar este producto.';
      this.cdr.markForCheck();
      return;
    }

    this.formData.province = profileProvince;
    this.formData.city = profileCity;

    try {
      await this.loadCitiesForProvince(profileProvince);
    } catch (error) {
      console.error('Error cargando ciudades desde perfil:', error);
    }

    this.isLoadingUserLocation = false;
    this.cdr.markForCheck();
  }

  private async loadCitiesForProvince(province: string): Promise<void> {
    this.isLoadingCities = true;
    this.locationError = '';

    try {
      this.ciudadesDisponibles = await this.locationsService.getCiudadesByProvincia(province);
    } catch (error) {
      this.ciudadesDisponibles = [];
      this.locationError = 'No se han podido cargar las ciudades de la provincia seleccionada.';
      console.error('Error cargando ciudades:', error);
    } finally {
      this.isLoadingCities = false;
      this.cdr.markForCheck();
    }
  }

  loadProduct(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.showValidationErrors = false;

    this.productsService.getById(id).subscribe({
      next: async (raw: any) => {
        const rawCategoryId =
          raw.fk_categories_id ??
          raw.fk_category_id ??
          raw.category_id ??
          raw.category?.id_categories ??
          raw.category?.id ??
          null;

        const rawCondition =
          raw.product_condition ??
          raw.condition_status ??
          raw.condition ??
          raw.item_condition ??
          raw.productCondition ??
          raw.conservation_status ??
          raw.conservationStatus ??
          '';

        this.formData = {
          title: raw.title ?? '',
          price: raw.price ? Number(raw.price) : null,
          product_condition: this.normalizeProductCondition(rawCondition),
          province: raw.province ?? raw.seller_province ?? this.extractProvince(raw.location),
          city: raw.city ?? raw.seller_city ?? this.extractCity(raw.location),
          description: raw.description ?? '',
          fk_categories_id: rawCategoryId ? Number(rawCategoryId) : null
        };

        await this.loadUserLocationFromProfile();

        this.currentBadge = this.getBadgeLabel(
          raw.item_status ??
          raw.publication_status ??
          raw.publicationStatus ??
          raw.status
        );

        this.currentImages = this.mapCurrentImages(raw);

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.status === 404
          ? 'Producto no encontrado.'
          : 'No se ha podido cargar el producto.';

        console.error('Error cargando producto para editar:', err);
        this.cdr.markForCheck();
      }
    });
  }

  async onProvinceChange(province: string): Promise<void> {
    if (this.isUserLocationLocked) return;

    this.formData.province = province;
    this.formData.city = '';
    this.ciudadesDisponibles = [];
    this.locationError = '';

    this.markTouched('province');
    this.touchedFields.city = false;

    if (province) {
      await this.loadCitiesForProvince(province);
    }

    this.cdr.markForCheck();
  }

  onCityChange(city: string): void {
    if (this.isUserLocationLocked) return;

    this.formData.city = city;
    this.locationError = '';
    this.markTouched('city');
    this.cdr.markForCheck();
  }

  selectCategory(categoryId: number): void {
    this.formData.fk_categories_id = categoryId;
    this.markTouched('fk_categories_id');
    this.errorMessage = '';
  }

  selectCategoryFromSelect(categoryIdValue: string | number): void {
    const categoryId = Number(categoryIdValue);

    if (!categoryId) {
      this.formData.fk_categories_id = null;
      this.markTouched('fk_categories_id');
      return;
    }

    this.selectCategory(categoryId);
  }

  markTouched(field: EditProductField): void {
    this.touchedFields[field] = true;
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    this.addImages(files);

    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.isDragOver = false;

    const files = Array.from(event.dataTransfer?.files ?? []);
    this.addImages(files);
  }

  removeNewImage(index: number): void {
    const image = this.selectedImages[index];

    if (image?.preview) {
      URL.revokeObjectURL(image.preview);
    }

    this.selectedImages.splice(index, 1);
    this.markTouched('images');
  }

  cancelEdit(): void {
    if (this.productId) {
      this.router.navigate(['/product', this.productId]);
      return;
    }

    this.router.navigate(['/catalog']);
  }

  saveChanges(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.showValidationErrors = true;

    if (!this.productId || this.isSubmitting) return;

    if (!this.isFormValid()) return;

    this.isSubmitting = true;

    const city = this.formData.city.trim();
    const province = this.formData.province.trim();

    const body = {
      title: this.formData.title.trim(),
      description: this.formData.description.trim(),
      price: Number(this.formData.price),
      product_condition: this.formData.product_condition as ProductCondition,
      province,
      city,
      location: `${city}, ${province}`,
      fk_categories_id: Number(this.formData.fk_categories_id)
    } as Partial<ItemFormData>;

    this.productsService.update(this.productId, body).subscribe({
      next: () => {
        this.uploadImagesAndFinish();
      },
      error: (err) => {
        this.isSubmitting = false;

        if (err.status === 401) {
          this.errorMessage = 'Debes iniciar sesión para editar este producto.';
        } else {
          this.errorMessage = err.error?.error || 'No se han podido guardar los cambios.';
        }

        console.error('Error guardando cambios:', err);
      }
    });
  }

  openWithdrawModal(): void {
    this.showWithdrawModal = true;
    this.errorMessage = '';
  }

  closeWithdrawModal(): void {
    if (this.isWithdrawing) return;

    this.showWithdrawModal = false;
  }

  confirmWithdraw(): void {
    if (!this.productId || this.isWithdrawing) return;

    this.isWithdrawing = true;
    this.errorMessage = '';

    this.productsService.delete(this.productId).subscribe({
      next: () => {
        this.isWithdrawing = false;
        this.showWithdrawModal = false;
        this.router.navigate(['/catalog']);
      },
      error: (err) => {
        this.isWithdrawing = false;

        if (err.status === 401) {
          this.errorMessage = 'Debes iniciar sesión para retirar esta publicación.';
        } else {
          this.errorMessage = err.error?.error || 'No se ha podido retirar la publicación.';
        }

        console.error('Error retirando publicación:', err);
      }
    });
  }

  getFieldError(field: EditProductField): string {
    const shouldShow = this.showValidationErrors || this.touchedFields[field];

    if (!shouldShow) return '';

    switch (field) {
      case 'title': {
        const title = this.formData.title.trim();

        if (!title) return 'Introduce un título para el producto.';
        if (title.length < 3) return 'El título debe tener al menos 3 caracteres.';
        if (title.length > 80) return 'El título no puede superar los 80 caracteres.';

        return '';
      }

      case 'price': {
        const price = Number(this.formData.price);

        if (!this.formData.price) return 'Introduce un precio.';
        if (Number.isNaN(price) || price <= 0) return 'Introduce un precio válido.';
        if (price > 1000) return 'El precio máximo permitido es 1000 €.';

        return '';
      }

      case 'product_condition':
        return this.formData.product_condition
          ? ''
          : 'Selecciona el estado del juguete.';

      case 'province':
        return this.formData.province
          ? ''
          : 'La provincia debe estar definida en tu perfil.';

      case 'city':
        return this.formData.city
          ? ''
          : 'La ciudad debe estar definida en tu perfil.';

      case 'description': {
        const description = this.formData.description.trim();

        if (!description) return 'Añade una descripción del producto.';
        if (description.length < 20) return 'La descripción debe tener al menos 20 caracteres.';
        if (description.length > 600) return 'La descripción no puede superar los 600 caracteres.';

        return '';
      }

      case 'fk_categories_id':
        return this.formData.fk_categories_id
          ? ''
          : 'Selecciona una categoría.';

      case 'images': {
        const totalImages = this.currentImages.length + this.selectedImages.length;

        return totalImages
          ? ''
          : 'El producto debe tener al menos una imagen.';
      }

      default:
        return '';
    }
  }

  isFieldInvalid(field: EditProductField): boolean {
    return Boolean(this.getFieldError(field));
  }

  get selectedCategoryName(): string {
    const selected = this.categories.find(
      category => category.id_categories === this.formData.fk_categories_id
    );

    return selected?.name ?? 'Sin categoría seleccionada';
  }

  get selectedConditionLabel(): string {
    const selected = this.productConditions.find(
      condition => condition.value === this.formData.product_condition
    );

    return selected?.label ?? 'Sin estado seleccionado';
  }

  get remainingImageSlots(): number {
    const totalImages = this.currentImages.length + this.selectedImages.length;
    return Math.max(0, this.MAX_IMAGES - totalImages);
  }

  private addImages(files: File[]): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.markTouched('images');

    if (!files.length) return;

    if (!this.remainingImageSlots) {
      this.errorMessage = `Puedes tener un máximo de ${this.MAX_IMAGES} imágenes.`;
      return;
    }

    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (!imageFiles.length) {
      this.errorMessage = 'Selecciona archivos de imagen válidos.';
      return;
    }

    const acceptedFiles: File[] = [];

    for (const file of imageFiles) {
      if (acceptedFiles.length >= this.remainingImageSlots) break;

      if (file.size > this.MAX_IMAGE_SIZE_BYTES) {
        this.errorMessage = `La imagen "${file.name}" supera los ${this.MAX_IMAGE_SIZE_MB} MB.`;
        continue;
      }

      const alreadySelected = this.selectedImages.some(
        image => image.file.name === file.name && image.file.size === file.size
      );

      if (alreadySelected) {
        this.errorMessage = `La imagen "${file.name}" ya está seleccionada.`;
        continue;
      }

      acceptedFiles.push(file);
    }

    acceptedFiles.forEach(file => {
      const preview = URL.createObjectURL(file);
      this.selectedImages.push({ file, preview });
    });

    if (files.length > acceptedFiles.length && this.remainingImageSlots === 0) {
      this.errorMessage = `Solo se han añadido las imágenes permitidas hasta un máximo de ${this.MAX_IMAGES}.`;
    }
  }

  private uploadImagesAndFinish(): void {
    if (!this.productId) return;

    if (!this.selectedImages.length) {
      this.finishSave();
      return;
    }

    const imagesFormData = new FormData();

    this.selectedImages.forEach(image => {
      imagesFormData.append('images', image.file);
    });

    this.productsService.uploadImages(this.productId, imagesFormData).subscribe({
      next: () => {
        this.finishSave();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = 'Los datos se han guardado, pero no se han podido subir las imágenes.';
        console.error('Error subiendo imágenes:', err);
      }
    });
  }

  private finishSave(): void {
    if (!this.productId) return;

    this.isSubmitting = false;
    this.successMessage = 'Cambios guardados correctamente.';
    this.router.navigate(['/product', this.productId]);
  }

  private isFormValid(): boolean {
    const fields: EditProductField[] = [
      'title',
      'price',
      'product_condition',
      'province',
      'city',
      'description',
      'fk_categories_id',
      'images'
    ];

    for (const field of fields) {
      const error = this.getFieldError(field);

      if (error) {
        this.errorMessage = error;
        return false;
      }
    }

    return true;
  }

  private mapCurrentImages(raw: any): CurrentImage[] {
    const imageSources = [
      ...(Array.isArray(raw.photos) ? raw.photos : []),
      ...(Array.isArray(raw.images) ? raw.images : []),
      ...(Array.isArray(raw.product_images) ? raw.product_images : [])
    ];

    const photos = imageSources
      .map((photo: any) =>
        photo.photo_url ??
        photo.image_url ??
        photo.url ??
        photo.src
      )
      .filter(Boolean)
      .map((url: string, index: number) => ({
        url,
        label: index === 0 ? 'Principal' : ''
      }));

    if (photos.length) return photos;

    const mainPhoto =
      raw.main_photo ??
      raw.mainPhoto ??
      raw.image ??
      raw.thumbnail ??
      '';

    if (mainPhoto) {
      return [
        {
          url: mainPhoto,
          label: 'Principal'
        }
      ];
    }

    return [];
  }

  private normalizeProductCondition(value: unknown): ProductCondition | '' {
    const key = String(value ?? '').toLowerCase().trim();

    const labels: Record<string, ProductCondition> = {
      excellent: ProductCondition.Excellent,
      'como nuevo': ProductCondition.Excellent,
      like_new: ProductCondition.Excellent,
      new: ProductCondition.Excellent,

      very_good: ProductCondition.VeryGood,
      'muy buen estado': ProductCondition.VeryGood,
      verygood: ProductCondition.VeryGood,

      good: ProductCondition.Good,
      'buen estado': ProductCondition.Good,

      fair: ProductCondition.Fair,
      used: ProductCondition.Fair,
      usado: ProductCondition.Fair
    };

    const publicationStatuses = [
      'available',
      'published',
      'sold',
      'paused',
      'deleted',
      'draft',
      'under_review',
      'removed'
    ];

    if (publicationStatuses.includes(key)) return '';

    return labels[key] ?? '';
  }

  private getBadgeLabel(status: string): string {
    const key = String(status ?? '').toLowerCase().trim();

    const labels: Record<string, string> = {
      available: 'Disponible',
      sold: 'Vendido',
      paused: 'Pausado',
      deleted: 'Eliminado',
      draft: 'Borrador',
      published: 'Publicado',
      under_review: 'En revisión',
      removed: 'Retirado'
    };

    return labels[key] ?? status ?? 'Publicado';
  }

  private extractCity(location?: string): string {
    if (!location) return '';

    return location.split(',')[0]?.trim() ?? '';
  }

  private extractProvince(location?: string): string {
    if (!location) return '';

    return location.split(',')[1]?.trim() ?? '';
  }

  private withCategoryIcon(category: Category): Category {
    const categoryIcon = String((category as any).icon ?? '').trim();

    return {
      ...category,
      icon: categoryIcon || CATEGORY_ICONS[category.id_categories] || '/assets/images/Iconos%20categorias/icono_educativo.svg'
    };
  }

  ngOnDestroy(): void {
    this.selectedImages.forEach(image => {
      URL.revokeObjectURL(image.preview);
    });
  }
}
