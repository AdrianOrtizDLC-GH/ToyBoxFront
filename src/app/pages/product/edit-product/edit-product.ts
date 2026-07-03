import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ProductsService } from '../../../core/services/products.service';
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

type EditProductField =
  | 'title'
  | 'price'
  | 'conservation_status'
  | 'province'
  | 'city'
  | 'description'
  | 'fk_categories_id'
  | 'images';

@Component({
  selector: 'app-edit-product',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-product.html',
  styleUrl: './edit-product.css'
})
export class EditProductComponent implements OnInit, OnDestroy {
  categories: Category[] = [
    {
      id_categories: 1,
      name: 'Videojuegos y consolas',
      description: 'Juegos de PlayStation, Xbox, Nintendo y otras consolas',
      icon: '/assets/images/Iconos%20categorias/icono_videojuegos.svg'
    },
    {
      id_categories: 2,
      name: 'Construcciones y bloques',
      description: 'Juguetes tipo LEGO, bloques de construcción y sets creativos',
      icon: '/assets/images/Iconos%20categorias/icono_construccion.svg'
    },
    {
      id_categories: 3,
      name: 'Muñecos y figuras',
      description: 'Muñecas, figuras de acción y personajes coleccionables',
      icon: '/assets/images/Iconos%20categorias/icono_bebes.svg'
    },
    {
      id_categories: 4,
      name: 'Puzzles y rompecabezas',
      description: 'Puzzles de piezas, rompecabezas 2D y 3D',
      icon: '/assets/images/Iconos%20categorias/icono_juegosmesa.svg'
    },
    {
      id_categories: 5,
      name: 'Juegos de mesa y cartas',
      description: 'Juegos de tablero, cartas y party games',
      icon: '/assets/images/Iconos%20categorias/icono_imaginacion.svg'
    },
    {
      id_categories: 6,
      name: 'Educativos y preescolar',
      description: 'Juguetes sensoriales, educativos y seguros para bebés y peques',
      icon: '/assets/images/Iconos%20categorias/icono_educativo.svg'
    },
    {
      id_categories: 7,
      name: 'Vehículos y circuitos',
      description: 'Coches, trenes, pistas y circuitos',
      icon: '/assets/images/Iconos%20categorias/icono_munecosycoches.svg'
    },
    {
      id_categories: 8,
      name: 'Arte y manualidades',
      description: 'Kits creativos, pintura, plastilina y manualidades',
      icon: '/assets/images/Iconos%20categorias/icono_airelibre.svg'
    }
  ];

  productStates: ProductStateOption[] = [
    { label: 'Como nuevo', value: 'excellent' },
    { label: 'Muy buen estado', value: 'very_good' },
    { label: 'Buen estado', value: 'good' },
    { label: 'Usado', value: 'fair' }
  ];

  productId: number | null = null;

  formData = {
    title: '',
    price: null as number | null,
    conservation_status: '',
    province: '',
    city: '',
    description: '',
    fk_categories_id: null as number | null
  };

  currentImages: CurrentImage[] = [];
  selectedImages: SelectedImage[] = [];

  currentBadge = 'Publicado';

  isLoading = true;
  isSubmitting = false;
  isWithdrawing = false;
  isDragOver = false;
  showValidationErrors = false;

  showWithdrawModal = false;

  successMessage = '';
  errorMessage = '';

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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = Number(params['id']);

      if (!id) {
        this.errorMessage = 'No se ha encontrado el identificador del producto.';
        this.isLoading = false;
        return;
      }

      this.productId = id;
      this.loadProduct(id);
    });
  }

  loadProduct(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.showValidationErrors = false;

    this.productsService.getById(id).subscribe({
      next: (raw: any) => {
        this.formData = {
          title: raw.title ?? '',
          price: raw.price ? Number(raw.price) : null,
          conservation_status: raw.conservation_status ?? '',
          province: raw.province ?? this.extractProvince(raw.location),
          city: raw.city ?? raw.seller_city ?? this.extractCity(raw.location),
          description: raw.description ?? '',
          fk_categories_id: raw.fk_categories_id ?? raw.category?.id_categories ?? null
        };

        this.currentBadge = this.getBadgeLabel(raw.item_status);
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

  selectCategory(categoryId: number): void {
    this.formData.fk_categories_id =
      this.formData.fk_categories_id === categoryId ? null : categoryId;

    this.markTouched('fk_categories_id');
    this.errorMessage = '';
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

    const body = {
      title: this.formData.title.trim(),
      description: this.formData.description.trim(),
      price: Number(this.formData.price),
      conservation_status: this.formData.conservation_status,
      province: this.formData.province.trim(),
      city: this.formData.city.trim(),
      location: `${this.formData.city.trim()}, ${this.formData.province.trim()}`,
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
        const province = this.formData.province.trim();

        if (!province) return 'Introduce la provincia.';
        if (province.length < 2) return 'La provincia debe tener al menos 2 caracteres.';
        if (province.length > 60) return 'La provincia no puede superar los 60 caracteres.';

        return '';
      }

      case 'city': {
        const city = this.formData.city.trim();

        if (!city) return 'Introduce la ciudad.';
        if (city.length < 2) return 'La ciudad debe tener al menos 2 caracteres.';
        if (city.length > 60) return 'La ciudad no puede superar los 60 caracteres.';

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
    const photos = (raw.photos ?? [])
      .map((photo: any) => photo.photo_url)
      .filter(Boolean)
      .map((url: string, index: number) => ({
        url,
        label: index === 0 ? 'Principal' : ''
      }));

    if (photos.length) return photos;

    if (raw.main_photo) {
      return [
        {
          url: raw.main_photo,
          label: 'Principal'
        }
      ];
    }

    return [];
  }

  private getBadgeLabel(status: string): string {
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

    return labels[status] ?? status ?? 'Publicado';
  }

  private extractCity(location?: string): string {
    if (!location) return '';

    return location.split(',')[0]?.trim() ?? '';
  }

  private extractProvince(location?: string): string {
    if (!location) return '';

    return location.split(',')[1]?.trim() ?? '';
  }

  ngOnDestroy(): void {
    this.selectedImages.forEach(image => {
      URL.revokeObjectURL(image.preview);
    });
  }
}
