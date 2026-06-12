import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { 
  DailyIncidentCountDTO, 
  IncidentPredictionResponseDTO, 
  PredictionResultDTO, 
  PredictionService 
} from '../../shared/services/prediction.service';
import { Router } from '@angular/router';
interface TypeConfig {
  key: string;
  label: string;
  color: string;
  bgLight: string;     
  bgDark: string;      
  icon: string;
}
@Component({
  selector: 'app-prediction',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './prediction.component.html',
  styleUrls: ['./prediction.component.css'] 
})
export class PredictionComponent implements OnInit {

  loading = true;
  loadingHistory = true;
  activeTab: 'semaine' | 'mois' = 'semaine';
  selectedType = 'TotalIncidents';
  error = '';

  prediction: IncidentPredictionResponseDTO | null = null;
  historical: DailyIncidentCountDTO[] = [];

  lineChartOptions: any = {};
  barChartOptions: any = {};
  donutChartOptions: any = {};

  readonly types: TypeConfig[] = [
    { key: 'TotalIncidents', label: 'Total', color: '#8788FF', bgLight: '#F0EFFF', bgDark: '#0C144E/10', icon: 'bi-grid-3x3-gap' },
    { key: 'PaiementRefuse', label: 'Paiement refusé', color: '#FCA5A5', bgLight: '#FEF2F2', bgDark: '#7F1D1D/10', icon: 'bi-credit-card-x' },
    { key: 'TerminalHorsLigne', label: 'Terminal hors ligne', color: '#FDBA74', bgLight: '#FFF7ED', bgDark: '#7C2D12/10', icon: 'bi-plug' },
    { key: 'Lenteur', label: 'Lenteur', color: '#FDE047', bgLight: '#FEFCE8', bgDark: '#713F12/10', icon: 'bi-clock-history' },
    { key: 'BugAffichage', label: 'Bug affichage', color: '#C4B5FD', bgLight: '#F5F3FF', bgDark: '#4C1D95/10', icon: 'bi-display' },
    { key: 'ConnexionReseau', label: 'Connexion réseau', color: '#93C5FD', bgLight: '#EFF6FF', bgDark: '#1E3A5F/10', icon: 'bi-wifi-off' },
    { key: 'ErreurFluxTransactionnel', label: 'Flux transactionnel', color: '#F9A8D4', bgLight: '#FDF2F8', bgDark: '#831843/10', icon: 'bi-arrow-left-right' },
    { key: 'ProblemeLogicielTPE', label: 'Logiciel TPE', color: '#6EE7B7', bgLight: '#ECFDF5', bgDark: '#134E4A/10', icon: 'bi-code-slash' },
    { key: 'Autre', label: 'Autre', color: '#D1D5DB', bgLight: '#F9FAFB', bgDark: '#374151/10', icon: 'bi-three-dots' },
  ];

  get barChartColors(): string[] {
    if (!this.barChartOptions.series) return [];
    return this.barChartOptions.series.map((s: any) => s.color);
  }

  constructor(private svc: PredictionService,    private router: Router
) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.loadingHistory = true;

    // Historique
    this.svc.getHistorical(4).subscribe({
      next: res => {
        if (res.isSuccess) {
          this.historical = res.data;
          this.buildLineChart();
        }
        this.loadingHistory = false;
      },
      error: () => {
        this.loadingHistory = false;
        this.error = 'Erreur chargement historique';
      }
    });

    // Prédictions
    this.svc.getPredictions().subscribe({
      next: res => {
        if (res.isSuccess) {
          this.prediction = res.data;
                            this.buildLineChart(); 

          this.buildBarChart();
          this.buildDonutChart();
          this.buildConfidenceChart(); 

        } else {
          this.error = res.message || 'Erreur lors de la prédiction';
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de contacter le serveur';
        this.loading = false;
      }
    });
  }
setTab(tab: 'semaine' | 'mois') {
  this.activeTab = tab;
  this.buildLineChart();        
  this.buildBarChart();
  this.buildDonutChart();
  this.buildConfidenceChart();
}

