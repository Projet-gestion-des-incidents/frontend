import { Component, OnInit } from '@angular/core';
import { DashboardAdminService, IncidentDashboardDTO, TPEDashboardDTO } from '../../../../shared/services/dashboard-admin.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownComponent } from '../../../../shared/components/ui/dropdown/dropdown.component';
import { DropdownItemComponent } from '../../../../shared/components/ui/dropdown/dropdown-item/dropdown-item.component';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgApexchartsModule,
    DropdownComponent,
    DropdownItemComponent
  ],
  templateUrl: './incidents.component.html',
  styleUrls: ['./incidents.component.css']
})
export class IncidentsComponent implements OnInit {
  
  incidentData: IncidentDashboardDTO | null = null;
  tpeData: TPEDashboardDTO | null = null;
  
  loadingIncidents = true;
  loadingTPE = true;
  errorIncidents: string | null = null;
  errorTPE: string | null = null;
  
  // Période sélectionnée pour l'évolution
  selectedPeriode: 'jour' | 'semaine' | 'mois' = 'semaine';
  
  // Graphiques Incidents
  chartIncidentDonut: any;
  chartIncidentEvolution: any;
  chartSeveriteRadial: any;
  chartTypeProbleme: any;
  
  // Graphiques TPE
  chartPannesParModele: any;
  chartPannesParAdresse: any;
  
  // Dropdown
  isOpen = false;

  constructor(private dashboardService: DashboardAdminService) {}

  ngOnInit() {
    console.log('🟢 Composant incidents initialisé');
    this.loadIncidentDashboard();
    this.loadTPEDashboard();
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

  loadTPEDashboard() {
    console.log('🔄 Chargement dashboard TPE...');
    this.loadingTPE = true;
    this.dashboardService.getTPEDashboard().subscribe({
      next: (response) => {
        console.log('📊 TPE réponse:', response);
        if (response.isSuccess && response.data) {
          this.tpeData = response.data;
          this.initTPECharts();
        } else {
          this.errorTPE = response.message || 'Erreur chargement dashboard TPE';
        }
        this.loadingTPE = false;
      },
      error: (err) => {
        console.error('❌ Erreur TPE:', err);
        this.errorTPE = 'Impossible de charger le dashboard des TPE';
        this.loadingTPE = false;
      }
    });
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

  initSeveriteRadialChart() {
    if (!this.incidentData?.resolutionParSeverite) return;
    
    const data = this.incidentData.resolutionParSeverite.filter(s => s.nombreIncidents > 0);
    
    const pastelColors: { [key: string]: string } = {
      'Non définie': '#9CA3AF',
      'Faible': '#86EFAC',
      'Moyenne': '#FDE047',
      'Forte': '#FCA5A5'
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
            return `${Math.round(val)}% résolus\n ${item.nombreIncidents} incidents\n ${item.nombreResolus} résolus\n ${item.tempsMoyenResolutionHeures}h en moyenne`;
          }
        }
      }
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
          columnWidth: '70%'
        }
      },
      xaxis: {
        categories: data.map(t => t.typeProbleme),
        labels: {
          rotate: -45,
          style: { fontSize: '11px', fontFamily: 'Poppins, system-ui, sans-serif' }
        }
      },
      yaxis: {
        title: { text: "Nombre d'incidents", style: { fontFamily: 'Poppins, system-ui, sans-serif' } }
      },
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
        style: { fontFamily: 'Poppins, system-ui, sans-serif', fontSize: '11px', fontWeight: 'bold' }
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
      }
    };
  }

  // ==================== GRAPHIQUES TPE ====================
  initTPECharts() {
    if (!this.tpeData) return;
    this.initPannesParModeleChart();
    this.initPannesParAdresseChart();
  }

