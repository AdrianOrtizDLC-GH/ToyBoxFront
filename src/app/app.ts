import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar';
import { FooterComponent } from './shared/components/footer/footer';

/**
 * Root component of the application.
 * Hosts the persistent navbar and footer, and renders the currently
 * matched route inside the RouterOutlet. This is the single standalone
 * component bootstrapped by main.ts / main.server.ts.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  // Application title, currently unused in the template but kept for reference.
  title = 'Toybox';
}