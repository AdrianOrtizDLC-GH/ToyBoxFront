import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Reusable search bar component, meant to be embedded in pages such as the
 * catalog or home screen wherever a text-based search input with a labeled
 * button is needed. Purely presentational: it emits the trimmed search term
 * and leaves the actual search/filtering logic to the parent component.
 */
@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.css'
})
export class SearchBarComponent {
  // Label text displayed above the search input
  @Input() label = '¿Qué estás buscando?';
  // Placeholder text shown inside the empty search input
  @Input() placeholder = 'Buscar...';
  // Text displayed on the search button
  @Input() buttonText = 'Buscar';

  // Emits the trimmed search term when the user submits the search (Enter key or button click)
  @Output() search = new EventEmitter<string>();

  /**
   * Trims the given input value and emits it via the `search` output.
   * @param value Raw text currently typed in the search input.
   */
  onSearch(value: string): void {
    this.search.emit(value.trim());
  }
}