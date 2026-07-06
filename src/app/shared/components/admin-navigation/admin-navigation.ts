import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../enums/user-role.enum';

/**
 * Reusable navigation menu for admin and moderator sections.
 * Displays links to admin-only pages (dashboard, users, categories) conditionally
 * based on the current user's role, plus a moderator link visible to all allowed users.
 * Intended to be reused inside admin/moderator layout shells across the app.
 */
@Component({
  selector: 'app-admin-navigation',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-navigation.html',
  styleUrl: './admin-navigation.css',
})
export class AdminNavigationComponent {
  private readonly authService = inject(AuthService);

  // Computed flag that is true when the currently authenticated user has the Administrator role.
  // Used in the template to conditionally reveal admin-only navigation links.
  readonly isAdministrator = computed(
    () => this.authService.currentUser()?.role === UserRole.Administrator
  );
}