  setType(key: string) {
    this.selectedType = key;
    this.buildLineChart();
    this.buildBarChart();
  }

  getTypeConfig(key: string) {
    return this.types.find(t => t.key === key) ?? this.types[0];
  }

  // ---- Données courantes ----
  get currentPredictions(): PredictionResultDTO[] {
    if (!this.prediction) return [];
    return this.activeTab === 'semaine'
      ? this.prediction.predictionSemaine
      : this.prediction.predictionMois;
  }

  get totalPrevu(): number {
    return this.currentPredictions.reduce((s, p) => s + p.totalIncidents, 0);
  }

  get typeDominant(): string {
    if (!this.prediction) return '-';
    const totaux = this.types
      .filter(t => t.key !== 'TotalIncidents')
      .map(t => ({
        label: t.label,
        total: this.currentPredictions.reduce(
          (s, p) => s + (p.incidentsParType[t.key] ?? 0), 0
        )
      }));
    totaux.sort((a, b) => b.total - a.total);
    return totaux[0]?.label ?? '-';
  }

  get tendance(): string {
    if (this.historical.length < 14) return 'stable';
    const recent = this.historical.slice(-7)
      .reduce((s, d) => s + d.totalIncidents, 0);
    const prev = this.historical.slice(-14, -7)
      .reduce((s, d) => s + d.totalIncidents, 0);
    const diff = ((recent - prev) / (prev || 1)) * 100;
    if (diff > 10) return 'hausse';
    if (diff < -10) return 'baisse';
    return 'stable';
  }

