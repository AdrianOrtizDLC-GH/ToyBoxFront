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

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [],
  templateUrl: './filter-sidebar.html',
  styleUrl: './filter-sidebar.css'
})
export class FilterSidebarComponent {
  @Input() categories: Category[] = [];
  @Input() selectedCategoryId = 0;

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

  onClearFilters(): void {
    this.errorMessage = '';
    this.filtersApplied.emit({});
  }
}