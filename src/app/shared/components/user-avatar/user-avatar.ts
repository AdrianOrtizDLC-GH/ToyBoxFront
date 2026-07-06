import { Component, Input, Output, EventEmitter, signal, ViewChild, ElementRef, OnInit } from '@angular/core';
import { User } from '../../interfaces/user.interface';
import { ModalConfirmComponent } from '../modal-confirm/modal-confirm';

type AvatarSize = 'tiny' | 'small' | 'medium' | 'large' | 'extra-large';

/**
 * Reusable user avatar component used throughout the app (navigation bar,
 * profile pages, reviews, etc.) to display a user's profile picture or
 * initials fallback. Supports a read-only mode with a click-to-preview modal,
 * and an editable mode that lets the user upload/validate/delete their photo.
 */
@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [ModalConfirmComponent],
  templateUrl: './user-avatar.html',
  styleUrl: './user-avatar.css'
})

export class UserAvatarComponent implements OnInit {
  // Full user object; used to derive the profile picture and display name when src/name aren't provided
  @Input() user: User | null = null;
  // Explicit image URL to display, takes priority over user.profile_picture
  @Input() src: string | null = null;
  // Explicit display name, takes priority over the name derived from `user`
  @Input() name: string = '';
  // Avatar size preset, mapped to pixel dimensions via sizePixels
  @Input() size: AvatarSize = 'medium';
  // Whether the avatar allows uploading/deleting a photo (shows edit overlay controls)
  @Input() editable: boolean = false;
  // When true, disables the click-to-preview modal even in read-only mode
  @Input() disableModal: boolean = false;
  // Emits the selected File once it passes validation, so the parent can upload it
  @Output() imageChanged = new EventEmitter<File>();
  // Emitted when the user confirms deleting their current profile picture
  @Output() imageDeleted = new EventEmitter<void>();
  // Emits a user-facing error message when image selection/validation fails
  @Output() imageError = new EventEmitter<string>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  showModal = signal(false);
  isInsideNavigation = false;

  showDeleteConfirm = signal(false);

  constructor(private elementRef: ElementRef) {}

  /** Angular lifecycle hook: detects whether this avatar sits inside a navigation link/button. */
  ngOnInit(): void {
    this.isInsideNavigation = this.detectInsideNavigation();
  }

  /**
   * Checks whether the avatar's host element is nested inside an anchor or a
   * router-linked button, in which case the preview modal should not open
   * (to avoid conflicting with the navigation click).
   * @returns True if the avatar is inside a navigation element.
   */
  private detectInsideNavigation(): boolean {
    const parent = this.elementRef.nativeElement.closest('a, button[routerLink]');
    return !!parent;
  }

  /** Resolves the image URL to display, preferring `src`, then the user's profile picture, else null. */
  get finalSrc(): string | null {
    if (this.src && this.src.trim() !== '') {
      return this.src;
    }
    if (this.user?.profile_picture && this.user.profile_picture.trim() !== '') {
      return this.user.profile_picture;
    }
    return null;
  }

  /** Resolves the display name, preferring `name`, then the user's full name, else an empty string. */
  get displayName(): string {
    if (this.name && this.name.trim() !== '') {
      return this.name;
    }
    if (this.user) {
      return `${this.user.first_name || ''} ${this.user.last_name || ''}`.trim();
    }
    return '';
  }

  /** Computes the 1-2 letter initials fallback shown when there is no avatar image. */
  get initials(): string {
    const displayName = this.displayName;
    if (!displayName) return '?';

    const parts = displayName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  }

  /** Maps the `size` input preset to its corresponding pixel dimension. */
  get sizePixels(): number {
    switch (this.size) {
      case 'tiny':
        return 36;
      case 'small':
        return 32;
      case 'medium':
        return 48;
      case 'large':
        return 80;
      case 'extra-large':
        return 200;
      default:
        return 48;
    }
  }

  /** Derives the initials font size proportionally from the avatar's pixel size. */
  get fontSizePixels(): number {
    return Math.round(this.sizePixels * 0.35);
  }

  /**
   * Opens the full-size image preview modal, unless the avatar is editable,
   * has the modal disabled, or is nested inside a navigation link/button.
   * @param event Optional originating click event, stopped from propagating so it doesn't trigger a parent navigation.
   */
  openModal(event?: Event): void {
    if (!this.editable && !this.disableModal && !this.isInsideNavigation) {
      event?.stopPropagation();
      this.showModal.set(true);
    }
  }

  /** Closes the full-size image preview modal. */
  closeModal(): void {
    this.showModal.set(false);
  }

  /**
   * Closes the preview modal when the user presses Escape.
   * @param event Keyboard event from the modal overlay.
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  /**
   * Handles the file input's change event when the user picks a new photo.
   * Validates file type, size, and image dimensions, emitting `imageError`
   * with a descriptive message for any failure, or `imageChanged` with the
   * valid file once all checks pass.
   * @param event Change event from the hidden file input element.
   */
  onImageSelected(event: Event): void {
    if (!this.editable) return;

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const maxSizeMB = 5;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      const minDimension = 200;
      const maxDimension = 5000;

      if (!validTypes.includes(file.type)) {
        this.imageError.emit('❌ Formato no válido. Solo JPG, PNG, GIF o WEBP.');
        if (input) input.value = '';
        return;
      }

      if (file.size > maxSizeBytes) {
        this.imageError.emit(`❌ Archivo demasiado grande. Máximo ${maxSizeMB} MB. Tu archivo pesa ${(file.size / 1024 / 1024).toFixed(2)} MB.`);
        if (input) input.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          if (img.width < minDimension || img.height < minDimension) {
            this.imageError.emit(`❌ Imagen muy pequeña. Mínimo ${minDimension}x${minDimension} píxeles. Tu imagen es ${img.width}x${img.height}.`);
            if (input) input.value = '';
            return;
          }

          if (img.width > maxDimension || img.height > maxDimension) {
            this.imageError.emit(`❌ Imagen muy grande. Máximo ${maxDimension}x${maxDimension} píxeles. Tu imagen es ${img.width}x${img.height}.`);
            if (input) input.value = '';
            return;
          }

          this.imageChanged.emit(file);
        };

        img.onerror = () => {
          this.imageError.emit('❌ La imagen está corrupta o no es válida. Por favor, intenta con otra.');
          if (input) input.value = '';
        };

        img.src = reader.result as string;
      };

      reader.onerror = () => {
        this.imageError.emit('❌ No se pudo leer el archivo. Por favor, intenta de nuevo.');
        if (input) input.value = '';
      };

      reader.readAsDataURL(file);
    }
  }

  /** Opens the confirmation dialog before deleting the current profile picture (editable mode only). */
  deleteImage(): void {
    if (!this.editable) return;
    this.showDeleteConfirm.set(true);
  }

  /** Confirms the deletion: closes the confirm dialog and emits the `imageDeleted` output. */
  confirmDeleteImage(): void {
    this.showDeleteConfirm.set(false);
    this.imageDeleted.emit();
  }

  /** Cancels the pending image deletion, closing the confirmation dialog without emitting. */
  cancelDeleteImage(): void {
    this.showDeleteConfirm.set(false);
  }

  /** Programmatically opens the native file picker for selecting a new photo. */
  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }
}