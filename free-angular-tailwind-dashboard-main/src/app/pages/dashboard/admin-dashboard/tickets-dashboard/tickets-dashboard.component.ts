import { Component } from '@angular/core';
import { DashboardAdminService, IncidentDashboardDTO, TicketDashboardDTO } from '../../../../shared/services/dashboard-admin.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownComponent } from '../../../../shared/components/ui/dropdown/dropdown.component';
import { DropdownItemComponent } from '../../../../shared/components/ui/dropdown/dropdown-item/dropdown-item.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ExportExcelService } from '../../../../shared/services/export-excel.service';

@Component({
  selector: 'app-tickets',
  imports: [CommonModule, FormsModule, NgApexchartsModule, DropdownComponent, DropdownItemComponent],
  templateUrl: './tickets-dashboard.component.html',
  styleUrl: './tickets-dashboard.component.css',
})
export class TicketsDashboardComponent {
  // Graphiques Tickets
  chartDonut: any;
  chartEvolution: any;
  chartResolution: any;
  chartTechniciens: any;
  
  // Données
  ticketData: TicketDashboardDTO | null = null;
  
  // États de chargement
  loadingTickets = true;
  errorTickets: string | null = null;
  errorIncidents: string | null = null;
  
  // Onglet actif
  activeTab: 'tickets' | 'incidents' = 'tickets';
  
  // Période sélectionnée
  selectedPeriode: 'jour' | 'semaine' | 'mois' = 'semaine';
  
  // Dropdown
  isOpen = false;
  
  // Champs pour l'export
  showExportModal = false;
  exportPeriod: 'jour' | 'semaine' | 'mois' | 'annee' = 'mois';
  exportYears: number[] = [];
  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;
  
  // Indicateurs délais
  totalAvantDelai = 0;
  totalApresDelai = 0;
  tauxRespectDelai = 0;
  tendanceRespectDelai = '';
  messageRespectDelai = '';

  constructor(
    private dashboardService: DashboardAdminService,
    private exportExcelService: ExportExcelService
  ) {
    this.initYears();
  }

  // ==================== MÉTHODES D'EXPORT ====================
  
  initYears() {
    const currentYear = new Date().getFullYear();
    this.exportYears = [];
    for (let i = currentYear - 2; i <= currentYear; i++) {
      this.exportYears.push(i);
    }
  }

  openExportModal() {
    this.showExportModal = true;
  }

  closeExportModal() {
    this.showExportModal = false;
  }

  exportData() {
    if (!this.ticketData) return;
    
    let data: any[] = [];
    let filename = '';
    let sheetName = '';
    
    switch (this.exportPeriod) {
      case 'jour':
        data = this.getDataForDay();
        filename = `tickets_quotidiens_${this.getCurrentDate()}`;
        sheetName = 'Tickets par jour';
        break;
      case 'semaine':
        data = this.getDataForWeek();
        filename = `tickets_hebdomadaires_${this.getCurrentDate()}`;
        sheetName = 'Tickets par semaine';
        break;
      case 'mois':
        data = this.getDataForMonth();
        filename = `tickets_mensuels_${this.selectedYear}_${this.selectedMonth}`;
        sheetName = `Tickets ${this.getMonthName(this.selectedMonth)} ${this.selectedYear}`;
        break;
      case 'annee':
        data = this.getDataForYear();
        filename = `tickets_annuels_${this.selectedYear}`;
        sheetName = `Tickets ${this.selectedYear}`;
        break;
    }
    
    this.exportExcelService.exportToExcel({
      filename: filename,
      sheetName: sheetName,
      data: data
    });
    
    this.closeExportModal();
  }

  private getDataForDay(): any[] {
    return this.ticketData!.statsParJour.map(day => ({
      'Date': day.dateFormatee,
      'Jour': day.jour,
      'Tickets créés': day.crees,
      'Non assignés': day.nonAssigne,
      'Assignés': day.assignes,
      'En cours': day.enCours,
      'Résolus': day.resolus
    }));
  }

  private getDataForWeek(): any[] {
    return this.ticketData!.statsParSemaine.map((week, index) => ({
      'Semaine N°': index + 1,
      'Date début': week.dateFormatee,
      'Tickets créés': week.crees,
      'Non assignés': week.nonAssigne,
      'Assignés': week.assignes,
      'En cours': week.enCours,
      'Résolus': week.resolus
    }));
  }

