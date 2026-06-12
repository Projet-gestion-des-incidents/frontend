import { Component } from '@angular/core';
import { DashboardAdminService, TicketDashboardDTO } from '../../../../shared/services/dashboard-admin.service';
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
  if (!this.ticketData) {
    console.error(' ticketData est null!');
    return;
  }
  
  let filename = '';
  
  switch (this.exportPeriod) {
    case 'jour':
      filename = `tickets_quotidiens_${this.getCurrentDate()}`;
      break;
    case 'semaine':
      filename = `tickets_hebdomadaires_${this.selectedYear}_${this.selectedMonth}`;
      break;
    case 'mois':
      const currentYear = new Date().getFullYear();
      filename = `tickets_mensuels_${currentYear}`;
      break;
    case 'annee':
      filename = `tickets_annuels_${this.selectedYear}`;
      break;
    default:
      filename = `tickets_${this.getCurrentDate()}`;
  }
  
  const evolutionData = this.getEvolutionSheet();
  this.exportExcelService.exportToExcelWithColors({
    filename: filename,
    sheetName: 'Évolution des tickets',
    data: evolutionData,
    columnColors: {
      'Date': { bgColor: 'FFFFFF', fontColor: '0C144E' },
      'Jour': { bgColor: 'FFFFFF', fontColor: '0C144E' },
      'Semaine': { bgColor: 'FFFFFF', fontColor: '0C144E' },
      'Mois': { bgColor: 'FFFFFF', fontColor: '0C144E' },
      'Tickets créés': { bgColor: 'ECECFF', fontColor: '8788FF' },
      'Non assignés': { bgColor: 'FEE2E2', fontColor: 'EF4444' },
      'Assignés': { bgColor: 'FFEDD5', fontColor: 'F97316' },
      'En cours': { bgColor: 'FEF3C7', fontColor: 'D97706' },
      'Résolus': { bgColor: 'D1FAE5', fontColor: '10B981' }
    },
    firstColumnBold: true,
    colorHeadersWithColumnColors: true,
    excludeFirstColumnDataFromColoring: true
  });
  
  this.closeExportModal();
}

private getEvolutionSheet(): any[] {
  if (!this.ticketData) return [];
  
  switch (this.exportPeriod) {
    case 'jour': {
      // Afficher les jours de la SEMAINE ACTUELLE (Lundi à Dimanche)
      const today = new Date();
      const currentDay = today.getDay();
      const monday = new Date(today);
      const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
      monday.setDate(today.getDate() - diffToMonday);
      
      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayData = this.ticketData!.statsParJour.find(d => 
          new Date(d.date).toISOString().split('T')[0] === dateStr
        );
        
        weekDays.push({
          'Date': date.toLocaleDateString('fr-FR'),
          'Jour': date.toLocaleDateString('fr-FR', { weekday: 'long' }),
          'Tickets créés': dayData?.crees || 0,
          'Non assignés': dayData?.nonAssigne || 0,
          'Assignés': dayData?.assignes || 0,
          'En cours': dayData?.enCours || 0,
          'Résolus': dayData?.resolus || 0
        });
      }
      return weekDays;
    }
 case 'semaine': {
  const year = this.selectedYear;
  const month = this.selectedMonth;
  
  // filtrer par DATE DE DÉBUT de la semaine
  const weeksInMonth = this.ticketData.statsParSemaine.filter(week => {
    const weekDate = new Date(week.date);
    // Prendre la date de DÉBUT de la semaine (le lundi)
    const startDate = new Date(weekDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // Dimanche de la même semaine
    
    // La semaine est dans le mois sélectionné si son DÉBUT est dans le mois
    return startDate.getFullYear() === year && 
           startDate.getMonth() + 1 === month;
  });
  
  // Si aucune semaine trouvée, prendre les 4 dernières semaines
  if (weeksInMonth.length === 0) {
    const sorted = [...this.ticketData.statsParSemaine]
      .filter(week => {
        const weekDate = new Date(week.date);
        return weekDate.getFullYear() === year && 
               (weekDate.getMonth() + 1) <= month;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4)
      .reverse();
    
    if (sorted.length > 0) {
      return sorted.map((week) => {
        const weekDate = new Date(week.date);
        const weekNumber = this.getWeekNumber(weekDate);
        return {
          'Semaine': `Semaine ${weekNumber} (du ${week.dateFormatee})`,
          'Tickets créés': week.crees,
          'Non assignés': week.nonAssigne,
          'Assignés': week.assignes,
          'En cours': week.enCours,
          'Résolus': week.resolus
        };
      });
    }
    
    return [{
      'Semaine': `Aucune donnée pour ${this.getMonthName(month)} ${year}`,
      'Tickets créés': 0,
      'Non assignés': 0,
      'Assignés': 0,
      'En cours': 0,
      'Résolus': 0
    }];
  }
  
  return weeksInMonth.map((week) => {
    const weekDate = new Date(week.date);
    const weekNumber = this.getWeekNumber(weekDate);
    
    return {
      'Semaine': `Semaine ${weekNumber} (du ${week.dateFormatee})`,
      'Tickets créés': week.crees,
      'Non assignés': week.nonAssigne,
      'Assignés': week.assignes,
      'En cours': week.enCours,
      'Résolus': week.resolus
    };
  });
}
      
    case 'mois': {
      // Afficher les MOIS de l'ANNÉE ACTUELLE
      const currentYear = new Date().getFullYear();
      const monthsInYear = this.ticketData.statsParMois.filter(month => 
        new Date(month.date).getFullYear() === currentYear
      );
      
      const getMonthNameFromDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        return monthNames[date.getMonth()];
      };
      
      return monthsInYear.map(month => ({
        'Mois': `${getMonthNameFromDate(month.date)} ${currentYear}`,
        'Tickets créés': month.crees,
        'Non assignés': month.nonAssigne,
        'Assignés': month.assignes,
        'En cours': month.enCours,
        'Résolus': month.resolus
      }));
    }
      
    case 'annee': {
      // Afficher les MOIS de l'ANNÉE SÉLECTIONNÉE
      const monthsInYear = this.ticketData.statsParMois.filter(month => 
        new Date(month.date).getFullYear() === this.selectedYear
      );
      
      const getMonthNameFromDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        return monthNames[date.getMonth()];
      };
      
      return monthsInYear.map(month => ({
        'Mois': `${getMonthNameFromDate(month.date)} ${this.selectedYear}`,
        'Tickets créés': month.crees,
        'Non assignés': month.nonAssigne,
        'Assignés': month.assignes,
        'En cours': month.enCours,
        'Résolus': month.resolus
      }));
    }
      
    default:
      return [];
  }
}