  // ---- Construction graphiques ----
buildLineChart() {
  const cfg = this.getTypeConfig(this.selectedType);

  //  15 derniers jours d'historique seulement
  const hist = this.historical.slice(-15);
  
  //  Labels pour l'historique (dates lisibles)
  const histLabels = hist.map(d => 
    new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  );
  const histValues = hist.map(d => this.getHistValue(d, this.selectedType));

  //  Prévision selon l'onglet actif (semaine ou mois)
  let prevDates: string[] = [];
  let prevValues: number[] = [];
  let prevLower: number[] = [];
  let prevUpper: number[] = [];

  if (this.activeTab === 'semaine') {
    // 7 jours de prévision
    prevDates = (this.prediction?.predictionSemaine ?? [])
      .map(p => new Date(p.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));
    prevValues = (this.prediction?.predictionSemaine ?? [])
      .map(p => p.incidentsParType[this.selectedType] ?? p.totalIncidents);
    prevLower = (this.prediction?.predictionSemaine ?? [])
      .map(p => Math.round(p.confidenceLower));
    prevUpper = (this.prediction?.predictionSemaine ?? [])
      .map(p => Math.round(p.confidenceUpper));
  } else {
    // 4 semaines de prévision
    prevDates = (this.prediction?.predictionMois ?? [])
      .map((_, idx) => `S${idx + 1}`);
    prevValues = (this.prediction?.predictionMois ?? [])
      .map(p => p.incidentsParType[this.selectedType] ?? p.totalIncidents);
    prevLower = (this.prediction?.predictionMois ?? [])
      .map(p => Math.round(p.confidenceLower));
    prevUpper = (this.prediction?.predictionMois ?? [])
      .map(p => Math.round(p.confidenceUpper));
  }

  //  Espacer les labels de l'historique 
  const spacedHistLabels = histLabels.map((label, index) => {
    const total = histLabels.length;
    // Afficher: premier, dernier, et un label sur 3
    if (index === 0 || index === total - 1 || index % 5 === 0) {
      return label;
    }
    return '';
  });

  //  Fusionner les catégories
  const allCategories = [...spacedHistLabels, ...prevDates];

  // Données pour la prévision 
  const forecastData = [...new Array(histValues.length).fill(null), ...prevValues];

  // Calculer la valeur max pour l'axe Y
  const allValues = [...histValues, ...prevValues, ...prevLower, ...prevUpper];
  const maxValue = Math.max(...allValues, 1);
  const yAxisMax = Math.ceil(maxValue / 1) * 1;

  this.lineChartOptions = {
    series: [
      {
        name: 'Historique (15 jours)',
        data: histValues,
        color: cfg.color
      },
      {
        name: 'Prévision',
        data: forecastData,
        color: cfg.color
      }
    ],
    chart: {
      type: 'line',
      height: 420,
      toolbar: { 
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: false,
          reset: false
        }
      },
      zoom: { enabled: true, type: 'x' },
      background: 'transparent',
      fontFamily: 'Poppins, system-ui, sans-serif'
    },
    stroke: {
      curve: 'smooth',
      width: [2, 2],
      dashArray: [0, 6]
    },
    markers: {
      size: [3, 5],
      colors: [cfg.color, cfg.color],
      strokeColors: '#FFFFFF',
      strokeWidth: 2,
      hover: { size: 7 }
    },
    xaxis: {
      categories: allCategories,
      labels: { 
        style: { colors: '#94A3B8', fontSize: '11px', fontWeight: 500 },
        rotate: -35,
        trim: true,
        hideOverlappingLabels: true,
        formatter: (value: string) => value
      },
      title: {
        text: this.activeTab === 'semaine' ? 'Date / Jour' : 'Date / Semaine',
        style: { fontSize: '12px', fontWeight: 500 }
      },
      axisBorder: { show: true, color: '#E5E7EB' },
      axisTicks: { show: true }
    },
    yaxis: { 
      min: 0,
      max: yAxisMax,
      tickAmount: Math.min(5, yAxisMax),
      labels: { 
        style: { colors: '#94A3B8', fontSize: '11px' },
        formatter: (v: number) => Math.round(v).toString()
      },
      title: { 
        text: "Nombre d'incidents", 
        style: { fontSize: '12px', fontWeight: 500 } 
      }
    },
    legend: { 
      position: 'top',
      fontSize: '12px',
      fontFamily: 'Poppins, system-ui, sans-serif',
      markers: { width: 12, height: 12, radius: 6 }
    },
    tooltip: { 
      shared: true, 
      intersect: false,
      y: { formatter: (v: number) => `${Math.round(v)} incidents` },
      style: { fontFamily: 'Poppins, system-ui, sans-serif' }
    },
    grid: { 
      borderColor: '#E5E7EB', 
      strokeDashArray: 5,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    colors: [cfg.color, cfg.color],
    fill: {
      type: 'solid',
      opacity: [1, 1]
    }
  };
}
confidenceChartOptions: any = {};

