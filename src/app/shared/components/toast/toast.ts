import { Component, EventEmitter, Input, Output } from '@angular/core';

// INTERFACE LOCAL
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPlacement = 'fixed' | 'inline';

/**
 * Reusable toast/notification component used to show transient success, error,
 * warning or info messages across the app (e.g. after form submissions or
 * background actions). Can be rendered fixed to the viewport or inline within
 * a page section, and is dismissed by the user or by the parent component.
 */
@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.html',
  styleUrl: './toast.css'
})
export class ToastComponent {
  // Controls whether the toast is currently shown
  @Input() visible = false;
  // Visual/semantic style of the toast (success, error, warning, info)
  @Input() type: ToastType = 'success';
  // Bold title text displayed at the top of the toast
  @Input() title = '';
  // Body message text displayed below the title
  @Input() message = '';
  // Positioning mode: 'fixed' overlays the viewport, 'inline' renders within its parent's flow
  @Input() placement: ToastPlacement = 'fixed';

  // Emitted when the user clicks the close button, requesting the toast be hidden
  @Output() dismissed = new EventEmitter<void>();

  /** Emits the `dismissed` event so the parent component can hide the toast. */
  dismiss(): void {
    this.dismissed.emit();
  }
}
