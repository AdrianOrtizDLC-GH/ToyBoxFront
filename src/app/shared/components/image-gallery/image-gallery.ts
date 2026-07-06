import { Component, Input } from '@angular/core';

/**
 * Reusable image gallery component that displays a main image with a
 * thumbnail strip below it. Used on product detail pages to let users
 * browse through all images of a product, with an optional badge
 * (e.g. "New", "Sale") overlaid on the main image.
 */
@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [],
  templateUrl: './image-gallery.html',
  styleUrl: './image-gallery.css'
})
export class ImageGalleryComponent {
  // List of image URLs to display; the first thumbnail/main image defaults to index 0.
  @Input() images: string[] = [];
  // Optional label shown as a badge overlay on the main image (e.g. "New").
  @Input() badge = '';
  // Alt text used for the main image and thumbnails (for accessibility).
  @Input() altText = 'Imagen del producto';

  // Index of the currently selected/displayed image within the images array.
  selectedIndex = 0;

  /**
   * Returns the URL of the currently selected image, falling back to a
   * default placeholder icon if the images array is empty or invalid.
   * @returns the image URL to render in the main preview.
   */
  get selectedImage(): string {
    return this.images[this.selectedIndex] || '/assets/images/Iconos%20categorias/icono_educativo.svg';
  }

  /**
   * Updates the selected image index when a thumbnail is clicked.
   * @param index index of the clicked thumbnail within the images array.
   */
  selectImage(index: number): void {
    this.selectedIndex = index;
  }
}