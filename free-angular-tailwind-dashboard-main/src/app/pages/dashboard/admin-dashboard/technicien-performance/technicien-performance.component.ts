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
  
  // ✅ Utiliser assignationParTechnicien (contient les nouvelles propriétés)
  const techniciansData = (this.ticketData.assignationParTechnicien || []).map(tech => ({
    'Technicien': `${tech.prenom} ${tech.nom}`,
    'Tickets assignés': tech.ticketsAssignes,
    'Tickets en cours': tech.ticketsEnCours,
    'Tickets résolus': tech.ticketsResolus,
    'Total tickets': tech.totalTicketsTechnicien,
    'Résolus avant délai': tech.ticketsResolusAvantDateLimite || 0,
    'Résolus après délai': tech.ticketsResolusApresDateLimite || 0,
    'Taux de résolution': `${tech.tauxResolution}%`,
    'Performance': this.getPerformanceLabel(tech.tauxResolution)
  }));
  
  this.exportExcelService.exportToExcelWithColors({
    filename: `performance_techniciens_${this.getCurrentDate()}`,
    sheetName: 'Performance Techniciens',
    data: techniciansData,
    boldFirstColumn: true,
    colorRules: [
      {
        column: 'Taux de résolution',
        getRowColor: (value: string) => {
          const taux = parseFloat(value);
          if (taux >= 70) return { bgColor: 'D1FAE5', fontColor: '065F46' };
          if (taux >= 50 && taux < 70) return { bgColor: 'FEF3C7', fontColor: '92400E' };
          return { bgColor: 'FEE2E2', fontColor: '991B1B' };
        }
      },
      {
        column: 'Taux respect délai',
        getRowColor: (value: string) => {
          const taux = parseFloat(value);
          if (taux >= 80) return { bgColor: 'D1FAE5', fontColor: '065F46' };
          if (taux >= 50 && taux < 80) return { bgColor: 'FEF3C7', fontColor: '92400E' };
          return { bgColor: 'FEE2E2', fontColor: '991B1B' };
        }
      }
    ]
  });
  
  this.closeExportModal();
}
// technicien-performance.component.ts
getTauxResolutionClass(taux: number): string {
  if (taux >= 70) {
    return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
  } else if (taux >= 50) {
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
  } else {
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
  }
}
get activeTechnicians() {
  if (!this.ticketData?.assignationParTechnicien) return [];
  return this.ticketData.assignationParTechnicien
    .filter(tech => tech.totalTicketsTechnicien > 0)
    .sort((a, b) => b.totalTicketsTechnicien - a.totalTicketsTechnicien);
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