import { Component, Input } from '@angular/core';

/**
 * Reusable loading indicator component that shows a spinning animation
 * with an optional message. Used throughout the app wherever content is
 * being fetched asynchronously (e.g. product lists, order status, forms).
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  templateUrl: './loading-spinner.html',
  styleUrl: './loading-spinner.css'
})
export class LoadingSpinnerComponent {

  // Message displayed next to the spinner (e.g. "Loading...").
  @Input() text = 'Cargando...';

}