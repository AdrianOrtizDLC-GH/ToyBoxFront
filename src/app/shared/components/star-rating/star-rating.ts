import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './star-rating.html',
  styleUrl: './star-rating.css'
})
export class StarRatingComponent {
  @Input() rating: number = 0;
  @Input() size: number = 24;
  @Input() color: string = '#d84565';
  @Input() readonly: boolean = true;
  @Input() reviewCount: number = 0;
  @Input() showReviewCount: boolean = false; 
  @Output() ratingChange = new EventEmitter<number>();

  stars = [1, 2, 3, 4, 5];

  get roundedRating(): number {
    return Math.round(this.rating * 2) / 2;
  }

  get displayRating(): string {
    return this.rating.toFixed(1);
  }

  getStarIcon(star: number): string {
    if (this.rating >= star) {
      return 'star';
    } else if (this.rating >= star - 0.5) {
      return 'star_half';
    } else {
      return 'star_border';
    }
  }

  setRating(value: number): void {
    if (!this.readonly) {
      this.rating = value;
      this.ratingChange.emit(value);
    }
  }
}