initPannesParModeleChart() {
  const data = this.tpeData!.pannesParModele;
  
  // Map des couleurs pastel pour chaque modèle
  const modeleColors: { [key: string]: string } = {
    'Ingenico': '#67e8f9',  // cyan-300
    'Verifone': '#86efac',  // green-300  
    'PAX': '#fde047'        // yellow-300
  };
  
  // Utiliser les couleurs pastel pour chaque modèle
  const chartColors = data.map(m => modeleColors[m.modele] || m.color || '#CBD5E1');
  
  this.chartPannesParModele = {
    series: data.map(m => m.nombreIncidents),
    chart: {
      type: 'pie',
      height: 350,
      toolbar: { show: false },
      fontFamily: 'Poppins, system-ui, sans-serif'
    },
    labels: data.map(m => `${m.modele}`),
    colors: chartColors,
    legend: {
      position: 'bottom',
      show: true,
      fontSize: '12px',
      fontFamily: 'Poppins, system-ui, sans-serif',
      markers: {
        width: 12,
        height: 12,
        radius: 6
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number, opts?: any) => {
        const index = opts?.seriesIndex || 0;
        const item = data[index];
        return `${item.nombreIncidents} incidents`;
      },
      style: { 
        fontFamily: 'Poppins, system-ui, sans-serif', 
        fontSize: '12px',
        fontWeight: 'bold',
        colors: ['#1e293b']
      },
      dropShadow: { enabled: false }
    },
    plotOptions: {
      pie: {
        expandOnClick: true,
        dataLabels: {
          offset: 0,
          minAngleToShowLabel: 10
        },
        donut: {
          size: '0%'
        }
      }
    },
    tooltip: {
      enabled: true,
      shared: false,
      followCursor: true,
      custom: ({ seriesIndex, dataPointIndex, w }: any) => {
        const item = data[seriesIndex];
        if (!item) return '';
        
        // Calculer le pourcentage du total des incidents
        const totalIncidents = this.tpeData!.overview.totalIncidentsLiees;
        const pourcentage = totalIncidents > 0 ? ((item.nombreIncidents / totalIncidents) * 100).toFixed(1) : 0;
        
        return `
          <div style="padding: 12px 16px; font-family: 'Poppins', sans-serif; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); min-width: 200px; border: 1px solid #e2e8f0;">
            <div style="font-weight: 600; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; color: #1e293b;">
              ${item.modele}
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: #64748b;">Incidents:</span>
              <strong style="color: #1e293b;">${item.nombreIncidents}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: #64748b;">TPEs:</span>
              <strong style="color: #1e293b;">${item.nombreTPEs}</strong>
            </div>
          
            <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
              <span style="color: #64748b;">Part du total:</span>
              <strong style="color: #8788ff;">${pourcentage}%</strong>
            </div>
          </div>
        `;
      }
    },
    title: {
      text: 'Répartition des incidents par modèle',
      align: 'center',
      style: { fontSize: '14px', fontWeight: '600', fontFamily: 'Poppins' }
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['#ffffff']
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: { height: 280 },
          legend: { position: 'bottom', fontSize: '10px' }
        }
      }
    ]
  };
}

  initPannesParAdresseChart() {
    const data = this.tpeData!.pannesParAdresse.slice(0, 6);
    
    this.chartPannesParAdresse = {
      series: [{
        name: "Taux de panne (%)",
        data: data.map(a => a.tauxPanne)
      }],
      chart: {
        type: 'bar',
        height: 350,
        toolbar: { show: false },
        fontFamily: 'Poppins, system-ui, sans-serif'
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          horizontal: true,
          barHeight: '40%'
        }
      },
      xaxis: {
        categories: data.map(a => a.commercantNom.length > 20 ? a.commercantNom.substring(0, 20) + '...' : a.commercantNom),
        labels: {
          style: { fontSize: '11px', fontFamily: 'Poppins, system-ui, sans-serif' }
        }
      },
      yaxis: {
        title: { text: "Taux de panne (%)", style: { fontFamily: 'Poppins' } },
        labels: {
          formatter: (val: number) => `${val}%`,
          style: { fontFamily: 'Poppins' }
        }
      },
      colors: ['#8788FF'],
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'horizontal',
          gradientToColors: ['#ECECFF'],
          stops: [0, 100]
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val}%`,
        style: { fontFamily: 'Poppins', fontSize: '11px', fontWeight: 'bold' }
      },
      tooltip: {
        style: { fontFamily: 'Poppins' },
        custom: ({ dataPointIndex }: any) => {
          const item = data[dataPointIndex];
          return `
            <div style="padding: 10px; font-family: Poppins; min-width: 250px;">
              <strong style="color: #8788FF">${item.commercantNom}</strong><br/>
              📍 ${item.adresse}<br/>
              📊 TPEs: ${item.nombreTPEs}<br/>
              ⚠️ Incidents: ${item.nombreIncidents}<br/>
              🔥 Taux de panne: <strong>${item.tauxPanne}%</strong>
            </div>
          `;
        }
      },
      title: {
        text: 'Taux de panne par commerçant',
        align: 'center',
        style: { fontSize: '14px', fontWeight: '600', fontFamily: 'Poppins' }
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 4
      }
    };
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
    this.initIncidentEvolutionChart();
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }
}