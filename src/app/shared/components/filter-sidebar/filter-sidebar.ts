import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Category } from '../../interfaces/category.interface';
import { Itemfilters } from '../../interfaces/item.interface';

interface ProductStateOption {
  label: string;
  value: string;
}

interface LocationOption {
  label: string;
  value: string;
}

/**
 * Reusable sidebar for filtering item/product listings by category, max price,
 * location, and conservation status. Meant to be used alongside catalog/listing
 * pages; emits the selected filters so the parent can re-query/filter the results.
 */
@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [],
  templateUrl: './filter-sidebar.html',
  styleUrl: './filter-sidebar.css'
})
export class FilterSidebarComponent {
  // List of categories to populate the category filter dropdown.
  @Input() categories: Category[] = [];
  // ID of the category that should be pre-selected in the dropdown.
  @Input() selectedCategoryId = 0;

  // Emits the collected filter values whenever the user applies or clears the filters.
  @Output() filtersApplied = new EventEmitter<Itemfilters>();

  errorMessage = '';

  productStates: ProductStateOption[] = [
    { label: 'Como nuevo', value: 'excellent' },
    { label: 'Muy buen estado', value: 'very_good' },
    { label: 'Buen estado', value: 'good' },
    { label: 'Usado', value: 'fair' }
  ];

  locations: LocationOption[] = [
    { label: 'Andalucía', value: 'andalucia' },
    { label: 'Aragón', value: 'aragon' },
    { label: 'Asturias', value: 'asturias' },
    { label: 'Islas Baleares', value: 'baleares' },
    { label: 'Canarias', value: 'canarias' },
    { label: 'Cantabria', value: 'cantabria' },
    { label: 'Castilla-La Mancha', value: 'castilla_la_mancha' },
    { label: 'Castilla y León', value: 'castilla_y_leon' },
    { label: 'Cataluña', value: 'cataluna' },
    { label: 'Ceuta', value: 'ceuta' },
    { label: 'Extremadura', value: 'extremadura' },
    { label: 'Galicia', value: 'galicia' },
    { label: 'Madrid', value: 'madrid' },
    { label: 'Melilla', value: 'melilla' },
    { label: 'Región de Murcia', value: 'murcia' },
    { label: 'Navarra', value: 'navarra' },
    { label: 'País Vasco', value: 'pais_vasco' },
    { label: 'La Rioja', value: 'la_rioja' },
    { label: 'Comunidad Valenciana', value: 'valencia' },
  ];

  /**
   * Reads the raw form field values, validates/normalizes them, resolves the
   * selected category, and emits the resulting filter object via filtersApplied.
   * @param categoryIdValue raw value from the category select (numeric id as string).
   * @param maxPriceValue raw value from the max price input.
   * @param locationValue raw value from the location select.
   * @param statusValue raw value from the conservation status select.
   */
  onApplyFilters(
    categoryIdValue: string,
    maxPriceValue: string,
    locationValue: string,
    statusValue: string
  ): void {
    this.errorMessage = '';

    const categoryId = Number(categoryIdValue);
    const maxPrice = maxPriceValue.trim();
    const location = locationValue.trim();
    const status = statusValue.trim();

    const filters: Itemfilters = {};

    if (categoryId && categoryId !== 0) {
      const selectedCategory = this.categories.find(c => c.id_categories === categoryId);
      if (selectedCategory) {
        filters.category = selectedCategory.name;
        (filters as any).categoryId = categoryId;
      }
    }

    if (maxPrice) filters.maxPrice = maxPrice;
    if (location) filters.location = location;
    if (status) (filters as any).conservation_status = status;

    this.filtersApplied.emit(filters);
  }

  /**
   * Resets any error state and emits an empty filters object, effectively
   * clearing all active filters for the parent listing view.
   */
  onClearFilters(): void {
    this.errorMessage = '';
    this.filtersApplied.emit({});
  }
}