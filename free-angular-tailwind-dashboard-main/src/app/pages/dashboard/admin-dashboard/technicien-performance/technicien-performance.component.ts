// technicien-performance.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

import { DashboardAdminService, TicketDashboardDTO } from '../../../../shared/services/dashboard-admin.service';
@Pipe({
  name: 'orderBy',
  standalone: true
})
export class OrderByPipe implements PipeTransform {
  transform(array: any[], field: string, reverse: boolean = false): any[] {
    if (!Array.isArray(array)) return array;
    const sorted = [...array].sort((a, b) => (a[field] > b[field] ? 1 : -1));
    return reverse ? sorted.reverse() : sorted;
  }
}
@Component({
  selector: 'app-technicien-performance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './technicien-performance.component.html',
  styleUrls: ['./technicien-performance.component.css']
})
export class TechnicienPerformanceComponent implements OnInit {
  ticketData: TicketDashboardDTO | null = null;
  loading = true;
  error: string | null = null;

  constructor(private dashboardService: DashboardAdminService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.dashboardService.getTicketDashboard().subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.ticketData = response.data;
        } else {
          this.error = response.message || 'Erreur chargement';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Impossible de charger les données';
        this.loading = false;
      }
    });
  }
}