  private getDataForMonth(): any[] {
    const filtered = this.ticketData!.statsParMois.filter(month => 
      new Date(month.date).getFullYear() === this.selectedYear &&
      new Date(month.date).getMonth() + 1 === this.selectedMonth
    );
    
    return filtered.map(month => ({
      'Mois': month.jour,
      'Date': month.dateFormatee,
      'Tickets créés': month.crees,
      'Non assignés': month.nonAssigne,
      'Assignés': month.assignes,
      'En cours': month.enCours,
      'Résolus': month.resolus
    }));
  }

  private getDataForYear(): any[] {
    const filtered = this.ticketData!.statsParMois.filter(month => 
      new Date(month.date).getFullYear() === this.selectedYear
    );
    
    return filtered.map(month => ({
      'Mois': month.jour,
      'Tickets créés': month.crees,
      'Non assignés': month.nonAssigne,
      'Assignés': month.assignes,
      'En cours': month.enCours,
      'Résolus': month.resolus
    }));
  }

  private getMonthName(month: number): string {
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return months[month - 1];
  }

  private getCurrentDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }

  // ==================== FIN MÉTHODES D'EXPORT ====================

  ngOnInit() {
    console.log('🟢 Composant admin dashboard initialisé');
    this.loadTicketDashboard();
  }

  loadTicketDashboard() {
    console.log('🔄 Chargement dashboard tickets...');
    this.loadingTickets = true;
    this.dashboardService.getTicketDashboard().subscribe({
      next: (response) => {
        console.log('📊 Tickets réponse:', response);
        if (response.isSuccess && response.data) {
          this.ticketData = response.data;
          this.initTicketCharts();
          this.updateResolutionStats();
        } else {
          this.errorTickets = response.message || 'Erreur chargement dashboard tickets';
        }
        this.loadingTickets = false;
      },
      error: (err) => {
        console.error('❌ Erreur tickets:', err);
        this.errorTickets = 'Impossible de charger le dashboard des tickets';
        this.loadingTickets = false;
      }
    });
  }

  // ==================== GRAPHIQUES TICKETS ====================
  initTicketCharts() {
    if (!this.ticketData) return;
    
    this.updateResolutionStats();
    this.initTicketResolutionChart();
    this.initTicketDonutChart();
    this.initTicketEvolutionChart();
  }

  initTicketDonutChart() {
    const couleursParStatut: { [key: string]: string[] } = {
      'Non assigné': ['#FCA5A5', '#F87171'],
      'Assigné': ['#FCD34D', '#FBBF24'],
      'En cours': ['#FDBA74', '#FB923C'],
      'Résolu': ['#A7F3D0', '#6EE7B7']
    };
    
    const couleurs = this.ticketData!.statsParStatut.map(s => couleursParStatut[s.statut]?.[0] || s.color);
    
    this.chartDonut = {
      series: this.ticketData!.statsParStatut.map(s => s.count),
      chart: { 
        type: 'donut', 
        height: 350, 
        toolbar: { show: false },
        fontFamily: 'Poppins, system-ui, sans-serif'
      },
      labels: this.ticketData!.statsParStatut.map(s => s.statut),
      colors: couleurs,
      legend: { 
        position: 'bottom', 
        show: true, 
        fontSize: '12px',
        fontFamily: 'Poppins, system-ui, sans-serif'
      },
      dataLabels: { 
        enabled: true, 
        formatter: (val: number) => `${val.toFixed(1)}%`,
        style: { fontFamily: 'Poppins, system-ui, sans-serif', fontSize: '12px' }
      },
      plotOptions: { 
        pie: { 
          donut: { 
            size: '65%', 
            labels: { 
              show: true, 
              total: { 
                show: true, 
                label: 'Total', 
                formatter: () => `${this.ticketData!.overview.totalTickets} tickets`,
                style: { fontFamily: 'Poppins, system-ui, sans-serif' }
              } 
            } 
          } 
        } 
      },
      tooltip: { 
        y: { formatter: (val: number) => `${val} tickets` },
        style: { fontFamily: 'Poppins, system-ui, sans-serif' }
      }
    };
  }

  initTicketEvolutionChart() {
    const statsPeriode = this.getTicketStatsByPeriode();
    this.chartEvolution = {
      series: [
        { name: 'Créés', data: statsPeriode.map(s => s.crees), color: '#cba9eb' },
        { name: 'Résolus', data: statsPeriode.map(s => s.resolus), color: '#86EFAC' },
        { name: 'En cours', data: statsPeriode.map(s => s.enCours), color: '#FDBA74' }
      ],
      chart: { 
        type: 'line', 
        height: 400, 
        toolbar: { show: true }, 
        zoom: { enabled: false },
        fontFamily: 'Poppins, system-ui, sans-serif'
      },
      xaxis: { 
        categories: statsPeriode.map(s => s.dateFormatee), 
        title: { text: 'Date', style: { fontFamily: 'Poppins, system-ui, sans-serif' } },
        labels: { style: { fontFamily: 'Poppins, system-ui, sans-serif' } }
      },
      yaxis: { 
        title: { text: 'Nombre de tickets', style: { fontFamily: 'Poppins, system-ui, sans-serif' } },
        labels: { style: { fontFamily: 'Poppins, system-ui, sans-serif' } }
      },
      stroke: { curve: 'smooth', width: 3 },
      markers: { size: 5 },
      tooltip: { 
        shared: true,
        style: { fontFamily: 'Poppins, system-ui, sans-serif' }
      },
      legend: { 
        position: 'top',
        fontFamily: 'Poppins, system-ui, sans-serif'
      },
      colors: ['#8788FF', '#10B981', '#F59E0B']
    };
  }

  initTicketResolutionChart() {
    const total = this.totalAvantDelai + this.totalApresDelai;
    const tauxGlobal = total > 0 ? (this.totalAvantDelai / total) * 100 : 0;
    
    this.chartResolution = {
      series: [tauxGlobal],
      chart: { 
        type: 'radialBar', 
        height: 350, 
        toolbar: { show: false },
        fontFamily: 'Poppins, system-ui, sans-serif'
      },
      plotOptions: {
        radialBar: {
          startAngle: -90,
          endAngle: 90,
          hollow: { size: '65%' },
          track: { background: '#ebe5e5', strokeWidth: '100%' },
          dataLabels: {
            name: { 
              show: true, 
              fontSize: '14px',
              fontFamily: 'Poppins, system-ui, sans-serif',
              offsetY: -10 
            },
            value: { 
              show: true, 
              fontSize: '28px',
              fontFamily: 'Poppins, system-ui, sans-serif',
              offsetY: 10, 
              formatter: (val: number) => `${Math.round(val)}%`
            },
            total: { 
              show: true, 
              label: 'Taux respect',
              fontFamily: 'Poppins, system-ui, sans-serif',
              formatter: () => `${Math.round(tauxGlobal)}%`
            }
          }
        }
      },
      fill: { colors: ['#86EFAC'] },
      labels: ['Avant délai']
    };
  }

  // ==================== UTILITAIRES ====================
  updateResolutionStats() {
    if (!this.ticketData) return;
    
    this.totalAvantDelai = this.ticketData.statsResolution.ticketsResolusAvantDelai || 0;
    this.totalApresDelai = this.ticketData.statsResolution.ticketsResolusApresDelai || 0;
    
    const total = this.totalAvantDelai + this.totalApresDelai;
    this.tauxRespectDelai = total > 0 ? Math.round((this.totalAvantDelai / total) * 100) : 0;
    this.messageRespectDelai = `${this.totalAvantDelai} tickets résolus avant la date limite sur ${total} tickets avec délai. Taux de respect: ${this.tauxRespectDelai}%.`;
    this.tendanceRespectDelai = `Basé sur ${total} tickets avec délai`;
  }

  getTicketStatsByPeriode() {
    if (!this.ticketData) return [];
    switch (this.selectedPeriode) {
      case 'jour': return this.ticketData.statsParJour;
      case 'semaine': return this.ticketData.statsParSemaine;
      case 'mois': return this.ticketData.statsParMois;
      default: return this.ticketData.statsParSemaine;
    }
  }

  getTicketResolutionByPeriode() {
    if (!this.ticketData) return [];
    switch (this.selectedPeriode) {
      case 'jour': return this.ticketData.resolutionParJour;
      case 'semaine': return this.ticketData.resolutionParSemaine;
      case 'mois': return this.ticketData.resolutionParMois;
      default: return this.ticketData.resolutionParSemaine;
    }
  }
  
  changePeriode(periode: 'jour' | 'semaine' | 'mois') {
    this.selectedPeriode = periode;
    if (this.activeTab === 'tickets') {
      this.initTicketEvolutionChart();
      this.updateResolutionStats();
      this.initTicketResolutionChart();
    } 
  }

  setActiveTab(tab: 'tickets' | 'incidents') {
    this.activeTab = tab;
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  get isLoading(): boolean {
    return (this.activeTab === 'tickets' && this.loadingTickets);
  }

  get currentError(): string | null {
    return this.activeTab === 'tickets' ? this.errorTickets : this.errorIncidents;
  }
}