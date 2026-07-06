import { Component, NgZone, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChatItem } from '../../../shared/interfaces/chat.interface';
import { ChatService } from '../../../core/services/chat.service';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [CommonModule, BreadcrumbComponent],
  templateUrl: './chat-list.html',
  styleUrls: ['./chat-list.css']
})
/**
 * Page component listing all of the user's chat conversations (inbox view).
 * Supports client-side search/filtering and navigates to the chat detail
 * page when a conversation is opened.
 */
export class ChatList implements OnInit {

  searchQuery: string = ''; // Free-text filter applied to conversations
  selectedConversationId: number | null = null;
  breadcrumbItems: any[] = [];
  conversations: ChatItem[] = []; // Full list of the user's conversations

  /** Conversations matching the current search query (by user name, item title or last message). */
  get filteredConversations(): ChatItem[] {
    if (!this.searchQuery) return this.conversations;
    const q = this.searchQuery.toLowerCase();
    return this.conversations.filter(c =>
      c.otherUserName.toLowerCase().includes(q) ||
      c.itemTitle.toLowerCase().includes(q) ||
      c.lastMessage?.toLowerCase().includes(q)
    );
  }

  constructor(
    private router: Router,
    private chatService: ChatService,
    private authService: AuthService,
    private ngZone: NgZone,  

    private cdr: ChangeDetectorRef 
  ) { }

  /** Angular lifecycle hook: builds breadcrumbs and loads the conversation list. */
  ngOnInit(): void {
    this.initializeBreadcrumbs();
    this.loadConversations();
  }

  /** Builds the breadcrumb trail, adapting the home route based on login state. */
  private initializeBreadcrumbs(): void {
    const isLoggedIn = this.authService.isLoggedIn();
    const homeRoute = isLoggedIn ? '/catalog' : '/home';

    this.breadcrumbItems = [
      { label: 'Inicio', route: homeRoute, icon: 'home' },
      { label: 'Buzón', icon: 'inbox' }
    ];
  }

  /**
   * Fetches the user's conversations and maps them into ChatItem view models.
   * Runs the mapping inside NgZone since this may be triggered from contexts
   * outside Angular's zone, ensuring change detection picks up the update.
   */
  loadConversations(): void {
    this.chatService.getMyChats().subscribe({
      next: (chats: any[]) => {

        this.ngZone.run(() => { 
        this.conversations = chats.map((chat: any) => {
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
      });

      },
      error: (err) => {
        console.error('Error cargando conversaciones:', err);
        this.conversations = [];  
      }
    });
  }

    /**
     * Navigates to the chat detail page for the selected conversation.
     * @param conversationId Conversation id to open.
     */
    openConversation(conversationId: number): void {
      this.selectedConversationId = conversationId;
      this.router.navigate(['/chat', conversationId]);
  }

  /**
   * Checks whether a given date string falls on today's date.
   * Used to format the last-message timestamp in the conversation list.
   */
  isToday(dateString: string): boolean {
    const msgDate = new Date(dateString);
    const today = new Date();
    return msgDate.toDateString() === today.toDateString();
  }

  /** Checks whether a given date string falls on yesterday's date. */
  isYesterday(dateString: string): boolean {
    const msgDate = new Date(dateString);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return msgDate.toDateString() === yesterday.toDateString();
  }


}