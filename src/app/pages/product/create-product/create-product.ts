import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

type CreateProductField =
  | 'title'
  | 'price'
  | 'conservation_status'
  | 'province'
  | 'city'
  | 'description'
  | 'fk_categories_id'
  | 'images';

@Component({
  selector: 'app-create-product',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-product.html',
  styleUrl: './create-product.css'
})
export class CreateProductComponent implements OnInit, OnDestroy {
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

  formData = {
    title: '',
    price: null as number | null,
    conservation_status: '',
    province: '',
    city: '',
    description: '',
    fk_categories_id: null as number | null
  };

  selectedImages: SelectedImage[] = [];

  isSubmitting = false;
  isDragOver = false;
  showValidationErrors = false;

  successMessage = '';
  errorMessage = '';

  private readonly MAX_IMAGES = 5;
  private readonly MAX_IMAGE_SIZE_MB = 5;
  private readonly MAX_IMAGE_SIZE_BYTES = this.MAX_IMAGE_SIZE_MB * 1024 * 1024;
  private readonly DRAFT_STORAGE_KEY = 'toybox-create-product-draft';

  private touchedFields: Record<CreateProductField, boolean> = {
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
    private productsService: ProductsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLocalDraft();
  }

  selectCategory(categoryId: number): void {
    this.formData.fk_categories_id = categoryId;
    this.markTouched('fk_categories_id');
    this.errorMessage = '';
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

    const body = {
      title: this.formData.title.trim(),
      description: this.formData.description.trim(),
      price: Number(this.formData.price),
      conservation_status: this.formData.conservation_status,
      province: this.formData.province.trim(),
      city: this.formData.city.trim(),
      location: `${this.formData.city.trim()}, ${this.formData.province.trim()}`,
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

  private loadLocalDraft(): void {
    const savedDraft = localStorage.getItem(this.DRAFT_STORAGE_KEY);

    if (!savedDraft) return;

    try {
      const parsedDraft = JSON.parse(savedDraft);

      if (parsedDraft?.formData) {
        this.formData = {
          ...this.formData,
          ...parsedDraft.formData
        };

        this.successMessage = 'Hemos recuperado el borrador guardado en este navegador.';
      }
    } catch (error) {
      console.warn('No se ha podido recuperar el borrador local:', error);
      localStorage.removeItem(this.DRAFT_STORAGE_KEY);
    }
  }

  ngOnDestroy(): void {
    this.selectedImages.forEach(image => {
      URL.revokeObjectURL(image.preview);
    });
  }
}