import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Reusable pagination control that renders page number buttons plus
 * previous/next navigation. Used in list/catalog views (e.g. product
 * catalog, search results, admin tables) to let the parent component
 * drive page changes via the `pageChange` output while keeping the
 * current page and total pages as inputs.
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  templateUrl: './pagination.html',
  styleUrl: './pagination.css'
})
export class PaginationComponent {

  // Currently active page number (1-based).
  @Input() currentPage = 1;
  // Total number of available pages.
  @Input() totalPages = 1;
  // Emitted with the newly selected page number whenever the user navigates.
  @Output() pageChange = new EventEmitter<number>();

  /**
   * Builds the list of page numbers to render as buttons.
   * @returns an array [1, 2, ..., totalPages].
   */
  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  /**
   * Emits the previous page number if not already on the first page.
   */
  previous(): void {
    if (this.currentPage > 1) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  /**
   * Emits the next page number if not already on the last page.
   */
  next(): void {
    if (this.currentPage < this.totalPages) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }

  /**
   * Emits the given page number if it differs from the current page.
   * @param page target page number to navigate to.
   */
  goTo(page: number): void {
    if (page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

}