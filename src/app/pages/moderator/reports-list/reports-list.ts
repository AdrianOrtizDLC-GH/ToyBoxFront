import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReportsService } from '../../../core/services/reports.service';
import { ReportStatus } from '../../../shared/enums/report-status.enum';
import { AdminNavigationComponent } from '../../../shared/components/admin-navigation/admin-navigation';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb';

interface ReportRow {
  id: number;
  itemTitle: string;
  reporter: string;
  reportedUser: string;
  reason: string;
  status: 'pending' | 'resolved';
  date: string;
}

const REPORT_STATUS_LABELS: Record<ReportRow['status'], string> = {
  pending: 'Pendiente',
  resolved: 'Resuelto',
};

@Component({
  selector: 'app-reports-list',
  standalone: true,
  imports: [FormsModule, RouterLink, AdminNavigationComponent, BreadcrumbComponent],
  templateUrl: './reports-list.html',
  styleUrl: './reports-list.css'
})
export class ReportsListComponent implements OnInit {
  statusFilter: 'all' | 'pending' | 'resolved' = 'all';
  searchTerm = '';

  reports: ReportRow[] = [];
  isLoading = true;
  error = '';

  constructor(
    private reportsService: ReportsService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.isLoading = true;
    this.error = '';

    this.reportsService.getAll().subscribe({
      next: res => {
        this.reports = res.reports.map(report => this.mapReport(report));
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.error = err.status === 403
          ? 'No tienes permisos para ver los reportes.'
          : 'Error al cargar los reportes.';
        this.isLoading = false;
        this.cdr.markForCheck();
        console.error('Error cargando reportes:', err);
      },
    });
  }

  get filteredReports(): ReportRow[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.reports.filter(report => {
      const matchesStatus = this.statusFilter === 'all' || report.status === this.statusFilter;
      const matchesTerm = !term ||
        report.itemTitle.toLowerCase().includes(term) ||
        report.reason.toLowerCase().includes(term) ||
        report.reportedUser.toLowerCase().includes(term);

      return matchesStatus && matchesTerm;
    });
  }

  statusLabel(status: ReportRow['status']): string {
    return REPORT_STATUS_LABELS[status];
  }

  private mapReport(report: any): ReportRow {
    return {
      id: report.id_reports,
      itemTitle: report.item_title ?? `Artículo #${report.fk_items_id}`,
      reporter: report.reporter_username ?? `Usuario #${report.fk_user_reports_received}`,
      reportedUser: report.reported_username ?? `Usuario #${report.fk_user_reported}`,
      reason: report.reason,
      status: report.status === ReportStatus.Resolved ? 'resolved' : 'pending',
      date: report.report_date ? report.report_date.slice(0, 10) : '',
    };
  }
}
