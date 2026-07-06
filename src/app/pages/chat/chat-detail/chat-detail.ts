import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  ViewChild, ElementRef, NgZone, ChangeDetectorRef, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
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
/**
 * Page component for a single chat conversation view (buyer/seller messaging).
 * Loads the user's conversations, selects one based on the route param,
 * joins its real-time socket room, and handles sending/receiving messages
 * as well as marking messages as read.
 */
export class ChatDetail implements OnInit, AfterViewChecked, OnDestroy {

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  selectedConversationId: number | null = null; // Currently open conversation, null if none selected
  newMessage: string = ''; // Bound to the message input field
  currentUserId: number | null = null; // Resolved reactively from AuthService (see effect below)
  breadcrumbItems: any[] = [];
  conversations: ChatItem[] = []; // List of the user's conversations (for the sidebar)
  messages: ChatMessageWithSender[] = []; // Messages of the currently selected conversation

  // Emits once conversations have finished loading, used to defer route param handling until then
  private conversationsLoaded$ = new Subject<void>();
  private socketSub: Subscription | null = null; // Subscription to incoming real-time messages
  private routeParamsSub: Subscription | null = null;

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
    // Reactivo: si el usuario aún no había cargado al construir el componente,
    // esto se actualiza en cuanto el signal del AuthService tenga valor.
    effect(() => {
      this.currentUserId = this.authService.currentUser()?.id_users ?? null;
    });
  }

  /** Builds the breadcrumb trail, adapting the home route based on login state. */
  private initializeBreadcrumbs(): void {
    const isLoggedIn = this.authService.isLoggedIn();
    const homeRoute = isLoggedIn ? '/catalog' : '/home';
    this.breadcrumbItems = [
      { label: 'Inicio', route: homeRoute, icon: 'home' },
      { label: 'Buzón', route: '/chat', icon: 'inbox' }
    ];
  }

  /**
   * Angular lifecycle hook. Establishes the socket connection, subscribes to
   * incoming real-time messages (appending them to the open conversation and
   * marking them as read), loads conversations, and wires up route params so
   * navigating to /chat/:id selects the right conversation once conversations
   * have loaded.
   */
  ngOnInit(): void {
    this.socketService.connect();

    // Real-time message handler: runs inside NgZone since socket callbacks
    // execute outside Angular's zone by default and would not trigger change detection.
    this.socketSub = this.socketService.onNewMessage<ChatMessageWithSender>().subscribe((msg) => {
      this.ngZone.run(() => {
        if (
          msg.fk_conversations_id === this.selectedConversationId &&
          !this.messages.some(m => m.id_messages === msg.id_messages)
        ) {
          this.messages.push(msg);
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

    // FIX: solo escuchamos la PRIMERA vez que se cargan las conversaciones (take(1)).
    // A partir de ahí, route.params se suscribe UNA sola vez, no en cada loadConversations().
    this.conversationsLoaded$.pipe(take(1)).subscribe(() => {
      this.routeParamsSub = this.route.params.subscribe(params => {
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

  /** Angular lifecycle hook: keeps the message list scrolled to the latest message. */
  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  /** Angular lifecycle hook: leaves the socket room, unsubscribes and disconnects the socket. */
  ngOnDestroy(): void {
    if (this.selectedConversationId !== null) {
      this.socketService.leaveConversation(this.selectedConversationId);
    }
    this.socketSub?.unsubscribe();
    this.routeParamsSub?.unsubscribe();
    this.socketService.disconnect();
  }

  /**
   * Switches the active conversation: leaves the previous socket room, joins
   * the new one, loads its messages, marks it as read, and updates breadcrumbs.
   * @param id Conversation id to select.
   */
  selectConversation(id: number): void {
    if (this.selectedConversationId !== null) {
      this.socketService.leaveConversation(this.selectedConversationId);
    }

    this.selectedConversationId = id;
    this.socketService.joinConversation(id);
    this.loadMessages(id);
    this.loadConversationData(id);

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

  /** Fetches the user's conversation list and maps it into ChatItem view models. */
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

  /**
   * Fetches all messages for a given conversation.
   * @param conversationId Conversation whose messages should be loaded.
   */
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

  /** Fetches conversation details (currently used only for debug logging). */
  private loadConversationData(conversationId: number): void {
    this.chatService.getChatById(conversationId).subscribe({
      next: (chat: any) => console.log('Conversación cargada:', chat),
      error: (err: any) => console.error('Error cargando conversación:', err)
    });
  }

  /**
   * Sends the current draft message via the chat service. Clears the input
   * optimistically and restores it if sending fails. The message itself is
   * not pushed locally here — it arrives back through the socket subscription.
   */
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

  /** Scrolls the messages container to its bottom to reveal the latest message. */
  scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop =
        this.messagesContainer.nativeElement.scrollHeight;
    } catch (e) { }
  }
}