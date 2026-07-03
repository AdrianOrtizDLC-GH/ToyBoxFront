import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CategoriesService } from '../../../core/services/categories.service';
import { Category } from '../../../shared/interfaces/category.interface';
import { ModalConfirmComponent } from '../../../shared/components/modal-confirm/modal-confirm';
import { ToastComponent, ToastType } from '../../../shared/components/toast/toast';
import { AdminNavigationComponent } from '../../../shared/components/admin-navigation/admin-navigation';

interface CategoryRow {
  id: number;
  name: string;
  description: string;
  items: number;
}

@Component({
  selector: 'app-categories-management',
  standalone: true,
  imports: [FormsModule, ModalConfirmComponent, ToastComponent, AdminNavigationComponent],
  templateUrl: './categories-management.html',
  styleUrl: './categories-management.css'
})
export class CategoriesManagementComponent implements OnInit {
  private readonly categoriesService = inject(CategoriesService);

  private readonly categories = signal<CategoryRow[]>([]);
  readonly isLoading = signal(false);

  readonly searchTerm = signal('');
  readonly editingId = signal<number | null>(null);
  readonly categoryToDelete = signal<CategoryRow | null>(null);
  readonly toast = signal({ visible: false, type: 'success' as ToastType, title: '', message: '' });

  form = {
    name: '',
    description: '',
  };

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

    if (!name || !description) {
      this.showToast('warning', 'Faltan campos', 'El nombre y la descripción son obligatorios.');
      return;
    }

    const editingId = this.editingId();

    if (editingId) {
      this.categoriesService.update(editingId, { name, description }).subscribe({
        next: category => {
          const updated = this.mapCategory(category);
          this.categories.update(categories => categories.map(current =>
            current.id === editingId ? { ...updated, items: current.items } : current
          )
          );
          this.showToast('success', 'Categoría actualizada', `${name} se ha actualizado correctamente.`);
          this.resetForm();
        },
        error: error => this.showCategoryError(error, 'No se pudo actualizar'),
      });
      return;
    }

    this.categoriesService.create({ name, description }).subscribe({
      next: category => {
        this.categories.update(categories => [...categories, this.mapCategory(category)]);
        this.showToast('success', 'Categoría creada', `${name} se ha añadido correctamente.`);
        this.resetForm();
      },
      error: error => this.showCategoryError(error, 'No se pudo crear la categoría'),
    });
  }

  editCategory(category: CategoryRow): void {
    this.editingId.set(category.id);
    this.form = {
      name: category.name,
      description: category.description,
    };
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
    this.form = { name: '', description: '' };
  }

  private mapCategory(category: Category & { id?: number; total_items?: number | string }): CategoryRow {
    return {
      id: category.id_categories ?? category.id ?? 0,
      name: category.name,
      description: category.description ?? 'Sin descripción',
      items: Number(category.total_items ?? 0),
    };
  }

  private showToast(type: ToastType, title: string, message: string): void {
    this.toast.set({ visible: true, type, title, message });
  }

  private showCategoryError(error: unknown, title: string): void {
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      this.showToast('warning', title, 'Inicia sesión con una cuenta administradora para gestionar categorías.');
      return;
    }

    this.showToast('error', title, 'Inténtalo de nuevo en unos segundos.');
  }
}
