import { Component, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * 404 "page not found" component. Purely static; shows an image
 * that links back to the home page. View encapsulation is disabled
 * so its styles can apply globally.
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
  encapsulation: ViewEncapsulation.None
})
export class NotFoundComponent {}