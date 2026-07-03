import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProductsService } from '../../core/services/products.service';
import { CategoriesService } from '../../core/services/categories.service';
import { ItemCard } from '../../shared/interfaces/item.interface';
import { Category } from '../../shared/interfaces/category.interface';

// Shape local que usa el template (track cat.id, product.photo_url)
interface LocalProduct {
  id: number;
  title: string;
  price: number;
  description: string | null;
  photo_url: string;
  isFavorite?: boolean;
}

interface LocalCategory {
  id: number;
  name: string;
  icon: string;
}

interface Filters {
  category: string;
  location: string;
  minPrice: number;
  maxPrice: number;
  condition: string;
  sortBy: string;
}

const CATEGORY_ICONS: Record<number, string> = {
  1: 'assets/images/Iconos categorias/icono_munecosycoches.svg',
  2: 'assets/images/Iconos categorias/icono_construccion.svg',
  3: 'assets/images/Iconos categorias/icono_juegosmesa.svg',
  4: 'assets/images/Iconos categorias/icono_educativo.svg',
  5: 'assets/images/Iconos categorias/icono_bebes.svg',
  6: 'assets/images/Iconos categorias/icono_airelibre.svg',
  7: 'assets/images/Iconos categorias/icono_imaginacion.svg',
  8: 'assets/images/Iconos categorias/icono_videojuegos.svg',
};

// Todas las comunidades autónomas de España
export const SPAIN_LOCATIONS = [
  { value: 'andalucia', label: 'Andalucía' },
  { value: 'aragon', label: 'Aragón' },
  { value: 'asturias', label: 'Asturias' },
  { value: 'baleares', label: 'Islas Baleares' },
  { value: 'canarias', label: 'Canarias' },
  { value: 'cantabria', label: 'Cantabria' },
  { value: 'castilla_la_mancha', label: 'Castilla-La Mancha' },
  { value: 'castilla_y_leon', label: 'Castilla y León' },
  { value: 'cataluna', label: 'Cataluña' },
  { value: 'ceuta', label: 'Ceuta' },
  { value: 'extremadura', label: 'Extremadura' },
  { value: 'galicia', label: 'Galicia' },
  { value: 'madrid', label: 'Madrid' },
  { value: 'melilla', label: 'Melilla' },
  { value: 'murcia', label: 'Región de Murcia' },
  { value: 'navarra', label: 'Navarra' },
  { value: 'pais_vasco', label: 'País Vasco' },
  { value: 'la_rioja', label: 'La Rioja' },
  { value: 'valencia', label: 'Comunidad Valenciana' },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit {

  searchQuery = '';
  showFilters = false;
  selectedCategory: number | null = null;
  currentPage = 1;
  hasNextPage = false;
  pageSize = 12;

  isSearching = false; // true cuando hay texto en el buscador -> oculta "Últimos" y muestra solo resultados

  locations = SPAIN_LOCATIONS;

  filters: Filters = {
    category: '',
    location: '',
    minPrice: 0,
    maxPrice: 1000,
    condition: '',
    sortBy: 'date_desc'
  };

  categories: LocalCategory[] = [];
  featuredProduct: LocalProduct | null = null;
  latestProducts: LocalProduct[] = [];
  relatedProducts: LocalProduct[] = [];

  private searchSubject = new Subject<string>();

  constructor(
    private router: Router,
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();

    // Búsqueda en tiempo real con debounce de 400ms
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadProducts();
    });
  }

  loadCategories(): void {
    this.categoriesService.getAll().subscribe({
      next: (cats: Category[]) => {
        this.categories = cats.map(c => ({
          id: c.id_categories,
          name: c.name,
          icon: CATEGORY_ICONS[c.id_categories] ?? 'assets/images/Iconos categorias/icono_educativo.svg',
        }));
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando categorías:', err);
        this.cdr.markForCheck();
      },
    });
  }

  /** Una sola llamada a /products con todos los filtros aplicados */
  loadProducts(): void {
    const params: any = { limit: this.pageSize, page: this.currentPage };

    if (this.selectedCategory) params.categoryId = this.selectedCategory;
    if (this.searchQuery.trim()) params.search = this.searchQuery.trim();
    if (this.filters.location) params.location = this.filters.location;
    if (this.filters.minPrice > 0) params.minPrice = this.filters.minPrice;
    if (this.filters.maxPrice < 1000) params.maxPrice = this.filters.maxPrice;
    if (this.filters.condition) params.conservation_status = this.filters.condition;
    if (this.filters.sortBy) params.sortBy = this.filters.sortBy;

    this.productsService.getAll(params).subscribe({
      next: (res) => {
        this.relatedProducts = res.items.map(this.toLocalProduct);
        this.latestProducts = this.relatedProducts.slice(0, 6);
        this.featuredProduct = this.latestProducts[0] ?? null;
        this.hasNextPage = this.currentPage < res.totalPages;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando productos:', err);
        this.cdr.markForCheck();
      },
    });
  }

  private toLocalProduct(card: ItemCard): LocalProduct {
    return {
      id: card.id_items,
      title: card.title,
      price: card.price,
      description: null,
      photo_url: card.image,
    };
  }

  /** Se llama en cada pulsación de tecla del input de búsqueda */
  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.isSearching = value.trim().length > 0;
    this.searchSubject.next(value);
  }

  /** Mantiene el comportamiento del botón de lupa / Enter, igual que la búsqueda en tiempo real */
  onSearch(): void {
    this.isSearching = this.searchQuery.trim().length > 0;
    this.currentPage = 1;
    this.loadProducts();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  /** Se llama al aplicar los filtros del panel (botón "Aplicar" o al cambiar cualquier select/range) */
  applyFilters(): void {
    this.currentPage = 1;
    this.loadProducts();
  }

  selectCategory(categoryId: number): void {
    this.selectedCategory = this.selectedCategory === categoryId ? null : categoryId;
    this.currentPage = 1;
    this.loadProducts();
  }

  toggleFavorite(product: LocalProduct): void {
    product.isFavorite = !product.isFavorite;
  }

  goToProduct(productId: number): void {
    this.router.navigate(['/product', productId]);
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadProducts();
    }
  }

  nextPage(): void {
    if (this.hasNextPage) {
      this.currentPage++;
      this.loadProducts();
    }
  }
}