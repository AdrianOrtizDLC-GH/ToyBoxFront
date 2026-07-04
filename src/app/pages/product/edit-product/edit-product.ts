import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { BreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/breadcrumb/breadcrumb';

import { ProductsService } from '../../../core/services/products.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { LocationsService } from '../../../core/services/locations.service';

import { Category } from '../../../shared/interfaces/category.interface';
import { ItemFormData } from '../../../shared/interfaces/item.interface';

interface ProductStateOption {
  label: string;
  value: string;
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
  conservation_status: string;
  province: string;
  city: string;
  description: string;
  fk_categories_id: number | null;
}

type EditProductField =
  | 'title'
  | 'price'
  | 'conservation_status'
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

  productStates: ProductStateOption[] = [
    { label: 'Como nuevo', value: 'excellent' },
    { label: 'Muy buen estado', value: 'very_good' },
    { label: 'Buen estado', value: 'good' },
    { label: 'Usado', value: 'fair' }
  ];

  productId: number | null = null;

  formData: EditProductFormData = {
    title: '',
    price: null,
    conservation_status: '',
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
    conservation_status: false,
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
          raw.conservation_status ??
          raw.condition_status ??
          raw.condition ??
          raw.item_condition ??
          raw.conservationStatus ??
          '';

        this.formData = {
          title: raw.title ?? '',
          price: raw.price ? Number(raw.price) : null,
          conservation_status: this.normalizeConservationStatus(rawCondition),
          province: raw.province ?? raw.seller_province ?? this.extractProvince(raw.location),
          city: raw.city ?? raw.seller_city ?? this.extractCity(raw.location),
          description: raw.description ?? '',
          fk_categories_id: rawCategoryId ? Number(rawCategoryId) : null
        };

        if (this.formData.province) {
          await this.loadCitiesForProvince(this.formData.province);
        }

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
      conservation_status: this.formData.conservation_status,
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

      case 'conservation_status':
        return this.formData.conservation_status
          ? ''
          : 'Selecciona el estado del producto.';

      case 'province': {
        if (!this.formData.province) return 'Selecciona una provincia.';

        if (
          this.provincias.length > 0 &&
          !this.provincias.includes(this.formData.province)
        ) {
          return 'Selecciona una provincia válida.';
        }

        return '';
      }

      case 'city': {
        if (!this.formData.city) return 'Selecciona una ciudad.';

        if (
          this.ciudadesDisponibles.length > 0 &&
          !this.ciudadesDisponibles.includes(this.formData.city)
        ) {
          return 'Selecciona una ciudad válida para la provincia elegida.';
        }

        return '';
      }

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

  get selectedStateLabel(): string {
    const selected = this.productStates.find(
      state => state.value === this.formData.conservation_status
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
      'conservation_status',
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

  private normalizeConservationStatus(value: unknown): string {
    const key = String(value ?? '').toLowerCase().trim();

    const labels: Record<string, string> = {
      excellent: 'excellent',
      'como nuevo': 'excellent',
      like_new: 'excellent',
      new: 'excellent',

      very_good: 'very_good',
      'muy buen estado': 'very_good',
      verygood: 'very_good',

      good: 'good',
      'buen estado': 'good',

      fair: 'fair',
      used: 'fair',
      usado: 'fair'
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
