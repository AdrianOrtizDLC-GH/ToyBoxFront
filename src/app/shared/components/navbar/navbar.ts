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

  ngOnInit(): void {
    setInterval(() => {
      if (this.isLoggedIn) {
        this.loadUnreadMessages();
      }
    }, 3000);
  }

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

  disconnectSocket(): void {
    this.socketSub?.unsubscribe();
    this.socketSub = null;
  }

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

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  goToCreateProduct(): void {
    this.router.navigate(['/product/create']);
  }

  goToReports(): void {
    this.router.navigate(['/moderator/reports']);
  }

  goToDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  ngOnDestroy(): void {
    this.disconnectSocket();
  }

  menuOpen: boolean = false;

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }
}

