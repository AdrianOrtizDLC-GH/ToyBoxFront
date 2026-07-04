import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { ChatMessageWithSender } from '../../interfaces/message.interface';
import { UserAvatarComponent } from '../user-avatar/user-avatar';

@Component({
  selector: 'app-chat-bubble',
  standalone: true,
  imports: [CommonModule, UserAvatarComponent],
  templateUrl: './chat-bubble.html',
  styleUrl: './chat-bubble.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatBubbleComponent {

  @Input({ required: true }) message!: ChatMessageWithSender;
  @Input() isOwn = false;
  
  get shouldShowAvatar(): boolean {
    return !this.isOwn && !!this.message.senderName && !!this.message.senderAvatar;
  }

  
  get displaySenderName(): string {
    return this.message.senderName || 'Usuario desconocido';
  }

  get displaySenderAvatar(): string | null {
    return this.message.senderAvatar || null;
  }

  getReadStatusLabel(): string {
    return this.message.read ? 'Leído' : 'Enviado';
  }
}