import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { CheckboxComponent } from '../../../shared/components/form/input/checkbox.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import { DashboardAdminService, TicketDashboardDTO } from '../../../shared/services/dashboard-admin.service';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Dropdown } from '@amcharts/amcharts5/.internal/charts/stock/toolbar/Dropdown';
import { DropdownComponent } from '../../../shared/components/ui/dropdown/dropdown.component';
import { DropdownItemComponent } from '../../../shared/components/ui/dropdown/dropdown-item/dropdown-item.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,    DropdownComponent,      // ✅ AJOUTER
    DropdownItemComponent ,
    AlertComponent,
    CheckboxComponent,
    BadgeComponent,
    ButtonComponent,
    NgApexchartsModule
  ],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  
  dashboardData: TicketDashboardDTO | null = null;
  loading = true;
  error: string | null = null;
  selectedPeriode: 'jour' | 'semaine' | 'mois' = 'semaine';
  
  chartDonut: any;
  chartEvolution: any;
  chartTechniciens: any;
  chartResolution: any;

  constructor(private dashboardService: DashboardAdminService) {}

  ngOnInit() {
    console.log('🟢 Composant initialisé');
    this.loadDashboard();
  }

  loadDashboard() {
    console.log('🔄 Chargement dashboard...');
    this.loading = true;
    this.dashboardService.getTicketDashboard().subscribe({
      next: (response) => {
        console.log('📊 Réponse:', response);
        if (response.isSuccess && response.data) {
          this.dashboardData = response.data;
          this.initCharts();
          this.updateResolutionStats()
        } else {
          this.error = response.message || 'Erreur chargement dashboard';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Erreur:', err);
        this.error = 'Impossible de charger le dashboard';
        this.loading = false;
      }
    });
  }

initCharts() {
  if (!this.dashboardData) return;
  
  console.log('📈 Initialisation des graphiques...');
  
  // ✅ 1. D'abord calculer les statistiques de résolution
  this.updateResolutionStats();
  
  // ✅ 2. Ensuite initialiser les graphiques qui dépendent de ces stats
  this.updateResolutionChart();
  
  // ✅ 3. Puis le reste des graphiques
  const couleursParStatut: { [key: string]: string[] } = {
    'Non assigné': ['#FCA5A5', '#F87171'],
    'Assigné': ['#FCD34D', '#FBBF24'],
    'En cours': ['#FDBA74', '#FB923C'],
    'Résolu': ['#A7F3D0', '#6EE7B7']
  };
  
  const couleurs = this.dashboardData.statsParStatut.map(s => couleursParStatut[s.statut]?.[0] || s.color);
  
  this.chartDonut = {
    series: this.dashboardData.statsParStatut.map(s => s.count),
    chart: { type: 'donut', height: 350, toolbar: { show: false } },
    labels: this.dashboardData.statsParStatut.map(s => s.statut),
    colors: couleurs,
    legend: { position: 'bottom', show: true, fontSize: '12px', labels: { colors: '#6b7280' } },
    dataLabels: { enabled: true, formatter: (val: number) => `${val.toFixed(1)}%`, style: { fontSize: '12px', fontWeight: '500', colors: ['#374151'] } },
    plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', formatter: () => `${this.dashboardData!.overview.totalTickets} tickets`, color: '#0C144E', fontSize: '14px', fontWeight: '600' } } } } },
    tooltip: { y: { formatter: (val: number) => `${val} tickets` }, style: { fontSize: '12px' } },
    states: { hover: { filter: { type: 'darken', value: 0.1 } } }
  };

  this.updateEvolutionChart();

  const ticketsData = this.dashboardData.topTechniciens.map(t => t.ticketsResolus);
  const techniciensNames = this.dashboardData.topTechniciens.map(t => t.prenom || t.nom.split(' ')[0]);
  
  this.chartTechniciens = {
    series: [{
      name: 'Tickets résolus',
      data: ticketsData
    }],
    chart: {
      type: 'bar',
      height: 350,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '40%',
        borderRadius: 8
      }
    },
    xaxis: {
      categories: techniciensNames
    },
    yaxis: {
      tickAmount: 5,
      labels: {
        formatter: (val: number) => String(Math.floor(val))
      }
    },
    colors: ['#8788FF'],
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.floor(val)} tickets`,
      offsetX: 10
    }
  };
  
  console.log('✅ Graphiques initialisés');
}
  isOpen = false;
  
  // Pour les indicateurs du pied de page
  totalAvantDelai = 0;
  totalApresDelai = 0;
  tauxRespectDelai = 0;
  tendanceRespectDelai = '';
  messageRespectDelai = '';
  
  updateEvolutionChart() {
    const statsPeriode = this.getStatsByPeriode();
    this.chartEvolution = {
      series: [
        { name: 'Créés', data: statsPeriode.map(s => s.crees), color: '#8788FF' },
        { name: 'Résolus', data: statsPeriode.map(s => s.resolus), color: '#10B981' },
        { name: 'En cours', data: statsPeriode.map(s => s.enCours), color: '#F59E0B' }
      ],
      chart: { type: 'line', height: 400, toolbar: { show: true }, zoom: { enabled: false } },
      xaxis: { categories: statsPeriode.map(s => s.dateFormatee), title: { text: 'Date' } },
      yaxis: { title: { text: 'Nombre de tickets' } },
      stroke: { curve: 'smooth', width: 3 },
      markers: { size: 5 },
      tooltip: { shared: true },
      legend: { position: 'top' },
      colors: ['#8788FF', '#10B981', '#F59E0B']
    };
  }
  updateResolutionStats() {
    if (!this.dashboardData) return;
    
    // Calculer les totaux sur toutes les périodes
    const resolutionPeriode = this.getResolutionByPeriode();
    this.totalAvantDelai = resolutionPeriode.reduce((sum, r) => sum + r.resolusAvantDelai, 0);
    this.totalApresDelai = resolutionPeriode.reduce((sum, r) => sum + r.resolusApresDelai, 0);
    const total = this.totalAvantDelai + this.totalApresDelai;
    this.tauxRespectDelai = total > 0 ? Math.round((this.totalAvantDelai / total) * 100) : 0;
    
    // Calculer la tendance (exemple: comparaison avec période précédente)
    const dernierePeriode = resolutionPeriode[resolutionPeriode.length - 1];
    const periodePrecedente = resolutionPeriode[resolutionPeriode.length - 2];
    if (dernierePeriode && periodePrecedente) {
      const variation = dernierePeriode.tauxRespectDelai - periodePrecedente.tauxRespectDelai;
      if (variation > 0) {
        this.tendanceRespectDelai = `+${variation}% vs période précédente`;
      } else if (variation < 0) {
        this.tendanceRespectDelai = `${variation}% vs période précédente`;
      }
    }
    
    this.messageRespectDelai = `${this.totalAvantDelai} tickets résolus avant la date limite sur ${total} tickets avec délai. Taux de respect: ${this.tauxRespectDelai}%.`;
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }
updateResolutionChart() {
  console.log('📊 === DÉBUT updateResolutionChart ===');
  
  if (!this.dashboardData) {
    console.error('❌ dashboardData est null/undefined');
    return;
  }
  
  console.log('📊 Données reçues:');
  console.log('   - totalAvantDelai:', this.totalAvantDelai);
  console.log('   - totalApresDelai:', this.totalApresDelai);
  
  // Calculer le taux de respect global (Avant délai uniquement)
  const total = this.totalAvantDelai + this.totalApresDelai;
  console.log('📊 Total des tickets résolus (avec délai):', total);
  
  const tauxGlobal = total > 0 ? (this.totalAvantDelai / total) * 100 : 0;
  console.log('📊 Taux de respect calculé:', tauxGlobal, '%');
  console.log('📊 Taux arrondi:', Math.round(tauxGlobal), '%');
  
  // Vérification des données
  if (total === 0) {
    console.warn('⚠️ Aucun ticket résolu avec date limite');
  }
  
  this.chartResolution = {
    series: [tauxGlobal],
    chart: {
      type: 'radialBar',
      height: 350,
      toolbar: { show: false },
      sparkline: { enabled: false }
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: {
          size: '65%'
        },
        track: {
          background: '#ebe5e5',
          strokeWidth: '100%',
          margin: 5
        },
        dataLabels: {
          name: {
            show: true,
            fontSize: '14px',
            fontWeight: '500',
            color: '#6b7280',
            offsetY: -10
          },
          value: {
            show: true,
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#0C144E',
            offsetY: 10,
            formatter: (val: number) => `${Math.round(val)}%`
          },
          total: {
            show: true,
            label: 'Taux respect',
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280',
            formatter: () => `${Math.round(tauxGlobal)}%`
          }
        }
      }
    },
    fill: {
      colors: ['#10B981'],
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'horizontal',
        shadeIntensity: 0.5,
        gradientToColors: ['#34D399'],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100]
      }
    },
    stroke: {
      lineCap: 'round'
    },
    labels: ['Avant délai'],
    colors: ['#10B981']
  };
  
  console.log('✅ Graphique chartResolution configuré avec succès');
  console.log('   - Série:', this.chartResolution.series);
  console.log('   - Label:', this.chartResolution.labels);
  console.log('   - Couleur:', this.chartResolution.colors);
  console.log('📊 === FIN updateResolutionChart ===');
}

  getStatsByPeriode() {
    if (!this.dashboardData) return [];
    switch (this.selectedPeriode) {
      case 'jour': return this.dashboardData.statsParJour;
      case 'semaine': return this.dashboardData.statsParSemaine;
      case 'mois': return this.dashboardData.statsParMois;
      default: return this.dashboardData.statsParSemaine;
    }
  }

  getResolutionByPeriode() {
    if (!this.dashboardData) return [];
    switch (this.selectedPeriode) {
      case 'jour': return this.dashboardData.resolutionParJour;
      case 'semaine': return this.dashboardData.resolutionParSemaine;
      case 'mois': return this.dashboardData.resolutionParMois;
      default: return this.dashboardData.resolutionParSemaine;
    }
  }

  changePeriode(periode: 'jour' | 'semaine' | 'mois') {
    this.selectedPeriode = periode;
    this.updateEvolutionChart();
    this.updateResolutionChart();
  }
}