import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { CheckboxComponent } from '../../../shared/components/form/input/checkbox.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import { 
  DashboardAdminService, 
  TicketDashboardDTO, 
  IncidentDashboardDTO 
} from '../../../shared/services/dashboard-admin.service';
import { NgApexchartsModule } from 'ng-apexcharts';
import { DropdownComponent } from '../../../shared/components/ui/dropdown/dropdown.component';
import { DropdownItemComponent } from '../../../shared/components/ui/dropdown/dropdown-item/dropdown-item.component';
import { StatisticsChartComponent } from '../../../shared/components/ecommerce/statics-chart/statics-chart.component';
import { ChartTabComponent } from '../../../shared/components/common/chart-tab/chart-tab.component';
import flatpickr from 'flatpickr';
import { Instance } from 'flatpickr/dist/types/instance';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    DropdownComponent,
    DropdownItemComponent,
    AlertComponent,
    CheckboxComponent,ChartTabComponent,
    BadgeComponent,
    ButtonComponent,
    NgApexchartsModule
  ],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit , AfterViewInit {
  
  @ViewChild('datepicker') datepicker!: ElementRef<HTMLInputElement>;
  
  // Données
  ticketData: TicketDashboardDTO | null = null;
  incidentData: IncidentDashboardDTO | null = null;
  
  // États de chargement
  loadingTickets = true;
  loadingIncidents = true;
  errorTickets: string | null = null;
  errorIncidents: string | null = null;
  
  // Onglet actif
  activeTab: 'tickets' | 'incidents' = 'tickets';
  
  // Période sélectionnée
  selectedPeriode: 'jour' | 'semaine' | 'mois' = 'semaine';
  
  // Graphiques Tickets
  chartDonut: any;
  chartEvolution: any;
  chartResolution: any;
  chartTechniciens: any;
  
  // Graphiques Incidents
  chartIncidentDonut: any;
  chartIncidentEvolution: any;
  chartSeveriteRadial: any;
  chartTypeProbleme: any;
  
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
    this.loadIncidentDashboard();
  }
 ngAfterViewInit() {
    // Initialiser flatpickr APRÈS que la vue soit chargée
    if (this.datepicker) {
      flatpickr(this.datepicker.nativeElement, {
        mode: 'range',
        static: true,
        monthSelectorType: 'static',
        dateFormat: 'M j',
        defaultDate: [new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), new Date()],
        onReady: (selectedDates: Date[], dateStr: string, instance: Instance) => {
          (instance.element as HTMLInputElement).value = dateStr.replace('to', '-');
          const customClass = instance.element.getAttribute('data-class');
          instance.calendarContainer?.classList.add(customClass!);
        },
        onChange: (selectedDates: Date[], dateStr: string, instance: Instance) => {
          (instance.element as HTMLInputElement).value = dateStr.replace('to', '-');
        },
      });
    }
  }
  // ==================== CHARGEMENT DES DONNÉES ====================
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

  loadIncidentDashboard() {
    console.log('🔄 Chargement dashboard incidents...');
    this.loadingIncidents = true;
    this.dashboardService.getIncidentDashboard().subscribe({
      next: (response) => {
        console.log('📊 Incidents réponse:', response);
        if (response.isSuccess && response.data) {
          this.incidentData = response.data;
          this.initIncidentCharts();
        } else {
          this.errorIncidents = response.message || 'Erreur chargement dashboard incidents';
        }
        this.loadingIncidents = false;
      },
      error: (err) => {
        console.error('❌ Erreur incidents:', err);
        this.errorIncidents = 'Impossible de charger le dashboard des incidents';
        this.loadingIncidents = false;
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

  // ==================== GRAPHIQUES INCIDENTS ====================
  initIncidentCharts() {
    if (!this.incidentData) return;
    this.initIncidentDonutChart();
    this.initIncidentEvolutionChart();
    this.initSeveriteRadialChart();
    this.initTypeProblemeChart();
  }

  initIncidentDonutChart() {
    const couleursParStatut: { [key: string]: string } = {
      'Non traité': '#FCA5A5',
      'En cours': '#FDBA74',
      'Fermé': '#A7F3D0'
    };
    
    const couleurs = this.incidentData!.statsParStatut.map(s => couleursParStatut[s.statut] || s.color);
    
    this.chartIncidentDonut = {
      series: this.incidentData!.statsParStatut.map(s => s.count),
      chart: { 
        type: 'donut', 
        height: 350, 
        toolbar: { show: false },
        fontFamily: 'Poppins, system-ui, sans-serif'
      },
      labels: this.incidentData!.statsParStatut.map(s => s.statut),
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
        style: { fontFamily: 'Poppins, system-ui, sans-serif' }
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
                style: { fontFamily: 'Poppins, system-ui, sans-serif' },
                formatter: () => `${this.incidentData!.overview.totalIncidents} incidents` 
              } 
            } 
          } 
        } 
      },
      tooltip: { 
        y: { formatter: (val: number) => `${val} incidents` },
        style: { fontFamily: 'Poppins, system-ui, sans-serif' }
      }
    };
  }

  initIncidentEvolutionChart() {
    const statsPeriode = this.getIncidentStatsByPeriode();
    this.chartIncidentEvolution = {
      series: [
        { name: 'Créés', data: statsPeriode.map(s => s.crees), color: '#8788FF' },
        { name: 'Fermés', data: statsPeriode.map(s => s.ferme), color: '#10B981' },
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
        title: { text: "Nombre d'incidents", style: { fontFamily: 'Poppins, system-ui, sans-serif' } },
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

  // Graphique Radial Bar pour la sévérité avec police Poppins
  initSeveriteRadialChart() {
    if (!this.incidentData?.resolutionParSeverite) return;
    
    const data = this.incidentData.resolutionParSeverite.filter(s => s.nombreIncidents > 0);
    
    // Palette de couleurs pastel harmonisées
    const pastelColors: { [key: string]: string } = {
      'Non définie': '#9CA3AF',  // Gris pastel
      'Faible': '#86EFAC',       // Vert pastel
      'Moyenne': '#FDE047',      // Jaune pastel
      'Forte': '#FCA5A5'         // Rouge pastel
    };
    
    const chartColors = data.map(s => pastelColors[s.severite] || s.color || '#CBD5E1');
    
    this.chartSeveriteRadial = {
      series: data.map(s => s.tauxResolution),
      chart: {
        type: 'radialBar',
        height: 420,
        toolbar: { show: false },
        fontFamily: 'Poppins, system-ui, sans-serif'
      },
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          hollow: { size: '30%' },
          track: {
            background: '#F1F5F9',
            strokeWidth: '97%',
            margin: 5,
            dropShadow: { enabled: false }
          },
          dataLabels: {
            name: {
              fontSize: '13px',
              fontFamily: 'Poppins, system-ui, sans-serif',
              fontWeight: 600,
              color: '#475569',
              offsetY: -5
            },
            value: {
              fontSize: '18px',
              fontFamily: 'Poppins, system-ui, sans-serif',
              fontWeight: 'bold',
              color: '#1E293B',
              offsetY: 5,
              formatter: (val: number) => `${Math.round(val)}%`
            }
          }
        }
      },
      labels: data.map(s => s.severite),
      colors: chartColors,
      stroke: { lineCap: 'round', width: 2 },
      fill: { opacity: 0.9, type: 'solid' },
      title: {
        text: 'Taux de résolution par sévérité',
        align: 'center',
        margin: 10,
        style: { 
          fontSize: '15px', 
          fontWeight: '600', 
          color: '#1E293B', 
          fontFamily: 'Poppins, system-ui, sans-serif' 
        }
      },
      tooltip: {
        enabled: true,
        style: { fontFamily: 'Poppins, system-ui, sans-serif' },
        y: {
          formatter: (val: number, { seriesIndex }: any) => {
            const item = data[seriesIndex];
            return `${Math.round(val)}% résolus\n📊 ${item.nombreIncidents} incidents\n✅ ${item.nombreResolus} résolus\n⏱️ ${item.tempsMoyenResolutionHeures}h en moyenne`;
          }
        }
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: { height: 350 },
            plotOptions: {
              radialBar: {
                dataLabels: {
                  name: { fontSize: '11px' },
                  value: { fontSize: '14px' }
                }
              }
            }
          }
        }
      ]
    };
  }

