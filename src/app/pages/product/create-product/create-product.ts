import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { BreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/breadcrumb/breadcrumb';

import { ProductsService } from '../../../core/services/products.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { LocationsService } from '../../../core/services/locations.service';
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

interface CreateProductFormData {
  title: string;
  price: number | null;
  product_condition: ProductCondition | '';
  province: string;
  city: string;
  description: string;
  fk_categories_id: number | null;
}

type CreateProductField =
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
  selector: 'app-create-product',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './create-product.html',
  styleUrl: './create-product.css'
})
export class CreateProductComponent implements OnInit, OnDestroy {
  breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', route: '/catalog', icon: 'home' },
    { label: 'Crear Producto', icon: 'add_circle' }
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

  formData: CreateProductFormData = {
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

  selectedImages: SelectedImage[] = [];

  isSubmitting = false;
  isDragOver = false;
  isLoadingCategories = false;
  isLoadingLocations = false;
  isLoadingCities = false;
  isLoadingUserLocation = false;
  isUserLocationLocked = true;
  showValidationErrors = false;

  successMessage = '';
  errorMessage = '';
  locationError = '';

  private readonly MAX_IMAGES = 5;
  private readonly MAX_IMAGE_SIZE_MB = 5;
  private readonly MAX_IMAGE_SIZE_BYTES = this.MAX_IMAGE_SIZE_MB * 1024 * 1024;
  private readonly DRAFT_STORAGE_KEY = 'toybox-create-product-draft';

  private touchedFields: Record<CreateProductField, boolean> = {
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
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private locationsService: LocationsService,
    private usersService: UsersService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadLocalDraft();
    void this.initializeLocations();
    this.loadUserLocationFromProfile();
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

  private loadUserLocationFromProfile(): void {
    this.isLoadingUserLocation = true;

    this.usersService.getMe().subscribe({
      next: (user) => {
        void this.applyUserLocationFromProfile(user);
      },
      error: (err) => {
        this.isLoadingUserLocation = false;
        this.locationError = 'No se ha podido cargar la ubicación desde tu perfil.';
        this.cdr.markForCheck();
        console.error('Error cargando ubicación del usuario:', err);
      }
    });
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

    if (profileProvince) {
      this.formData.province = profileProvince;
    }

    if (profileCity) {
      this.formData.city = profileCity;
    }

    if (profileProvince) {
      await this.loadCitiesForProvince(profileProvince);
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

  markTouched(field: CreateProductField): void {
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

  removeImage(index: number): void {
    const image = this.selectedImages[index];

    if (image?.preview) {
      URL.revokeObjectURL(image.preview);
    }

    this.selectedImages.splice(index, 1);
    this.markTouched('images');
  }

  saveDraft(): void {
    this.successMessage = '';
    this.errorMessage = '';

    const title = this.formData.title.trim();

    if (!title) {
      this.touchedFields.title = true;
      this.errorMessage = 'Para guardar un borrador, introduce al menos un título.';
      return;
    }

    const draft = {
      formData: this.formData,
      savedAt: new Date().toISOString()
    };

    localStorage.setItem(this.DRAFT_STORAGE_KEY, JSON.stringify(draft));

    this.successMessage = 'Borrador guardado correctamente en este navegador. No se ha publicado ningún producto.';
  }

  publishProduct(): void {
    this.submitProduct();
  }

  getFieldError(field: CreateProductField): string {
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
        if (!this.formData.city) return 'La ciudad debe estar definida en tu perfil.';

        return '';

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

      case 'images':
        return this.selectedImages.length
          ? ''
          : 'Sube al menos una imagen del producto.';

      default:
        return '';
    }
  }

  isFieldInvalid(field: CreateProductField): boolean {
    return Boolean(this.getFieldError(field));
  }

  get selectedCategoryName(): string {
    const selectedCategory = this.categories.find(
      category => category.id_categories === this.formData.fk_categories_id
    );

    return selectedCategory?.name ?? 'Sin categoría seleccionada';
  }

  get remainingImageSlots(): number {
    return Math.max(0, this.MAX_IMAGES - this.selectedImages.length);
  }

  private addImages(files: File[]): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.markTouched('images');

    if (!files.length) return;

    if (!this.remainingImageSlots) {
      this.errorMessage = `Puedes subir un máximo de ${this.MAX_IMAGES} imágenes.`;
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
      this.errorMessage = `Solo se han añadido las primeras ${this.MAX_IMAGES} imágenes.`;
    }
  }

  private submitProduct(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.showValidationErrors = true;

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
    } as ItemFormData;

    this.productsService.create(body).subscribe({
      next: (createdProduct: any) => {
        const productId =
          createdProduct.id_items ??
          createdProduct.id ??
          createdProduct.item?.id_items;

        if (!productId) {
          this.isSubmitting = false;
          this.errorMessage = 'El producto se ha creado, pero no se ha recibido su identificador.';
          return;
        }

        this.uploadImagesAndPublish(productId);
      },
      error: (err) => {
        this.isSubmitting = false;

        if (err.status === 401) {
          this.errorMessage = 'Debes iniciar sesión para publicar un juguete.';
        } else {
          this.errorMessage = err.error?.error || 'No se ha podido crear el producto. Revisa los datos e inténtalo de nuevo.';
        }

        console.error('Error creando producto:', err);
      }
    });
  }

  private uploadImagesAndPublish(productId: number): void {
    const imagesFormData = new FormData();

    this.selectedImages.forEach(image => {
      imagesFormData.append('images', image.file);
    });

    this.productsService.uploadImages(productId, imagesFormData).subscribe({
      next: () => {
        this.publishCreatedProduct(productId);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = 'El producto se ha creado, pero no se han podido subir las imágenes.';
        console.error('Error subiendo imágenes:', err);
      }
    });
  }

  private publishCreatedProduct(productId: number): void {
    this.productsService.publish(productId).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Producto publicado correctamente.';

        localStorage.removeItem(this.DRAFT_STORAGE_KEY);

        this.router.navigate(['/product', productId]);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = 'El producto se ha creado, pero no se ha podido publicar.';
        console.error('Error publicando producto:', err);
      }
    });
  }

  private isFormValid(): boolean {
    const fields: CreateProductField[] = [
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

  private loadLocalDraft(): void {
    const savedDraft = localStorage.getItem(this.DRAFT_STORAGE_KEY);

    if (!savedDraft) return;

    try {
      const parsedDraft = JSON.parse(savedDraft);

      if (parsedDraft?.formData) {
        const savedFormData = parsedDraft.formData;

        this.formData = {
          ...this.formData,
          ...savedFormData,
          product_condition:
            savedFormData.product_condition ??
            savedFormData.conservation_status ??
            this.formData.product_condition
        };

        this.successMessage = 'Hemos recuperado el borrador guardado en este navegador.';
      }
    } catch (error) {
      console.warn('No se ha podido recuperar el borrador local:', error);
      localStorage.removeItem(this.DRAFT_STORAGE_KEY);
    }
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
