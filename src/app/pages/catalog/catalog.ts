import { ChangeDetectorRef, Component, OnInit } from '@angular/core';

import { ProductCardComponent } from '../../shared/components/product-card/product-card';
import { SearchBarComponent } from '../../shared/components/search-bar/search-bar';
import { FilterSidebarComponent } from '../../shared/components/filter-sidebar/filter-sidebar';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb';

import { ProductsService } from '../../core/services/products.service';
import { CategoriesService } from '../../core/services/categories.service';

import { Category } from '../../shared/interfaces/category.interface';
import { ItemCard, Itemfilters } from '../../shared/interfaces/item.interface';

// View model used by the product card component, decoupled from the raw API item shape.
interface CatalogProduct {
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

// Maps category IDs to their corresponding icon asset paths.
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

// Maps raw item condition values (from backend, in various formats) to display labels.
const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Como nuevo',
  very_good: 'Muy buen estado',
  good: 'Buen estado',
  fair: 'Usado',
  'como nuevo': 'Como nuevo',
  'muy buen estado': 'Muy buen estado',
  'buen estado': 'Buen estado',
  usado: 'Usado',
};

// Maps raw publication/status values (from backend) to display labels shown as badges.
const PUBLICATION_LABELS: Record<string, string> = {
  available: 'Disponible',
  published: 'Publicado',
  sold: 'Vendido',
  paused: 'Pausado',
  deleted: 'Eliminado',
  draft: 'Borrador',
  under_review: 'En revisión',
  removed: 'Retirado',
};

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [
    ProductCardComponent,
    SearchBarComponent,
    FilterSidebarComponent,
    BreadcrumbComponent
  ],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css'
})
/**
 * Page component for browsing and filtering the product catalog.
 * Loads categories and products, applies search/category/filter criteria,
 * and maps raw API items into display-ready view models.
 */
export class CatalogComponent implements OnInit {
  searchTerm = ''; // Current free-text search query
  activeFilters: Itemfilters = {}; // Active filters coming from the filter sidebar

  selectedCategoryId = 0; // 0 means "all categories"

  categories: Category[] = [];
  products: CatalogProduct[] = [];

  isLoading = false;
  error = '';

  constructor(
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private cdr: ChangeDetectorRef
  ) {}

  /** Angular lifecycle hook: loads categories and products on component init. */
  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  /** Fetches all categories and prepends an "All" pseudo-category option. */
  loadCategories(): void {
    this.categoriesService.getAll().subscribe({
      next: (cats: Category[]) => {
        this.categories = [
          {
            id_categories: 0,
            name: 'Todas',
            description: null,
            icon: ''
          },
          ...cats.map(category => ({
            ...category,
            icon: CATEGORY_ICONS[category.id_categories] ?? ''
          })),
        ];

        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando categorías:', err);
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Fetches products applying the current search term, category and filters.
   * Falls back to client-side category filtering as a safety net in case the
   * backend does not filter by category on its own.
   */
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

        this.products = items.map(item => this.toCardProduct(item));

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = 'Error al cargar los productos. Verifica que el servidor esté activo.';
        this.isLoading = false;
        console.error('Error cargando catálogo:', err);
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Builds the filter payload sent to the products API by combining active
   * filters, selected category (under multiple possible key names for
   * backend compatibility) and the search term.
   */
  private buildRequestFilters(): Itemfilters {
    const filters = {
      ...this.activeFilters
    } as Record<string, unknown>;

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

  /**
   * Converts a raw API item into the {@link CatalogProduct} view model,
   * normalizing condition/status fields that may arrive under different
   * property names depending on the backend response shape.
   */
  private toCardProduct(card: ItemCard): CatalogProduct {
    const rawCard = card as any;

    const rawCondition =
      rawCard.conservation_status ??
      rawCard.condition_status ??
      rawCard.condition ??
      rawCard.item_condition ??
      rawCard.conservationStatus ??
      '';

    const rawPublicationStatus =
      rawCard.item_status ??
      rawCard.publication_status ??
      rawCard.publicationStatus ??
      rawCard.badge ??
      '';

    return {
      id: card.id_items,
      title: card.title,
      category: card.category?.name ?? 'Sin categoría',
      categoryId: Number(card.category?.id_categories ?? 0),
      price: Number(card.price),
      location: card.location ?? 'Sin ubicación',
      status: this.getConditionLabel(rawCondition),
      image: card.image || '/assets/images/Iconos%20categorias/icono_educativo.svg',
      badge: this.getPublicationLabel(rawPublicationStatus),
    };
  }

  /**
   * Resolves a human-readable condition label for a raw condition value.
   * @param value Raw condition string from the API.
   * @returns Display label, or the original value if unrecognized.
   */
  private getConditionLabel(value: string): string {
    const key = String(value ?? '').toLowerCase().trim();

    if (!key) return 'Sin estado';

    return CONDITION_LABELS[key] ?? value;
  }

  /**
   * Resolves a human-readable publication status label (used as a badge).
   * @param value Raw publication status string from the API.
   * @returns Display label, or the original value if unrecognized.
   */
  private getPublicationLabel(value: string): string {
    const key = String(value ?? '').toLowerCase().trim();

    if (!key) return 'Disponible';

    return PUBLICATION_LABELS[key] ?? value;
  }

  /**
   * Handles the search bar's search event by updating the search term and
   * reloading products.
   * @param term Free-text search query entered by the user.
   */
  onSearch(term: string): void {
    this.searchTerm = term;
    this.loadProducts();
  }

  /**
   * Handles category selection (from pills or the mobile select) by updating
   * the selected category, syncing it into the active filters under several
   * possible key names, and reloading products.
   * @param categoryIdValue Selected category id (number or string from a select element).
   */
  onCategorySelected(categoryIdValue: number | string): void {
    const categoryId = Number(categoryIdValue);

    this.selectedCategoryId = categoryId;

    const nextFilters = {
      ...this.activeFilters
    } as Record<string, unknown>;

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

  /**
   * Handles filters applied from the filter sidebar, syncing the selected
   * category (resolved by id or by name) and reloading products.
   * @param filters Filter set emitted by the filter sidebar component.
   */
  onFiltersApplied(filters: Itemfilters): void {
    this.activeFilters = filters;

    const filterRecord = filters as Record<string, unknown>;

    const categoryName = String(filterRecord['category'] ?? '');
    const categoryId =
      Number(filterRecord['fk_categories_id'] ?? 0) ||
      Number(filterRecord['categoryId'] ?? 0) ||
      Number(filterRecord['category_id'] ?? 0) ||
      Number(filterRecord['fk_category_id'] ?? 0);

    if (categoryId) {
      this.selectedCategoryId = categoryId;
    } else if (categoryName) {
      const selectedCategory = this.categories.find(
        category => category.name === categoryName
      );

      this.selectedCategoryId = selectedCategory?.id_categories ?? 0;
    } else {
      this.selectedCategoryId = 0;
    }

    this.loadProducts();
  }

  /** Display name of the currently selected category ("Todas" if none). */
  get activeCategoryName(): string {
    const selectedCategory = this.categories.find(
      category => category.id_categories === this.selectedCategoryId
    );

    return selectedCategory?.name ?? 'Todas';
  }
}
