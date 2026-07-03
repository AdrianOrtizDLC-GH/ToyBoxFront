import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  ViewChild, ElementRef, NgZone, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { ChatItem } from '../../../shared/interfaces/chat.interface';
import { ChatMessageWithSender } from '../../../shared/interfaces/message.interface';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb';
import { ChatBubbleComponent } from '../../../shared/components/chat-bubble/chat-bubble';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { SocketService } from '../../../core/services/socket.service';

@Component({
  selector: 'app-chat-detail',
  standalone: true,
  imports: [CommonModule, BreadcrumbComponent, ChatBubbleComponent],
  templateUrl: './chat-detail.html',
  styleUrls: ['./chat-detail.css']
})
export class ChatDetail implements OnInit, AfterViewChecked, OnDestroy {

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  selectedConversationId: number | null = null;
  newMessage: string = '';
  currentUserId: number | null = null;
  breadcrumbItems: any[] = [];
  conversations: ChatItem[] = [];
  messages: ChatMessageWithSender[] = [];

  private conversationsLoaded$ = new Subject<void>();
  private socketSub: Subscription | null = null;

  get selectedConversation(): ChatItem | undefined {
    return this.conversations.find(c => c.id_conversations === this.selectedConversationId);
  }

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private chatService: ChatService,
    private socketService: SocketService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUserId = this.authService.currentUser()?.id_users ?? null;
  }

  private initializeBreadcrumbs(): void {
    const isLoggedIn = this.authService.isLoggedIn();
    const homeRoute = isLoggedIn ? '/catalog' : '/home';
    this.breadcrumbItems = [
      { label: 'Inicio', route: homeRoute, icon: 'home' },
      { label: 'Buzón', route: '/chat', icon: 'inbox' }
    ];
  }

  ngOnInit(): void {
    this.socketService.connect();

    this.socketSub = this.socketService.onNewMessage<ChatMessageWithSender>().subscribe((msg) => {
      this.ngZone.run(() => {
        if (
          msg.fk_conversations_id === this.selectedConversationId &&
          !this.messages.some(m => m.id_messages === msg.id_messages)
        ) {
          this.messages.push(msg);
          // Marcar como leído automáticamente al recibir el mensaje si estamos en esa conversación
          if (this.selectedConversationId) {
            this.chatService.markAsRead(this.selectedConversationId).subscribe({
              next: () => this.loadConversations(),
              error: (err) => console.error('Error marcando como leído:', err)
            });
          }
          this.cdr.detectChanges();
        }
      });
    });

    this.loadConversations();
    this.initializeBreadcrumbs();

    this.conversationsLoaded$.subscribe(() => {
      this.route.params.subscribe(params => {
        if (params['id']) {
          const chatId = +params['id'];
          this.selectConversation(chatId);
          this.chatService.markAsRead(chatId).subscribe({
            next: () => this.loadConversations(),
            error: (err) => console.error('Error marcando como leído:', err)
          });
        }
      });
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    if (this.selectedConversationId !== null) {
      this.socketService.leaveConversation(this.selectedConversationId);
    }
    this.socketSub?.unsubscribe();
    this.socketService.disconnect();
  }

  selectConversation(id: number): void {
    if (this.selectedConversationId !== null) {
      this.socketService.leaveConversation(this.selectedConversationId);
    }

    this.selectedConversationId = id;
    this.socketService.joinConversation(id);
    this.loadMessages(id);
    this.loadConversationData(id);

    // Marcar como leído al seleccionar conversación y recargar lista
    this.chatService.markAsRead(id).subscribe({
      next: () => this.loadConversations(),
      error: (err) => console.error('Error marcando como leído:', err)
    });

    const conv = this.selectedConversation;
    if (conv) {
      const isLoggedIn = this.authService.isLoggedIn();
      const homeRoute = isLoggedIn ? '/catalog' : '/home';
      this.breadcrumbItems = [
        { label: 'Inicio', route: homeRoute, icon: 'home' },
        { label: 'Buzón', route: '/chat', icon: 'inbox' },
        { label: `Conversación con ${conv.otherUserName}`, icon: 'chat' }
      ];
      this.cdr.detectChanges();
    }
  }

  loadConversations(): void {
    this.chatService.getMyChats().subscribe({
      next: (chats: any[]) => {
        this.conversations = chats.map(chat => {
          const currentUserId = this.authService.currentUser()?.id_users;
          const isMe_Seller = chat.fk_seller_id === currentUserId;
          const otherUserName = isMe_Seller ? chat.buyer_username : chat.seller_username;
          return {
            id_conversations: chat.id_conversations,
            otherUserName: otherUserName ?? 'Usuario',
            otherUserImage: '',
            itemTitle: chat.item_title ?? 'Producto',
            itemImage: chat.item_photo ?? '',
            lastMessage: chat.last_message ?? '',
            lastMessageAt: chat.created_at ?? '',
            unreadCount: chat.unread_count ?? 0
          };
        });
        this.cdr.detectChanges();
        this.conversationsLoaded$.next();
      },
      error: (err) => {
        console.error('Error cargando conversaciones:', err);
        this.conversations = [];
        this.conversationsLoaded$.next();
      }
    });
  }

  loadMessages(conversationId: number): void {
    this.chatService.getMessages(conversationId).subscribe({
      next: (messages) => {
        this.messages = messages as ChatMessageWithSender[];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando mensajes:', err);
        this.messages = [];
      }
    });
  }

  private loadConversationData(conversationId: number): void {
    this.chatService.getChatById(conversationId).subscribe({
      next: (chat: any) => console.log('Conversación cargada:', chat),
      error: (err: any) => console.error('Error cargando conversación:', err)
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedConversationId) return;

    const messageContent = this.newMessage.trim();
    this.newMessage = '';

    this.chatService.sendMessage(this.selectedConversationId, messageContent).subscribe({
      next: () => { },
      error: (err) => {
        console.error('Error enviando mensaje:', err);
        this.newMessage = messageContent;
      }
    });
  }

  scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop =
        this.messagesContainer.nativeElement.scrollHeight;
    } catch (e) { }
  }
}