import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ModalConfirmComponent } from '../../../shared/components/modal-confirm/modal-confirm';
import { ToastComponent, ToastType } from '../../../shared/components/toast/toast';
import { AdminNavigationComponent } from '../../../shared/components/admin-navigation/admin-navigation';
import { ReportsService, ReportApi } from '../../../core/services/reports.service';

type ReportAction = 'resolve' | 'withdraw' | 'reactivate';

// DEMO - use interface ReportDetail
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

@Component({
  selector: 'app-report-detail',
  standalone: true,
  imports: [RouterLink, ModalConfirmComponent, ToastComponent, AdminNavigationComponent],
  templateUrl: './report-detail.html',
  styleUrl: './report-detail.css'
})
export class ReportDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reportsService = inject(ReportsService);
  private readonly cdr = inject(ChangeDetectorRef);

  report: ReportDetail | null = null;
  productId: number | null = null;
  isLoading = true;
  error = '';

  pendingAction: ReportAction | null = null;
  toast = { visible: false, type: 'success' as ToastType, title: '', message: '' };

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
      error: () => {
        this.error = 'No se pudo cargar el reporte.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  get modalTitle(): string {
    return this.pendingAction === 'withdraw'
      ? 'Retirar artículo'
      : this.pendingAction === 'reactivate'
        ? 'Reactivar artículo'
        : 'Resolver reporte';
  }

  get modalMessage(): string {
    return this.pendingAction === 'withdraw'
      ? 'El artículo reportado se retirará del catálogo.'
      : this.pendingAction === 'reactivate'
        ? 'El artículo permanecerá visible en el catálogo.'
        : 'El reporte se marcará como resuelto.';
  }

  get reportStatusLabel(): string {
    return this.report?.status === 'pending' ? 'Pendiente' : 'Resuelto';
  }

  openAction(action: ReportAction): void {
    this.pendingAction = action;
  }

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
      error: () => {
        this.toast = {
          visible: true,
          type: 'error',
          title: 'No se pudo completar la acción',
          message: 'Comprueba tus permisos e inténtalo de nuevo.',
        };
        this.pendingAction = null;
        this.cdr.markForCheck();
      },
    });
  }

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
