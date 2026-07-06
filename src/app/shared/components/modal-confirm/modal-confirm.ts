import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Reusable confirmation modal/dialog component. Used across the app
 * wherever a destructive or important action needs explicit user
 * confirmation (e.g. deleting an item, cancelling an order, leaving
 * a form with unsaved changes) before proceeding.
 */
@Component({
  selector: 'app-modal-confirm',
  standalone: true,
  templateUrl: './modal-confirm.html',
  styleUrl: './modal-confirm.css'
})
export class ModalConfirmComponent {
  // Controls whether the modal is visible.
  @Input() isOpen = false;
  // Title displayed at the top of the modal.
  @Input() title = 'Confirmar acción';
  // Main confirmation message/body text of the modal.
  @Input() message = '¿Seguro que quieres continuar?';
  // Label for the confirm/accept button.
  @Input() confirmText = 'Confirmar';
  // Label for the cancel/dismiss button.
  @Input() cancelText = 'Cancelar';
  // Visual style/severity of the modal, affects icon and button styling.
  @Input() variant: 'danger' | 'warning' | 'info' = 'danger';

  // Emitted when the user clicks the confirm button.
  @Output() confirmed = new EventEmitter<void>();
  // Emitted when the user clicks cancel or dismisses the modal (e.g. backdrop click).
  @Output() cancelled = new EventEmitter<void>();

  /**
   * Handles the confirm button click by emitting the `confirmed` event.
   */
  onConfirm(): void {
    this.confirmed.emit();
  }

  /**
   * Handles the cancel button click (or backdrop click) by emitting
   * the `cancelled` event.
   */
  onCancel(): void {
    this.cancelled.emit();
  }
}
