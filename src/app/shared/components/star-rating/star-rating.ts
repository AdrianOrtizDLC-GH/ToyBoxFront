import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable star-rating component that can display a read-only rating (e.g. on
 * product cards or review lists) or act as an interactive input for the user
 * to submit a rating (e.g. when writing a review on the product detail page).
 */
@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './star-rating.html',
  styleUrl: './star-rating.css'
})
export class StarRatingComponent {
  // Current rating value (0-5, supports half-star increments) to display or edit
  @Input() rating: number = 0;
  // Size in pixels of each star icon
  @Input() size: number = 24;
  // Color applied to filled/half-filled stars
  @Input() color: string = '#d84565';
  // Whether the component is display-only (true) or accepts user input (false)
  @Input() readonly: boolean = true;
  // Number of reviews backing this rating, shown alongside the rating value
  @Input() reviewCount: number = 0;
  // Whether to render the review count text next to the rating value
  @Input() showReviewCount: boolean = false;
  // Emits the new rating value when the user selects a star (only when not readonly)
  @Output() ratingChange = new EventEmitter<number>();

  stars = [1, 2, 3, 4, 5];

  /** Rating rounded to the nearest half point, useful for half-star rendering. */
  get roundedRating(): number {
    return Math.round(this.rating * 2) / 2;
  }

  /** Rating formatted as a string with one decimal place, for display purposes. */
  get displayRating(): string {
    return this.rating.toFixed(1);
  }

  /**
   * Determines which icon variant to render for a given star position based on
   * the current rating value.
   * @param star Position of the star in the 1-5 sequence.
   * @returns The Material Symbols icon name: 'star', 'star_half', or 'star_border'.
   */
  getStarIcon(star: number): string {
    if (this.rating >= star) {
      return 'star';
    } else if (this.rating >= star - 0.5) {
      return 'star_half';
    } else {
      return 'star_border';
    }
  }

  /**
   * Updates the rating when the user clicks a star, and emits the change.
   * No-ops when the component is in readonly mode.
   * @param value Star position clicked, used as the new rating value.
   */
  setRating(value: number): void {
    if (!this.readonly) {
      this.rating = value;
      this.ratingChange.emit(value);
    }
  }
}
