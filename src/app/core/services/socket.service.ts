import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;

  constructor(private authService: AuthService) { }

  /** Conecta al servidor WebSocket usando el JWT del usuario actual. */
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

  /** Desconecta el socket (se llama al hacer logout). */
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  /** Se une a la sala de una conversación para recibir sus mensajes en tiempo real. */
  joinConversation(conversationId: number): void {
    this.socket?.emit('join_conversation', conversationId);
  }

  /** Abandona la sala de una conversación. */
  leaveConversation(conversationId: number): void {
    this.socket?.emit('leave_conversation', conversationId);
  }

  /** Observable que emite cada vez que llega un nuevo mensaje en la sala actual. */
  onNewMessage<T = any>(): Observable<T> {
    return new Observable((observer) => {
      this.socket?.on('new_message', (msg: T) => observer.next(msg));
      return () => this.socket?.off('new_message');
    });
  }

  onEvent<T = any>(event: string): Observable<T> {
    return new Observable((observer) => {
      this.socket?.on(event, (data: T) => observer.next(data));
      return () => this.socket?.off(event);
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