  buildBarChart() {
    const data = this.currentPredictions;
    const labels = data.map(p =>
      this.activeTab === 'semaine'
        ? new Date(p.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
        : `S${data.indexOf(p) + 1}`
    );

    const series = this.types
      .filter(t => t.key !== 'TotalIncidents')
      .map(t => ({
        name: t.label,
        data: data.map(p => p.incidentsParType[t.key] ?? 0),
        color: t.color
      }));

    this.barChartOptions = {
      series,
      chart: {
        type: 'bar',
        height: 280,
        stacked: true,
        toolbar: { show: false },
        background: 'transparent'
      },
      xaxis: {
        categories: labels,
        labels: { style: { colors: '#94A3B8', fontSize: '11px' } }
      },
      yaxis: { labels: { style: { colors: '#94A3B8' } } },
      legend: { position: 'top', fontSize: '11px' },
      plotOptions: {
        bar: { borderRadius: 4, columnWidth: '60%' }
      },
      grid: { borderColor: '#1E293B' },
      theme: { mode: 'dark' },
      tooltip: { shared: true, intersect: false }
    };
  }

  buildDonutChart() {
    const data = this.currentPredictions;
    const totauxParType = this.types
      .filter(t => t.key !== 'TotalIncidents')
      .map(t => ({
        label: t.label,
        color: t.color,
        total: data.reduce((s, p) => s + (p.incidentsParType[t.key] ?? 0), 0)
      }))
      .filter(t => t.total > 0);

    this.donutChartOptions = {
      series: totauxParType.map(t => t.total),
      labels: totauxParType.map(t => t.label),
      colors: totauxParType.map(t => t.color),
      chart: { 
        type: 'donut', 
        height: 280, 
        toolbar: { show: false },
        background: 'transparent'
      },
      legend: { position: 'bottom', fontSize: '11px' },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total prévu',
                color: '#94A3B8'
              }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      theme: { mode: 'dark' }
    };
  }

buildConfidenceChart() {
  const data = this.currentPredictions;

  if (!data || data.length === 0) return;

  const labels = data.map(p =>
    this.activeTab === 'semaine'
      ? new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      : `S${data.indexOf(p) + 1}`
  );

  const forecastValues = data.map(p => Math.round(p.totalIncidents));
  const upperValues = data.map(p => Math.round(p.confidenceUpper));
  const lowerValues = data.map(p => Math.round(p.confidenceLower));

  this.confidenceChartOptions = {
    series: [
      {
        name: 'Borne haute (95%)',
        type: 'line',
        data: upperValues,
        color: '#FDA4AF'
      },
      {
        name: 'Borne basse (95%)',
        type: 'line',
        data: lowerValues,
        color: '#A7F3D0'
      },
      {
        name: 'Prévision',
        type: 'line',
        data: forecastValues,
        color: '#8788FF'
      }
    ],
    chart: {
      type: 'line',
      height: 380,
      toolbar: {
        show: true,
        tools: {
          download: true,    // Menu de téléchargement
          selection: true,   // Sélection (zoom)
          zoom: true,        // Zoom in
          zoomin: true,      // Zoom in (optionnel)
          zoomout: true,     // Zoom out
          pan: false,        // Pan désactivé
          reset: false       // Reset désactivé
        },
        autoSelected: 'zoom'
      },
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true
      },
      background: 'transparent',
      fontFamily: 'Poppins, system-ui, sans-serif'
    },
    stroke: {
      curve: 'smooth',
      width: [2, 2, 3]
    },
    fill: {
      type: ['solid', 'solid', 'solid']
    },
    colors: ['#FDA4AF', '#A7F3D0', '#8788FF'],
    markers: {
      size: [4, 4, 6],
      colors: ['#FDA4AF', '#A7F3D0', '#8788FF'],
      strokeColors: '#FFFFFF',
      strokeWidth: 2
    },
    xaxis: {
      categories: labels,
      labels: { style: { fontSize: '12px', fontWeight: 500 } }
    },
    yaxis: {
      min: 0,
      title: { text: "Nombre d'incidents" }
    },
    legend: {
      position: 'top',
      fontSize: '12px'
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (v: number) => `${Math.round(v)} incidents` }
    },
  
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 5
    }
  };
}

  goBack(): void {
    this.router.navigate(['/admin-dashboard/incidents']);
  }
  private getHistValue(d: DailyIncidentCountDTO, type: string): number {
    const map: Record<string, number> = {
      TotalIncidents: d.totalIncidents,
      PaiementRefuse: d.paiementRefuse,
      TerminalHorsLigne: d.terminalHorsLigne,
      Lenteur: d.lenteur,
      BugAffichage: d.bugAffichage,
      ConnexionReseau: d.connexionReseau,
      ErreurFluxTransactionnel: d.erreurFluxTransactionnel,
      ProblemeLogicielTPE: d.problemeLogicielTPE,
      Autre: d.autre
    };
    return map[type] ?? 0;
  }
}