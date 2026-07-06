import { Component, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { SocketService } from '../../../core/services/socket.service';
import { UserAvatarComponent } from '../../components/user-avatar/user-avatar';
import { UserRole } from '../../enums/user-role.enum';

/**
 * Main application navigation bar. Rendered once at the top-level shell
 * layout and shown on every page. Displays sign-in/register buttons for
 * anonymous users, or the full navigation menu (catalog, notifications,
 * chat, favorites, profile, moderator/admin links) plus unread badges
 * for authenticated users.
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, UserAvatarComponent],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit, OnDestroy {

  isLoggedIn: boolean = false;
  userAvatar: string = '';
  userRole: UserRole | null = null;

  isModerator: boolean = false;
  isAdministrator: boolean = false;

  unreadMessagesCount: number = 0;

  private socketSub: Subscription | null = null;

  constructor(
    private router: Router,
    private chatService: ChatService,
    public authService: AuthService,
    public notificationsService: NotificationsService,
    private socketService: SocketService
  ) {
    effect(() => {
      const user = this.authService.currentUser();
      this.isLoggedIn = !!user;
      this.userAvatar = user?.profile_picture || '';
      this.userRole = user?.role ?? null;
      this.isModerator = this.userRole === UserRole.Moderator;
      this.isAdministrator = this.userRole === UserRole.Administrator;

      if (this.isLoggedIn) {
        this.loadUnreadMessages();
        this.notificationsService.refreshUnreadCount();
        this.connectSocket();
      } else {
        this.unreadMessagesCount = 0;
        this.disconnectSocket();
      }
    });
  }

  /**
   * Starts a polling interval that periodically refreshes the unread
   * messages count while the user is logged in.
   */
  ngOnInit(): void {
    setInterval(() => {
      if (this.isLoggedIn) {
        this.loadUnreadMessages();
      }
    }, 3000);
  }

  /**
   * Opens the real-time socket connection and subscribes to new message
   * events so the unread messages count stays up to date live.
   */
  connectSocket(): void {
    this.socketService.connect();

    this.socketSub = this.socketService.onNewMessage().subscribe(() => {
      this.loadUnreadMessages();
    });

    this.socketSub.add(
      this.socketService.onEvent<any>('new_message_notification').subscribe(() => {
        this.loadUnreadMessages();
      })
    );
  }

  /**
   * Unsubscribes from the chat socket and clears the subscription,
   * called on logout and component destruction.
   */
  disconnectSocket(): void {
    this.socketSub?.unsubscribe();
    this.socketSub = null;
  }

  /**
   * Fetches the current user's chats and recomputes the total unread
   * messages count shown as a badge in the navbar.
   */
  loadUnreadMessages(): void {
    this.chatService.getMyChats().subscribe({
      next: (chats) => {
        this.unreadMessagesCount = chats.reduce((total, chat: any) => total + (chat.unread_count || chat.unreadCount || 0), 0);
      },
      error: (err) => {
        console.error('Error cargando chats para contador:', err);
      }
    });
  }

  /**
   * Navigates to the login page.
   */
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  /**
   * Navigates to the registration page.
   */
  goToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  /**
   * Navigates to the create-product page.
   */
  goToCreateProduct(): void {
    this.router.navigate(['/product/create']);
  }

  /**
   * Navigates to the moderator reports page.
   */
  goToReports(): void {
    this.router.navigate(['/moderator/reports']);
  }

  /**
   * Navigates to the admin dashboard page.
   */
  goToDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  /**
   * Cleans up the socket subscription when the component is destroyed.
   */
  ngOnDestroy(): void {
    this.disconnectSocket();
  }

  // Whether the mobile/collapsible navigation menu is currently expanded.
  menuOpen: boolean = false;

  /**
   * Toggles the mobile navigation menu open/closed state.
   */
  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  /**
   * Closes the mobile navigation menu (e.g. after a nav item is clicked).
   */
  closeMenu(): void {
    this.menuOpen = false;
  }
}

