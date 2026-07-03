import { Component, EventEmitter, Input, Output } from '@angular/core';

// INTERFACE LOCAL
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPlacement = 'fixed' | 'inline';

@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.html',
  styleUrl: './toast.css'
})
export class ToastComponent {
  @Input() visible = false;
  @Input() type: ToastType = 'success';
  @Input() title = '';
  @Input() message = '';
  @Input() placement: ToastPlacement = 'fixed';

  @Output() dismissed = new EventEmitter<void>();

  dismiss(): void {
    this.dismissed.emit();
  }
}
