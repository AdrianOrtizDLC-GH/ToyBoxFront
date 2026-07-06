import { Component, Input } from '@angular/core';

/**
 * Small reusable badge used to visually flag a product/listing status (e.g.
 * available, reserved, sold, new, used, featured). Intended to be reused
 * anywhere a compact status indicator is needed, such as product cards,
 * listings, or detail pages.
 */
@Component({
  selector: 'app-status-badge',
  standalone: true,
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.css'
})
export class StatusBadgeComponent {

  // Status value that determines the badge's color/style via badgeClass
  @Input() status:
    'available'
    | 'reserved'
    | 'sold'
    | 'new'
    | 'used'
    | 'featured'
    = 'available';

  // Optional custom text to display instead of the raw status value
  @Input() label = '';

  /** CSS class string combining the base badge class with the current status modifier. */
  get badgeClass(): string {

    return `badge ${this.status}`;

  }

}