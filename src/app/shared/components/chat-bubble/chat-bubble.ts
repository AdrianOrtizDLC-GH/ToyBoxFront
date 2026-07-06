import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { ChatMessageWithSender } from '../../interfaces/message.interface';
import { UserAvatarComponent } from '../user-avatar/user-avatar';

/**
 * Reusable chat message bubble used within chat/conversation views to render a
 * single message, styled differently depending on whether it belongs to the
 * current user or the other participant. Shows the sender's avatar (for
 * messages from others) and a read/sent status indicator (for own messages).
 */
@Component({
  selector: 'app-chat-bubble',
  standalone: true,
  imports: [CommonModule, UserAvatarComponent],
  templateUrl: './chat-bubble.html',
  styleUrl: './chat-bubble.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatBubbleComponent {

  // The chat message to display, including sender info; required for the component to render.
  @Input({ required: true }) message!: ChatMessageWithSender;
  // Whether this bubble represents a message sent by the current user (affects styling and read-status display).
  @Input() isOwn = false;

  /**
   * Determines whether the sender's avatar should be displayed.
   * Only shown for messages from other users that have both a sender name and avatar.
   * @returns true if the avatar should be rendered.
   */
  get shouldShowAvatar(): boolean {
    return !this.isOwn && !!this.message.senderName && !!this.message.senderAvatar;
  }

  /**
   * Resolves the sender's avatar URL to display, falling back to null when unavailable.
   * @returns the avatar URL string, or null if none is set.
   */
  get displaySenderAvatar(): string | null {
    return this.message.senderAvatar || null;
  }

  /**
   * Builds the accessible label describing the message's read status.
   * @returns 'Leído' if the message has been read, otherwise 'Enviado'.
   */
  getReadStatusLabel(): string {
    return this.message.read ? 'Leído' : 'Enviado';
  }
}