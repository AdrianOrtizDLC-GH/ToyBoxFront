import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../enums/user-role.enum';

@Component({
  selector: 'app-admin-navigation',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-navigation.html',
  styleUrl: './admin-navigation.css',
})
export class AdminNavigationComponent {
  private readonly authService = inject(AuthService);

  readonly isAdministrator = computed(
    () => this.authService.currentUser()?.role === UserRole.Administrator
  );
}
