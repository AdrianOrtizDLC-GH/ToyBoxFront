import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalConfirmComponent } from '../../../shared/components/modal-confirm/modal-confirm';
import { ToastComponent, ToastType } from '../../../shared/components/toast/toast';
import { AdminNavigationComponent } from '../../../shared/components/admin-navigation/admin-navigation';
import { UsersService } from '../../../core/services/users.service';
import { User } from '../../../shared/interfaces/user.interface';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb';

interface UserRow {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'moderator' | 'administrator';
  status: 'active' | 'blocked';
  registrationDate: string;
}

/**
 * Admin page component for managing platform users: lists all users with
 * search/status filtering and pagination, and allows blocking/unblocking
 * a user account.
 */
@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [FormsModule, ModalConfirmComponent, ToastComponent, AdminNavigationComponent, PaginationComponent, BreadcrumbComponent],
  templateUrl: './users-management.html',
  styleUrl: './users-management.css'
})
export class UsersManagementComponent implements OnInit {
  users: UserRow[] = [];
  isLoading = true;
  error = '';

  searchTerm = '';
  statusFilter: 'all' | 'active' | 'blocked' = 'all';
  currentPage = 1;
  readonly pageSize = 10;
  // User pending a status change (active/blocked), drives the confirm modal.
  selectedUser: UserRow | null = null;
  toast = { visible: false, type: 'success' as ToastType, title: '', message: '' };

  constructor(
    private readonly usersService: UsersService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  /** Angular lifecycle hook: triggers the initial users fetch. */
  ngOnInit(): void {
    this.loadUsers();
  }

  /** Fetches all users from the backend and maps them into row view models. */
  loadUsers(): void {
    this.isLoading = true;
    this.error = '';

    this.usersService.getAllUsers().subscribe({
      next: response => {
        this.users = response.users.map(user => this.mapUser(user));
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudieron cargar los usuarios. Comprueba tu sesión de administrador.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** Users list filtered by the current search term and status filter. */
  get filteredUsers(): UserRow[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.users.filter(user => {
      const matchesStatus = this.statusFilter === 'all' || user.status === this.statusFilter;
      const matchesTerm = !term ||
        user.username.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);

      return matchesStatus && matchesTerm;
    });
  }

  /** Marks a user as pending a status change, opening the confirmation modal. */
  askStatusChange(user: UserRow): void {
    this.selectedUser = user;
  }

  /** Toggles the selected user's status (active/blocked) and persists it via the backend. */
  confirmStatusChange(): void {
    if (!this.selectedUser) {
      return;
    }

    const selectedUser = this.selectedUser;
    const nextStatus = selectedUser.status === 'active' ? 'blocked' : 'active';

    this.usersService.setStatus(selectedUser.id, nextStatus).subscribe({
      next: updatedUser => {
        const updated = this.mapUser(updatedUser);
        this.users = this.users.map(user => user.id === selectedUser.id ? updated : user);
        this.showToast(
          'success',
          'Usuario actualizado',
          `${selectedUser.username} ahora está ${this.statusLabel(nextStatus).toLowerCase()}.`
        );
        this.selectedUser = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.showToast('error', 'No se pudo actualizar', 'Comprueba tus permisos e inténtalo de nuevo.');
        this.selectedUser = null;
        this.cdr.markForCheck();
      },
    });
  }

  /** Slice of filteredUsers for the current page. */
  get paginatedUsers(): UserRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
  }

  /** Resets pagination to the first page, used when search/filter criteria change. */
  resetPagination(): void {
    this.currentPage = 1;
  }

  changePage(page: number): void {
    this.currentPage = page;
  }

  roleLabel(role: UserRow['role']): string {
    const labels: Record<UserRow['role'], string> = {
      user: 'Usuario',
      moderator: 'Moderador',
      administrator: 'Administrador',
    };
    return labels[role];
  }

  statusLabel(status: UserRow['status']): string {
    return status === 'active' ? 'Activo' : 'Bloqueado';
  }

  /** Maps a backend User entity into the UserRow shape used by the view. */
  private mapUser(user: User): UserRow {
    return {
      id: user.id_users,
      username: user.username,
      email: user.email,
      role: user.role as UserRow['role'],
      status: user.status as UserRow['status'],
      registrationDate: user.registration_date?.slice(0, 10) ?? '-',
    };
  }

  private showToast(type: ToastType, title: string, message: string): void {
    this.toast = { visible: true, type, title, message };
  }
}
