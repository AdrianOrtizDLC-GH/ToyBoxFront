import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ProductCardComponent } from '../../shared/components/product-card/product-card';
import { SearchBarComponent } from '../../shared/components/search-bar/search-bar';
import { FilterSidebarComponent } from '../../shared/components/filter-sidebar/filter-sidebar';
import { ProductsService } from '../../core/services/products.service';
import { CategoriesService } from '../../core/services/categories.service';
import { Category } from '../../shared/interfaces/category.interface';
import { ItemCard, Itemfilters } from '../../shared/interfaces/item.interface';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb';

interface HomeProduct {
  id: number;
  title: string;
  category: string;
  categoryId: number;
  price: number;
  location: string;
  status: string;
  image: string;
  badge: string;
}

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

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Como nuevo',
  very_good: 'Muy buen estado',
  good: 'Buen estado',
  fair: 'Usado',
};

const BADGE_LABELS: Record<string, string> = {
  available: 'Disponible',
  sold: 'Vendido',
  paused: 'Pausado',
  deleted: 'Eliminado',
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ProductCardComponent, SearchBarComponent, FilterSidebarComponent, BreadcrumbComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit {
  searchTerm = '';
  activeFilters: Itemfilters = {};
  selectedCategoryId = 0;
  categories: Category[] = [];
  products: HomeProduct[] = [];
  isLoading = false;
  error = '';

  constructor(
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  loadCategories(): void {
    this.categoriesService.getAll().subscribe({
      next: (cats: Category[]) => {
        this.categories = [
          { id_categories: 0, name: 'Todas', description: null, icon: '' },
          ...cats.map(c => ({ ...c, icon: CATEGORY_ICONS[c.id_categories] ?? '' })),
        ];
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando categorías:', err);
        this.cdr.markForCheck();
      },
    });
  }

  loadProducts(): void {
    this.isLoading = true;
    this.error = '';

    const filters = this.buildRequestFilters();

    this.productsService.getAll(filters).subscribe({
      next: (res) => {
        let items = res.items;
        if (this.selectedCategoryId !== 0) {
          items = items.filter(item =>
            Number(item.category?.id_categories) === this.selectedCategoryId
          );
        }
        this.products = items.map(this.toCardProduct);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = 'Error al cargar los productos. Verifica que el servidor esté activo.';
        this.isLoading = false;
        console.error('Error cargando productos:', err);
        this.cdr.markForCheck();
      },
    });
  }

  private buildRequestFilters(): Itemfilters {
    const filters = { ...this.activeFilters } as Record<string, unknown>;
    delete filters['category'];

    if (this.selectedCategoryId !== 0) {
      filters['fk_categories_id'] = this.selectedCategoryId;
      filters['categoryId'] = this.selectedCategoryId;
      filters['category_id'] = this.selectedCategoryId;
      filters['fk_category_id'] = this.selectedCategoryId;
    }

    if (this.searchTerm.trim()) {
      filters['search'] = this.searchTerm.trim();
    }

    return filters as Itemfilters;
  }

  private toCardProduct(card: ItemCard): HomeProduct {
    return {
      id: card.id_items,
      title: card.title,
      category: card.category?.name ?? 'Sin categoría',
      categoryId: Number(card.category?.id_categories ?? 0),
      price: card.price,
      location: card.location,
      status: CONDITION_LABELS[card.conservation_status] ?? card.conservation_status,
      image: card.image || '/assets/images/Iconos%20categorias/icono_educativo.svg',
      badge: BADGE_LABELS[card.item_status] ?? card.item_status,
    };
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.loadProducts();
  }

  onCategorySelected(categoryIdValue: number | string): void {
    const categoryId = Number(categoryIdValue);
    this.selectedCategoryId = categoryId;

    const nextFilters = { ...this.activeFilters } as Record<string, unknown>;
    delete nextFilters['category'];
    delete nextFilters['fk_categories_id'];
    delete nextFilters['categoryId'];
    delete nextFilters['category_id'];
    delete nextFilters['fk_category_id'];

    if (categoryId !== 0) {
      nextFilters['fk_categories_id'] = categoryId;
      nextFilters['categoryId'] = categoryId;
      nextFilters['category_id'] = categoryId;
      nextFilters['fk_category_id'] = categoryId;
    }

    this.activeFilters = nextFilters as Itemfilters;
    this.loadProducts();
  }

  onFiltersApplied(filters: Itemfilters): void {
    this.activeFilters = filters;

    const filterRecord = filters as Record<string, unknown>;
    const categoryId =
      Number(filterRecord['fk_categories_id'] ?? 0) ||
      Number(filterRecord['categoryId'] ?? 0) ||
      Number(filterRecord['category_id'] ?? 0) ||
      Number(filterRecord['fk_category_id'] ?? 0);

    if (categoryId) {
      this.selectedCategoryId = categoryId;
    } else {
      this.selectedCategoryId = 0;
    }

    this.loadProducts();
  }

  get activeCategoryName(): string {
    return this.categories.find(c => c.id_categories === this.selectedCategoryId)?.name ?? 'Todas';
  }
}