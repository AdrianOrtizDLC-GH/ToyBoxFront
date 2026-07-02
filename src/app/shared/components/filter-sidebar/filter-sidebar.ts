import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Category } from '../../interfaces/category.interface';
import { Itemfilters } from '../../interfaces/item.interface';

interface ProductStateOption {
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

    if (!categoryId || !maxPrice || !location || !status) {
      this.errorMessage = 'Completa todos los campos obligatorios para aplicar los filtros.';
      return;
    }

    const selectedCategory = this.categories.find(
      category => category.id_categories === categoryId
    );

    if (!selectedCategory) {
      this.errorMessage = 'Selecciona una categoría válida.';
      return;
    }

    this.filtersApplied.emit({
      category: selectedCategory.name,
      maxPrice,
      location,
      status
    } as Itemfilters);
  }

  onClearFilters(): void {
    this.errorMessage = '';
    this.filtersApplied.emit({});
  }
}