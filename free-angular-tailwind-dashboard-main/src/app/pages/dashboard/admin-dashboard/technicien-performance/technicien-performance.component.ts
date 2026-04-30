// technicien-performance.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardAdminService, TicketDashboardDTO } from '../../../../shared/services/dashboard-admin.service';
import { ExportExcelService } from '../../../../shared/services/export-excel.service';

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
  showExportModal = false;

  constructor(
    private dashboardService: DashboardAdminService,
    private exportExcelService: ExportExcelService
  ) {}

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

  openExportModal() {
    this.showExportModal = true;
  }

  closeExportModal() {
    this.showExportModal = false;
  }

  exportData() {
    if (!this.ticketData) return;
    
    const techniciansData = this.ticketData.topTechniciens.map(tech => ({
      'Technicien': `${tech.prenom} ${tech.nom}`,
      'Tickets assignés': tech.ticketsAssignes,
      'Tickets en cours': tech.ticketsEnCours,
      'Tickets résolus': tech.ticketsResolus,
      'Total tickets': tech.ticketsTotal,
      'Taux de résolution': `${tech.tauxResolution}%`,
      'Performance': this.getPerformanceLabel(tech.tauxResolution)
    }));
    
    // ✅ Export avec couleurs et première colonne en gras
    this.exportExcelService.exportToExcelWithColors({
      filename: `performance_techniciens_${this.getCurrentDate()}`,
      sheetName: 'Performance Techniciens',
      data: techniciansData,
      boldFirstColumn: true,  // ✅ Met la colonne Technicien en gras
      colorRules: [
        {
          column: 'Taux de résolution',
          getRowColor: (value: string) => {
            const taux = parseFloat(value);
            if (taux >= 70) {
              return { bgColor: 'D1FAE5', fontColor: '065F46' };
            }
            if (taux >= 50 && taux < 70) {
              return { bgColor: 'FEF3C7', fontColor: '92400E' };
            }
            return { bgColor: 'FEE2E2', fontColor: '991B1B' };
          }
        }
      ]
    });
    
    this.closeExportModal();
  }

  private getPerformanceLabel(taux: number): string {
    if (taux >= 70) return 'Excellent';
    if (taux >= 50) return 'Bon';
    return 'Faible';
  }

  private getCurrentDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }
}