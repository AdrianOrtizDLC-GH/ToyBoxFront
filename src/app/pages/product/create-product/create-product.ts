import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
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

@Component({
  selector: 'app-create-product',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-product.html',
  styleUrl: './create-product.css'
})
export class CreateProductComponent implements OnDestroy {
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
  successMessage = '';
  errorMessage = '';

  constructor(
    private productsService: ProductsService,
    private router: Router
  ) {}

  selectCategory(categoryId: number): void {
    this.formData.fk_categories_id = categoryId;
    this.errorMessage = '';
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    if (!files.length) return;

    const availableSlots = Math.max(0, 5 - this.selectedImages.length);

    if (!availableSlots) {
      this.errorMessage = 'Puedes subir un máximo de 5 imágenes.';
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

  removeImage(index: number): void {
    const image = this.selectedImages[index];

    if (image?.preview) {
      URL.revokeObjectURL(image.preview);
    }

    this.selectedImages.splice(index, 1);
  }

  saveDraft(): void {
    this.submitProduct(false);
  }

  publishProduct(): void {
    this.submitProduct(true);
  }

  private submitProduct(shouldPublish: boolean): void {
    this.successMessage = '';
    this.errorMessage = '';

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

        this.uploadImagesAndFinish(productId, shouldPublish);
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

  private uploadImagesAndFinish(productId: number, shouldPublish: boolean): void {
    if (!this.selectedImages.length) {
      this.finishProductCreation(productId, shouldPublish);
      return;
    }

    const imagesFormData = new FormData();

    this.selectedImages.forEach(image => {
      imagesFormData.append('images', image.file);
    });

    this.productsService.uploadImages(productId, imagesFormData).subscribe({
      next: () => {
        this.finishProductCreation(productId, shouldPublish);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = 'El producto se ha creado, pero no se han podido subir las imágenes.';
        console.error('Error subiendo imágenes:', err);
      }
    });
  }

  private finishProductCreation(productId: number, shouldPublish: boolean): void {
    if (!shouldPublish) {
      this.isSubmitting = false;
      this.successMessage = 'Borrador guardado correctamente.';
      this.router.navigate(['/product', productId]);
      return;
    }

    this.productsService.publish(productId).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Producto publicado correctamente.';
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

    if (!this.selectedImages.length) {
      this.errorMessage = 'Sube al menos una imagen del producto.';
      return false;
    }

    return true;
  }

  ngOnDestroy(): void {
    this.selectedImages.forEach(image => {
      URL.revokeObjectURL(image.preview);
    });
  }
}