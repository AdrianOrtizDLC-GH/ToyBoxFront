import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Global site footer, reused across the app's main layout.
 * Shows brand/social links, navigation columns (which adapt based on
 * authentication state), help links, and a copyright notice with the current year.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.css']
})
export class FooterComponent {
  // Current calendar year, used to keep the copyright notice up to date automatically.
  currentYear: number = new Date().getFullYear();
  // Tracks whether a user is currently authenticated, used in the template to show/hide account-related links.
  isLoggedIn: boolean = false;

  constructor(private authService: AuthService) {
    // Reactively syncs isLoggedIn with the current authenticated user state from AuthService.
    effect(() => {
      this.isLoggedIn = !!this.authService.currentUser();
    });
  }
}