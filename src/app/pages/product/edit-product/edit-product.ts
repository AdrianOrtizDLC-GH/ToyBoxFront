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

  showWithdrawModal = false;

  successMessage = '';
  errorMessage = '';

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

    this.errorMessage = '';
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    if (!files.length) return;

    const totalImages = this.currentImages.length + this.selectedImages.length;
    const availableSlots = Math.max(0, 5 - totalImages);

    if (!availableSlots) {
      this.errorMessage = 'Puedes tener un máximo de 5 imágenes.';
      input.value = '';
      return;
    }

    const validFiles = files
      .filter(file => file.type.startsWith('image/'))
      .slice(0, availableSlots);

    if (!validFiles.length) {
      this.errorMessage = 'Selecciona archivos de imagen válidos.';
      input.value = '';
      return;
    }

    validFiles.forEach(file => {
      const preview = URL.createObjectURL(file);
      this.selectedImages.push({ file, preview });
    });

    input.value = '';
    this.errorMessage = '';
  }

  removeNewImage(index: number): void {
    const image = this.selectedImages[index];

    if (image?.preview) {
      URL.revokeObjectURL(image.preview);
    }

    this.selectedImages.splice(index, 1);
  }

  cancelEdit(): void {
    this.router.navigate(['/catalog']);
  }

  saveChanges(): void {
    this.successMessage = '';
    this.errorMessage = '';

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

  private isFormValid(): boolean {
    if (!this.formData.title.trim()) {
      this.errorMessage = 'Introduce un título para el producto.';
      return false;
    }

    if (!this.formData.price || Number(this.formData.price) <= 0) {
      this.errorMessage = 'Introduce un precio válido.';
      return false;
    }

    if (!this.formData.conservation_status) {
      this.errorMessage = 'Selecciona el estado del producto.';
      return false;
    }

    if (!this.formData.province.trim()) {
      this.errorMessage = 'Introduce la provincia.';
      return false;
    }

    if (!this.formData.city.trim()) {
      this.errorMessage = 'Introduce la ciudad.';
      return false;
    }

    if (!this.formData.description.trim()) {
      this.errorMessage = 'Añade una descripción del producto.';
      return false;
    }

    if (!this.formData.fk_categories_id) {
      this.errorMessage = 'Selecciona una categoría.';
      return false;
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
      deleted: 'Eliminado'
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