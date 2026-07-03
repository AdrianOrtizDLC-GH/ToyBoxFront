import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AdminNavigationComponent } from '../../../shared/components/admin-navigation/admin-navigation';

interface DashboardMetric {
  label: string;
  value: number | string;
  detail: string;
  tone: 'blue' | 'green' | 'amber' | 'red';
}

interface AdminTask {
  title: string;
  owner: string;
  status: string;
}

interface ChartItem {
  label: string;
  value: number;
  percent: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [AdminNavigationComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class AdminDashboardComponent implements OnInit {
  metrics: DashboardMetric[] = [];
  tasks: AdminTask[] = [];
  chartItems: ChartItem[] = [];
  isLoading = true;
  error = '';

  constructor(private http: HttpClient, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading = true;
    this.error = '';

    this.http.get<any>(`${environment.apiUrl}/admin/stats`).subscribe({
      next: stats => {
        const activeUsers = this.findTotal(stats.users_by_status, 'status', 'active');
        const blockedUsers = this.findTotal(stats.users_by_status, 'status', 'blocked');
        const publishedItems = this.findTotal(stats.items_by_status, 'conservation_status', 'published');
        const pendingReports = stats.pending_reports ?? 0;
        const pendingReservations = stats.pending_reservations ?? 0;
        const topCategories = stats.top_categories ?? [];

        this.metrics = [
          {
            label: 'Usuarios activos',
            value: activeUsers,
            detail: `${blockedUsers} bloqueados`,
            tone: 'blue',
          },
          {
            label: 'Artículos publicados',
            value: publishedItems,
            detail: `${pendingReservations} reservas pendientes`,
            tone: 'green',
          },
          {
            label: 'Categorías top',
            value: topCategories.length,
            detail: topCategories[0]?.name ?? 'Sin datos',
            tone: 'amber',
          },
          {
            label: 'Reportes pendientes',
            value: pendingReports,
            detail: pendingReports > 0 ? 'Requieren revisión' : 'Sin pendientes',
            tone: 'red',
          },
        ];

        this.tasks = this.buildTasks(pendingReports, pendingReservations, blockedUsers);
        this.chartItems = this.buildChartItems(activeUsers, publishedItems, pendingReports);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.error = 'Error al cargar las estadísticas del panel.';
        this.isLoading = false;
        this.cdr.markForCheck();
        console.error('Error cargando stats admin:', err);
      },
    });
  }

  private buildTasks(pendingReports: number, pendingReservations: number, blockedUsers: number): AdminTask[] {
    const tasks: AdminTask[] = [];

    if (pendingReports > 0) {
      tasks.push({
        title: `Revisar ${pendingReports} reportes pendientes`,
        owner: 'Moderación',
        status: 'Pendiente',
      });
    }

    if (pendingReservations > 0) {
      tasks.push({
        title: `Gestionar ${pendingReservations} reservas pendientes`,
        owner: 'Soporte',
        status: 'Pendiente',
      });
    }

    if (blockedUsers > 0) {
      tasks.push({
        title: `Revisar ${blockedUsers} cuentas bloqueadas`,
        owner: 'Administración',
        status: 'Pendiente',
      });
    }

    return tasks.length ? tasks : [{ title: 'Sin tareas pendientes', owner: 'Sistema', status: 'OK' }];
  }

  private buildChartItems(activeUsers: number, publishedItems: number, pendingReports: number): ChartItem[] {
    const maxValue = Math.max(activeUsers, publishedItems, pendingReports, 1);

    return [
      { label: 'Usuarios', value: activeUsers, percent: this.toPercent(activeUsers, maxValue) },
      { label: 'Artículos', value: publishedItems, percent: this.toPercent(publishedItems, maxValue) },
      { label: 'Reportes', value: pendingReports, percent: this.toPercent(pendingReports, maxValue) },
    ];
  }

  private findTotal(rows: any[] | undefined, key: string, value: string): number {
    return rows?.find(row => row[key] === value)?.total ?? 0;
  }

  private toPercent(value: number, maxValue: number): number {
    return Math.max(8, Math.round((value / maxValue) * 100));
  }
}
