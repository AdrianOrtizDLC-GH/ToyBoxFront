import { Component, Input, Output, EventEmitter, signal, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../interfaces/user.interface';
import { ModalConfirmComponent } from '../modal-confirm/modal-confirm';

type AvatarSize = 'tiny' | 'small' | 'medium' | 'large' | 'extra-large';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule, ModalConfirmComponent], 
  templateUrl: './user-avatar.html',
  styleUrl: './user-avatar.css'
})

export class UserAvatarComponent implements OnInit {
  @Input() user: User | null = null;
  @Input() src: string | null = null;
  @Input() name: string = '';
  @Input() size: AvatarSize = 'medium';
  @Input() editable: boolean = false;
  @Input() disableModal: boolean = false;
  @Output() imageChanged = new EventEmitter<File>();
  @Output() imageDeleted = new EventEmitter<void>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  showModal = signal(false);
  isInsideNavigation = false;

  showDeleteConfirm = signal(false);

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    this.isInsideNavigation = this.detectInsideNavigation();
  }

  private detectInsideNavigation(): boolean {
    const parent = this.elementRef.nativeElement.closest('a, button[routerLink]');
    return !!parent; 
  }

  get finalSrc(): string | null {
    if (this.src && this.src.trim() !== '') {
      return this.src;
    }
    if (this.user?.profile_picture && this.user.profile_picture.trim() !== '') {
      return this.user.profile_picture;
    }
    return null;
  }

  get displayName(): string {
    if (this.name && this.name.trim() !== '') {
      return this.name;
    }
    if (this.user) {
      return `${this.user.first_name || ''} ${this.user.last_name || ''}`.trim();
    }
    return '';
  }

  get initials(): string {
    const displayName = this.displayName;
    if (!displayName) return '?';

    const parts = displayName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  }

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

  get fontSizePixels(): number {
    return Math.round(this.sizePixels * 0.35);
  }

  openModal(event?: Event): void {
    if (!this.editable && !this.disableModal && !this.isInsideNavigation) {
      event?.stopPropagation();
      this.showModal.set(true);
    }
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  onImageSelected(event: Event): void {
    if (!this.editable) return;

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const maxSizeMB = 5;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      if (!validTypes.includes(file.type)) {
        console.warn('Tipo de imagen no permitido');
        return;
      }

      if (file.size > maxSizeBytes) {
        console.warn('Imagen demasiado grande');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          this.imageChanged.emit(file);
        };
        img.onerror = () => {
          console.warn('Error cargando imagen');
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }

    if (input) input.value = '';
  }

  deleteImage(): void {
    if (!this.editable) return;
    this.showDeleteConfirm.set(true);
  }

  confirmDeleteImage(): void {
    this.showDeleteConfirm.set(false);
    this.imageDeleted.emit();
  }

  cancelDeleteImage(): void {
    this.showDeleteConfirm.set(false);
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }
}