//  obtenir le numéro de semaine
private getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
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

  ngOnInit() {
    console.log(' Composant admin dashboard initialisé');
    this.loadTicketDashboard();
  }

  loadTicketDashboard() {
    console.log(' Chargement dashboard tickets...');
    this.loadingTickets = true;
    this.dashboardService.getTicketDashboard().subscribe({
      next: (response) => {
        console.log(' Tickets réponse:', response);
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
        console.error(' Erreur tickets:', err);
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
  let statsPeriode = this.getTicketStatsByPeriode();
  
  // Filtrer les données pour la période sélectionnée
  if (this.selectedPeriode === 'semaine') {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    statsPeriode = statsPeriode.filter(week => {
      const weekDate = new Date(week.date);
      const startOfWeek = new Date(weekDate);
      startOfWeek.setHours(0, 0, 0, 0);
      
      return startOfWeek.getFullYear() === currentYear && 
             startOfWeek.getMonth() === currentMonth;
    });
  }
  
  if (this.selectedPeriode === 'jour') {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = this.ticketData!.statsParJour.find(d => 
        new Date(d.date).toISOString().split('T')[0] === dateStr
      );
      
      if (dayData) {
        last7Days.push(dayData);
      } else {
        last7Days.push({
          date: date.toISOString(),
          dateFormatee: date.toLocaleDateString('fr-FR'),
          jour: date.toLocaleDateString('fr-FR', { weekday: 'long' }),
          crees: 0,
          nonAssigne: 0,
          assignes: 0,
          enCours: 0,
          resolus: 0
        });
      }
    }
    statsPeriode = last7Days;
  }
  
  this.chartEvolution = {
    series: [
      { name: 'Créés', data: statsPeriode.map(s => s.crees), color: '#cba9eb' },
      { name: 'Résolus', data: statsPeriode.map(s => s.resolus), color: '#86EFAC' },
      { name: 'En cours', data: statsPeriode.map(s => s.enCours), color: '#FDBA74' }
    ],
    chart: { 
      type: 'line', 
      height: 400, 
   toolbar: { 
  show: true,
  tools: {
    download: true  
  },
 export: {
          csv: false,    //  Désactive CSV seulement
          svg: {
            filename: 'evolution-tickets'
          },
          png: {
            filename: 'evolution-tickets'
          }
        }
      
}, 
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
    case 'jour': 
      return this.getCurrentWeekDays(); //  Renvoie les 7 jours de la semaine actuelle
    
    case 'semaine': 
      return this.getCurrentMonthWeeks(); //  Renvoie les semaines du mois actuel
    
    case 'mois': 
      return this.ticketData.statsParMois;
    
    default: 
      return this.ticketData.statsParSemaine;
  }
}

//  obtenir les jours de la semaine actuelle
private getCurrentWeekDays(): any[] {
  const today = new Date();
  const currentDay = today.getDay();
  const monday = new Date(today);
  const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
  monday.setDate(today.getDate() - diffToMonday);
  
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayData = this.ticketData!.statsParJour.find(d => 
      new Date(d.date).toISOString().split('T')[0] === dateStr
    );
    
    if (dayData) {
      weekDays.push(dayData);
    } else {
      // Créer une entrée vide si pas de données
      weekDays.push({
        date: date.toISOString(),
        dateFormatee: date.toLocaleDateString('fr-FR'),
        jour: date.toLocaleDateString('fr-FR', { weekday: 'long' }),
        crees: 0,
        nonAssigne: 0,
        assignes: 0,
        enCours: 0,
        resolus: 0
      });
    }
  }
  return weekDays;
}

//  obtenir les semaines du mois actuel
private getCurrentMonthWeeks(): any[] {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Filtrer les semaines qui commencent dans le mois actuel OU qui chevauchent le mois
  const weeksInMonth = this.ticketData!.statsParSemaine.filter(week => {
    const weekDate = new Date(week.date);
    const weekStart = new Date(weekDate);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    // La semaine est dans le mois si son début OU sa fin est dans le mois
    return (weekStart.getFullYear() === currentYear && weekStart.getMonth() === currentMonth) ||
           (weekEnd.getFullYear() === currentYear && weekEnd.getMonth() === currentMonth);
  });
  
  // Trier par date
  weeksInMonth.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Limiter au maximum 5 semaines (un mois peut avoir 4 ou 5 semaines)
  return weeksInMonth.slice(0, 5);
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