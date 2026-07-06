import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Chat } from '../../shared/interfaces/chat.interface';
import { ChatMessage } from '../../shared/interfaces/message.interface';

/**
 * Service handling chat/conversation data over HTTP: listing the current
 * user's chats, fetching a chat and its message history, starting a new
 * chat, sending messages, and marking a chat as read.
 * Real-time delivery of new messages is handled separately by
 * SocketService (socket.service.ts); this service covers the REST/history
 * side of chat (initial load, pagination-free message fetch, persistence).
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  // Base URL for chat endpoints.
  private readonly API = `${environment.apiUrl}/chats`;

  constructor(private http: HttpClient) {}

  /**
   * Fetches all chats the current user participates in.
   * HTTP: GET {apiUrl}/chats
   * @returns Observable emitting the list of Chats.
   */
  getMyChats(): Observable<Chat[]> {
    return this.http.get<Chat[]>(this.API);
  }

  /**
   * Fetches a single chat by id.
   * HTTP: GET {apiUrl}/chats/{id}
   * @param id Chat identifier.
   * @returns Observable emitting the Chat.
   */
  getChatById(id: number): Observable<Chat> {
    return this.http.get<Chat>(`${this.API}/${id}`);
  }

  /**
   * Starts a new chat for a given product (e.g. buyer contacting seller).
   * HTTP: POST {apiUrl}/chats
   * @param productId Identifier of the product the chat is about.
   * @returns Observable emitting the newly created Chat.
   */
  startChat(productId: number): Observable<Chat> {
    return this.http.post<Chat>(this.API, { fk_product_id: productId });
  }

  /**
   * Fetches the message history for a chat.
   * HTTP: GET {apiUrl}/chats/{chatId}/messages
   * @param chatId Chat identifier.
   * @returns Observable emitting the list of ChatMessages.
   */
  getMessages(chatId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.API}/${chatId}/messages`);
  }

  /**
   * Sends a new message in a chat.
   * HTTP: POST {apiUrl}/chats/{chatId}/messages
   * @param chatId Chat identifier.
   * @param content Text content of the message.
   * @returns Observable emitting the created ChatMessage.
   */
  sendMessage(chatId: number, content: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.API}/${chatId}/messages`, { content });
  }

  /**
   * Marks all messages in a chat as read for the current user.
   * HTTP: PATCH {apiUrl}/chats/{chatId}/read
   * @param chatId Chat identifier.
   * @returns Observable that completes when the update succeeds.
   */
  markAsRead(chatId: number): Observable<void> {
    return this.http.patch<void>(`${this.API}/${chatId}/read`, {});
  }
}
