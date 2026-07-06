import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Generic, reusable placeholder component shown when a list or view has no
 * content to display (e.g. empty catalog, no favorites, no messages).
 * Renders an icon, title, message, and an optional call-to-action button/link,
 * all configurable via inputs so it can be reused across different empty-list scenarios.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css'
})
export class EmptyStateComponent {

  // Emoji or icon character displayed at the top of the empty state.
  @Input() icon = '🧸';
  // Main heading text describing the empty state.
  @Input() title = 'Nada por aquí';
  // Descriptive message providing more context about why there is no content.
  @Input() message =
    'Todavía no hay contenido disponible.';
  // Label for the optional call-to-action button; when empty, no button is rendered.
  @Input() buttonText = '';
  // RouterLink destination the call-to-action button navigates to.
  @Input() buttonLink = '/';

}