initTypeProblemeChart() {
  if (!this.incidentData?.resolutionParTypeProbleme) return;
  
  const data = this.incidentData.resolutionParTypeProbleme.filter(t => t.nombreIncidents > 0).slice(0, 8);
  
  this.chartTypeProbleme = {
    series: [{
      name: "Nombre d'incidents",
      data: data.map(t => t.nombreIncidents)
    }],
    chart: {
      type: 'bar',
      height: 400,
      toolbar: { show: false },
      fontFamily: 'Poppins, system-ui, sans-serif'
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        horizontal: false,
        columnWidth: '70%',
        distributed: false,
        colors: {
          ranges: data.map((_, index) => ({
            from: 0,
            to: 100,
            color: '#8788FF'  // Couleur unifiée pour toutes les barres
          }))
        }
      }
    },
    xaxis: {
      categories: data.map(t => t.typeProbleme),
      labels: {
        rotate: -45,
        style: { fontSize: '11px', fontFamily: 'Poppins, system-ui, sans-serif' }
      },
      title: { style: { fontFamily: 'Poppins, system-ui, sans-serif' } }
    },
    yaxis: {
      title: { text: "Nombre d'incidents", style: { fontFamily: 'Poppins, system-ui, sans-serif' } },
      labels: { style: { fontFamily: 'Poppins, system-ui, sans-serif' } }
    },
    // Utiliser un dégradé de #ECECFF à #8788FF
    colors: ['#8788FF'],
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.3,
        gradientToColors: ['#ECECFF'],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 0.9,
        stops: [0, 100]
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val}`,
      offsetY: -5,
      style: { 
        fontFamily: 'Poppins, system-ui, sans-serif', 
        fontSize: '11px',
        fontWeight: 'bold',
        colors: ['#1E293B']
      }
    },
    tooltip: {
      style: { fontFamily: 'Poppins, system-ui, sans-serif' },
      custom: ({ dataPointIndex }: any) => {
        const item = data[dataPointIndex];
        if (!item) return '';
        
        return `
          <div style="padding: 10px; font-family: 'Poppins', sans-serif; min-width: 220px;">
            <div style="font-weight: 600; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; color: #8788FF;">
               ${item.typeProbleme}
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>Incidents:</span>
              <strong>${item.nombreIncidents}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>Résolus:</span>
              <strong style="color: #10B981;">${item.nombreResolus} (${item.tauxResolution}%)</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 5px; padding-top: 5px; border-top: 1px solid #e2e8f0;">
              <span>Part du total:</span>
              <strong style="color: #8788FF;">${item.pourcentageTotal}%</strong>
            </div>
          </div>
        `;
      }
    },
    grid: {
      borderColor: '#e2e8f0',
      strokeDashArray: 4,
      position: 'back'
    },
    title: {
      text: 'Distribution des incidents par type',
      align: 'center',
      style: { 
        fontSize: '14px', 
        fontWeight: '600', 
        color: '#1E293B', 
        fontFamily: 'Poppins, system-ui, sans-serif' 
      }
    }
  };
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

  getIncidentStatsByPeriode() {
    if (!this.incidentData) return [];
    switch (this.selectedPeriode) {
      case 'jour': return this.incidentData.statsParJour;
      case 'semaine': return this.incidentData.statsParSemaine;
      case 'mois': return this.incidentData.statsParMois;
      default: return this.incidentData.statsParSemaine;
    }
  }

  changePeriode(periode: 'jour' | 'semaine' | 'mois') {
    this.selectedPeriode = periode;
    if (this.activeTab === 'tickets') {
      this.initTicketEvolutionChart();
      this.updateResolutionStats();
      this.initTicketResolutionChart();
    } else {
      this.initIncidentEvolutionChart();
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
    return (this.activeTab === 'tickets' && this.loadingTickets) ||
           (this.activeTab === 'incidents' && this.loadingIncidents);
  }

  get currentError(): string | null {
    return this.activeTab === 'tickets' ? this.errorTickets : this.errorIncidents;
  }
}