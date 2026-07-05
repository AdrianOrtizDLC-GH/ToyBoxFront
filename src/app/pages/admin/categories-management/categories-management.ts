import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CategoriesService } from '../../../core/services/categories.service';
import { Category } from '../../../shared/interfaces/category.interface';
import { ModalConfirmComponent } from '../../../shared/components/modal-confirm/modal-confirm';
import { ToastComponent, ToastType } from '../../../shared/components/toast/toast';
import { AdminNavigationComponent } from '../../../shared/components/admin-navigation/admin-navigation';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb';

interface CategoryRow {
  id: number;
  name: string;
  description: string;
  items: number;
  icon: string;
}

const DEFAULT_CATEGORY_ICON = '/assets/images/Iconos%20categorias/icono_educativo.svg';

@Component({
  selector: 'app-categories-management',
  standalone: true,
  imports: [FormsModule, ModalConfirmComponent, ToastComponent, AdminNavigationComponent, PaginationComponent, BreadcrumbComponent],
  templateUrl: './categories-management.html',
  styleUrl: './categories-management.css'
})
export class CategoriesManagementComponent implements OnInit {
  private readonly categoriesService = inject(CategoriesService);

  private readonly categories = signal<CategoryRow[]>([]);
  readonly isLoading = signal(false);

  readonly searchTerm = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = 8;
  readonly editingId = signal<number | null>(null);
  readonly categoryToDelete = signal<CategoryRow | null>(null);
  readonly toast = signal({ visible: false, type: 'success' as ToastType, title: '', message: '' });

  form: { name: string; description: string; icon: string } = {
    name: '',
    description: '',
    icon: '',
  };
  selectedIconFile: File | null = null;
  readonly iconPreview = signal('');

  readonly filteredCategories = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const categories = this.categories();
    if (!term) {
      return categories;
    }

    return categories.filter(category =>
      category.name.toLowerCase().includes(term) ||
      category.description.toLowerCase().includes(term)
    );
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredCategories().length / this.pageSize)));

  readonly paginatedCategories = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredCategories().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading.set(true);

    this.categoriesService.getAll().subscribe({
      next: categories => {
        this.categories.set(categories.map(category => this.mapCategory(category)));
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('error', 'No se pudieron cargar las categorías', 'Revisa que el backend esté arrancado y que hayas iniciado sesión.');
      },
    });
  }

  saveCategory(): void {
    const name = this.form.name.trim();
    const description = this.form.description.trim();

    if (!name || !description || (!this.editingId() && !this.selectedIconFile)) {
      this.showToast('warning', 'Faltan campos', 'El nombre, la descripción y el icono son obligatorios.');
      return;
    }

    const editingId = this.editingId();

    if (editingId) {
      this.categoriesService.update(editingId, { name, description }).subscribe({
        next: category => {
          this.finishSave(category, 'Categoría actualizada', `${name} se ha actualizado correctamente.`);
        },
        error: error => this.showCategoryError(error, 'No se pudo actualizar'),
      });
      return;
    }

    this.categoriesService.create({ name, description }).subscribe({
      next: category => {
        this.finishSave(category, 'Categoría creada', `${name} se ha añadido correctamente.`);
      },
      error: error => this.showCategoryError(error, 'No se pudo crear la categoría'),
    });
  }

  editCategory(category: CategoryRow): void {
    this.editingId.set(category.id);
    this.form = {
      name: category.name,
      description: category.description,
      icon: category.icon,
    };
    this.selectedIconFile = null;
    this.iconPreview.set(category.icon);
  }

  onIconSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      input.value = '';
      this.showToast('warning', 'Icono no válido', 'Selecciona una imagen de hasta 5 MB.');
      return;
    }

    this.selectedIconFile = file;
    const reader = new FileReader();
    reader.onload = () => this.iconPreview.set(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  }

  askDelete(category: CategoryRow): void {
    this.categoryToDelete.set(category);
  }

  confirmDelete(): void {
    const deletedCategory = this.categoryToDelete();
    if (!deletedCategory) {
      return;
    }

    this.categoriesService.delete(deletedCategory.id).subscribe({
      next: () => {
        this.categories.update(categories => categories.filter(category => category.id !== deletedCategory.id));
        this.categoryToDelete.set(null);
        this.showToast('success', 'Categoría eliminada', `${deletedCategory.name} se ha eliminado correctamente.`);
      },
      error: error => this.showCategoryError(error, 'No se pudo eliminar'),
    });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form = { name: '', description: '', icon: '' };
    this.selectedIconFile = null;
    this.iconPreview.set('');
  }

  updateSearch(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(1);
  }

  changePage(page: number): void {
    this.currentPage.set(page);
  }

  private mapCategory(category: Category & { id?: number; total_items?: number | string }): CategoryRow {
    return {
      id: category.id_categories ?? category.id ?? 0,
      name: category.name,
      description: category.description ?? 'Sin descripción',
      items: Number(category.total_items ?? 0),
      icon: category.icon ?? DEFAULT_CATEGORY_ICON,
    };
  }

  private showToast(type: ToastType, title: string, message: string): void {
    this.toast.set({ visible: true, type, title, message });
  }

  private finishSave(category: Category, title: string, message: string): void {
    if (!this.selectedIconFile) {
      this.applySavedCategory(category);
      this.showToast('success', title, message);
      this.resetForm();
      return;
    }

    const formData = new FormData();
    formData.append('icon', this.selectedIconFile);
    this.categoriesService.uploadIcon(category.id_categories, formData).subscribe({
      next: categoryWithIcon => {
        this.applySavedCategory(categoryWithIcon);
        this.showToast('success', title, message);
        this.resetForm();
      },
      error: error => this.showCategoryError(error, 'La categoría se guardó, pero el icono no pudo subirse'),
    });
  }

  private applySavedCategory(category: Category): void {
    const saved = this.mapCategory(category);
    this.categories.update(categories => {
      const current = categories.find(item => item.id === saved.id);
      return current
        ? categories.map(item => item.id === saved.id ? { ...saved, items: current.items } : item)
        : [...categories, saved];
    });
  }

  private showCategoryError(error: unknown, title: string): void {
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      this.showToast('warning', title, 'Inicia sesión con una cuenta administradora para gestionar categorías.');
      return;
    }

    this.showToast('error', title, 'Inténtalo de nuevo en unos segundos.');
  }
}
