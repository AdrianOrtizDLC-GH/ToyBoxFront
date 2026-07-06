import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Service managing the real-time WebSocket connection (socket.io-client)
 * used for live chat features: connecting/disconnecting the socket,
 * joining/leaving per-conversation rooms, and exposing Observables for
 * incoming events (new messages and other named events).
 * Complements ChatService (REST history/persistence) by providing
 * real-time push updates once a chat conversation is open.
 */
@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  // Underlying socket.io client instance, null until connect() succeeds.
  private socket: Socket | null = null;

  constructor(private authService: AuthService) { }

  /**
   * Connects to the WebSocket server, authenticating with the current
   * user's JWT (obtained from AuthService). No-ops if already connected
   * or if there is no token (user not logged in).
   */
  connect(): void {
    if (this.socket?.connected) return;

    const token = this.authService.getToken();
    if (!token) return;

    this.socket = io(environment.apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Error de conexión:', err.message);
    });
  }

  /**
   * Disconnects the socket and clears the internal reference.
   * Called on logout and on service destruction.
   */
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  /**
   * Joins the server-side room for a given conversation, so the client
   * starts receiving real-time events (e.g. new messages) for it.
   * @param conversationId Identifier of the chat/conversation to join.
   */
  joinConversation(conversationId: number): void {
    this.socket?.emit('join_conversation', conversationId);
  }

  /**
   * Leaves the server-side room for a given conversation, stopping
   * real-time updates for it.
   * @param conversationId Identifier of the chat/conversation to leave.
   */
  leaveConversation(conversationId: number): void {
    this.socket?.emit('leave_conversation', conversationId);
  }

  /**
   * Returns an Observable that emits every time a new message arrives on
   * the currently joined conversation room.
   * @returns Observable emitting the new message payload.
   */
  onNewMessage<T = any>(): Observable<T> {
    return new Observable((observer) => {
      this.socket?.on('new_message', (msg: T) => observer.next(msg));
      return () => this.socket?.off('new_message');
    });
  }

  /**
   * Returns an Observable that emits every time the given named socket
   * event is received. Generic helper for any event not covered by a
   * dedicated method (e.g. typing indicators, read receipts).
   * @param event Name of the socket.io event to listen for.
   * @returns Observable emitting the event payload.
   */
  onEvent<T = any>(event: string): Observable<T> {
    return new Observable((observer) => {
      this.socket?.on(event, (data: T) => observer.next(data));
      return () => this.socket?.off(event);
    });
  }

  /**
   * Angular lifecycle hook: ensures the socket is disconnected when this
   * (root-provided, effectively app-lifetime) service is destroyed.
   */
  ngOnDestroy(): void {
    this.disconnect();
  }
}
