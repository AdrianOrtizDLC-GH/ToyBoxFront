import { ChangeDetectorRef, Component, OnInit } from '@angular/core';

import { ProductCardComponent } from '../../shared/components/product-card/product-card';
import { SearchBarComponent } from '../../shared/components/search-bar/search-bar';
import { FilterSidebarComponent } from '../../shared/components/filter-sidebar/filter-sidebar';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb';

import { ProductsService } from '../../core/services/products.service';
import { CategoriesService } from '../../core/services/categories.service';

import { Category } from '../../shared/interfaces/category.interface';
import { ItemCard, Itemfilters } from '../../shared/interfaces/item.interface';

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
  'como nuevo': 'Como nuevo',
  'muy buen estado': 'Muy buen estado',
  'buen estado': 'Buen estado',
  usado: 'Usado',
};

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
export class CatalogComponent implements OnInit {
  searchTerm = '';
  activeFilters: Itemfilters = {};

  selectedCategoryId = 0;

  categories: Category[] = [];
  products: CatalogProduct[] = [];

  isLoading = false;
  error = '';

  constructor(
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

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

  private getConditionLabel(value: string): string {
    const key = String(value ?? '').toLowerCase().trim();

    if (!key) return 'Sin estado';

    return CONDITION_LABELS[key] ?? value;
  }

  private getPublicationLabel(value: string): string {
    const key = String(value ?? '').toLowerCase().trim();

    if (!key) return 'Disponible';

    return PUBLICATION_LABELS[key] ?? value;
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.loadProducts();
  }

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

  get activeCategoryName(): string {
    const selectedCategory = this.categories.find(
      category => category.id_categories === this.selectedCategoryId
    );

    return selectedCategory?.name ?? 'Todas';
  }
}
