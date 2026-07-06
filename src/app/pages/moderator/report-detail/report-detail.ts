import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ModalConfirmComponent } from '../../../shared/components/modal-confirm/modal-confirm';
import { ToastComponent, ToastType } from '../../../shared/components/toast/toast';
import { AdminNavigationComponent } from '../../../shared/components/admin-navigation/admin-navigation';
import { ReportsService, ReportApi } from '../../../core/services/reports.service';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb';
import { HttpErrorResponse } from '@angular/common/http';

type ReportAction = 'resolve' | 'withdraw' | 'reactivate';

// DEMO - use interface ReportDetail
/** View model for a single moderation report, mapped from the API response. */
interface ReportDetail {
  id: number;
  itemTitle: string;
  itemDescription: string;
  reporter: string;
  reportedUser: string;
  reason: string;
  status: 'pending' | 'resolved';
  reportDate: string;
}

/**
 * Moderator page for reviewing a single reported item/report.
 * Loads the report by route id, and lets a moderator resolve, withdraw,
 * or reactivate the reported item through a confirmation modal.
 */
@Component({
  selector: 'app-report-detail',
  standalone: true,
  imports: [RouterLink, ModalConfirmComponent, ToastComponent, AdminNavigationComponent, BreadcrumbComponent],
  templateUrl: './report-detail.html',
  styleUrl: './report-detail.css'
})
export class ReportDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reportsService = inject(ReportsService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Currently loaded report, or null while loading/on error.
  report: ReportDetail | null = null;
  // Id of the reported item (product), used for moderation actions.
  productId: number | null = null;
  isLoading = true;
  error = '';

  // Action selected by the moderator, pending confirmation via the modal.
  pendingAction: ReportAction | null = null;
  // State bound to the toast component to show success/error feedback.
  toast = { visible: false, type: 'success' as ToastType, title: '', message: '' };

  /**
   * Reads the report id from the route, fetches the report data,
   * and maps it into the view model. Sets an error message if the
   * id is invalid or the request fails.
   */
  ngOnInit(): void {
    const reportId = Number(this.route.snapshot.paramMap.get('id'));
    if (!reportId) {
      this.error = 'El identificador del reporte no es válido.';
      this.isLoading = false;
      return;
    }

    this.reportsService.getById(reportId).subscribe({
      next: report => {
        this.report = this.mapReport(report);
        this.productId = report.fk_items_id;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        const apiMessage = error.error?.error;
        this.error = 'No se pudo cargar el reporte.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** Title shown in the confirmation modal, based on the pending action. */
  get modalTitle(): string {
    return this.pendingAction === 'withdraw'
      ? 'Retirar artículo'
      : this.pendingAction === 'reactivate'
        ? 'Reactivar artículo'
        : 'Resolver reporte';
  }

  /** Confirmation message shown in the modal, based on the pending action. */
  get modalMessage(): string {
    return this.pendingAction === 'withdraw'
      ? 'El artículo reportado se retirará del catálogo.'
      : this.pendingAction === 'reactivate'
        ? 'El artículo permanecerá visible en el catálogo.'
        : 'El reporte se marcará como resuelto.';
  }

  /** Human-readable label for the current report status. */
  get reportStatusLabel(): string {
    return this.report?.status === 'pending' ? 'Pendiente' : 'Resuelto';
  }

  /**
   * Opens the confirmation modal for the given moderation action.
   * @param action The action to confirm (resolve, withdraw, or reactivate).
   */
  openAction(action: ReportAction): void {
    this.pendingAction = action;
  }

  /**
   * Executes the pending moderation action (withdraw or approve/reactivate)
   * against the reported item, updates local state, and shows a toast
   * with the result.
   */
  confirmAction(): void {
    if (!this.pendingAction || !this.productId || !this.report) {
      return;
    }

    const action = this.pendingAction;
    const request = action === 'withdraw'
      ? this.reportsService.withdraw(this.productId)
      : this.reportsService.approve(this.productId);

    const messages: Record<ReportAction, string> = {
      resolve: 'Reporte marcado como resuelto.',
      withdraw: 'Artículo retirado y reporte resuelto.',
      reactivate: 'Artículo reactivado y reporte resuelto.',
    };

    request.subscribe({
      next: () => {
        this.report = this.report ? { ...this.report, status: 'resolved' } : null;
        this.toast = {
          visible: true,
          type: 'success',
          title: 'Acción de moderación completada',
          message: messages[action],
        };
        this.pendingAction = null;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        const apiMessage = error.error?.error;
        this.toast = {
          visible: true,
          type: 'error',
          title: 'No se pudo completar la acción',
          message: apiMessage ?? 'La acción ya no está disponible. Actualiza el reporte e inténtalo de nuevo.',
        };
        this.pendingAction = null;
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Maps the raw API report into the {@link ReportDetail} view model,
   * falling back to placeholder labels when related data is missing.
   * @param report Raw report payload returned by the API.
   * @returns The mapped report ready for display.
   */
  private mapReport(report: ReportApi): ReportDetail {
    return {
      id: report.id_reports,
      itemTitle: report.item_title ?? `Artículo #${report.fk_items_id}`,
      itemDescription: report.item_description ?? 'Sin descripción disponible.',
      reporter: report.reporter_username ?? `Usuario #${report.fk_user_reports_received}`,
      reportedUser: report.reported_username ?? `Usuario #${report.fk_user_reported}`,
      reason: report.reason,
      status: report.status === 'resolved' ? 'resolved' : 'pending',
      reportDate: report.report_date?.slice(0, 10) ?? '-',
    };
  }
}
