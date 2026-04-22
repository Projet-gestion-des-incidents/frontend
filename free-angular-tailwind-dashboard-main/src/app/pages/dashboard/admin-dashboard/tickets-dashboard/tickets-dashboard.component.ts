import { Component } from '@angular/core';
import { DashboardAdminService, IncidentDashboardDTO, TicketDashboardDTO } from '../../../../shared/services/dashboard-admin.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownComponent } from '../../../../shared/components/ui/dropdown/dropdown.component';
import { DropdownItemComponent } from '../../../../shared/components/ui/dropdown/dropdown-item/dropdown-item.component';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-tickets',
  imports: [    CommonModule,
    FormsModule,
    NgApexchartsModule,
    DropdownComponent,
    DropdownItemComponent],
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
  
  // Indicateurs délais
  totalAvantDelai = 0;
  totalApresDelai = 0;
  tauxRespectDelai = 0;
  tendanceRespectDelai = '';
  messageRespectDelai = '';
    constructor(private dashboardService: DashboardAdminService) {}
  
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
  
  // ✅ 1. D'abord mettre à jour les statistiques
  this.updateResolutionStats();
  
  // ✅ 2. Ensuite initialiser les graphiques qui dépendent de ces stats
  this.initTicketResolutionChart();
  
  // ✅ 3. Puis le reste des graphiques
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
  console.log('📊 === DÉBUT initTicketResolutionChart ===');
  console.log('📊 totalAvantDelai:', this.totalAvantDelai);
  console.log('📊 totalApresDelai:', this.totalApresDelai);
  
  const total = this.totalAvantDelai + this.totalApresDelai;
  console.log('📊 Total des tickets résolus (avec délai):', total);
  
  const tauxGlobal = total > 0 ? (this.totalAvantDelai / total) * 100 : 0;
  console.log('📊 Taux de respect calculé (brut):', tauxGlobal, '%');
  console.log('📊 Taux de respect arrondi:', Math.round(tauxGlobal), '%');
  
  // Vérification des cas particuliers
  if (total === 0) {
    console.warn('⚠️ Aucun ticket résolu avec date limite - le taux sera affiché à 0%');
  }
  if (this.totalAvantDelai === 0 && total > 0) {
    console.warn('⚠️ Aucun ticket résolu avant délai - le taux est à 0%');
  }
  if (this.totalAvantDelai === total && total > 0) {
    console.log('✅ Tous les tickets ont été résolus avant délai - taux à 100%');
  }
  
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
            formatter: (val: number) => {
              const rounded = Math.round(val);
              console.log(`📊 Chart formatter - valeur: ${val}, arrondi: ${rounded}%`);
              return `${rounded}%`;
            }
          },
          total: { 
            show: true, 
            label: 'Taux respect',
            fontFamily: 'Poppins, system-ui, sans-serif',
            formatter: () => {
              const rounded = Math.round(tauxGlobal);
              console.log(`📊 Total formatter - taux affiché: ${rounded}%`);
              return `${rounded}%`;
            }
          }
        }
      }
    },
    fill: { colors: ['#86EFAC'] },
    labels: ['Avant délai']
  };
  
  console.log('✅ Graphique chartResolution configuré avec succès');
  console.log('📊 Série envoyée:', this.chartResolution.series);
  console.log('📊 === FIN initTicketResolutionChart ===\n');
}
  // ==================== UTILITAIRES ====================
 updateResolutionStats() {
  if (!this.ticketData) return;
  
  // Utiliser directement les données globales de statsResolution
  this.totalAvantDelai = this.ticketData.statsResolution.ticketsResolusAvantDelai || 0;
  this.totalApresDelai = this.ticketData.statsResolution.ticketsResolusApresDelai || 0;
  
  console.log('📊 updateResolutionStats - Données globales:');
  console.log('   - ticketsResolusAvantDelai:', this.totalAvantDelai);
  console.log('   - ticketsResolusApresDelai:', this.totalApresDelai);
  console.log('   - ticketsSansDateLimite:', this.ticketData.statsResolution.ticketsSansDateLimite);
  console.log('   - tauxRespectDelai (API):', this.ticketData.statsResolution.tauxRespectDelai);
  
  const total = this.totalAvantDelai + this.totalApresDelai;
  this.tauxRespectDelai = total > 0 ? Math.round((this.totalAvantDelai / total) * 100) : 0;
  
  console.log('   - Total avec délai:', total);
  console.log('   - Taux calculé:', this.tauxRespectDelai, '%');
  
  // Message pour l'affichage
  this.messageRespectDelai = `${this.totalAvantDelai} tickets résolus avant la date limite sur ${total} tickets avec délai. Taux de respect: ${this.tauxRespectDelai}%.`;
  
  // Tendance (optionnelle - basée sur les données globales)
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
    return (this.activeTab === 'tickets' && this.loadingTickets) 
  }

  get currentError(): string | null {
    return this.activeTab === 'tickets' ? this.errorTickets : this.errorIncidents;
  }
}
