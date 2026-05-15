import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { 
  DailyIncidentCountDTO, 
  IncidentPredictionResponseDTO, 
  PredictionResultDTO, 
  PredictionService 
} from '../../shared/services/prediction.service';

interface TypeConfig {
  key: string;
  label: string;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-prediction',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './prediction.component.html',
  styleUrls: ['./prediction.component.css'] // Ajoutez cette ligne si vous avez un CSS
})
export class PredictionComponent implements OnInit {

  loading = true;
  loadingHistory = true;
  activeTab: 'semaine' | 'mois' = 'semaine';
  selectedType = 'TotalIncidents';
  error = '';

  prediction: IncidentPredictionResponseDTO | null = null;
  historical: DailyIncidentCountDTO[] = [];

  // Graphique historique + prévision (ligne)
  lineChartOptions: any = {};
  // Graphique barres par type
  barChartOptions: any = {};
  // Graphique donut distribution
  donutChartOptions: any = {};

  readonly types: TypeConfig[] = [
    { key: 'TotalIncidents', label: 'Total', color: '#6366F1', icon: 'bi-grid-3x3-gap' },
    { key: 'PaiementRefuse', label: 'Paiement refusé', color: '#EF4444', icon: 'bi-credit-card-x' },
    { key: 'TerminalHorsLigne', label: 'Terminal hors ligne', color: '#F97316', icon: 'bi-plug' },
    { key: 'Lenteur', label: 'Lenteur', color: '#EAB308', icon: 'bi-clock-history' },
    { key: 'BugAffichage', label: 'Bug affichage', color: '#8B5CF6', icon: 'bi-display' },
    { key: 'ConnexionReseau', label: 'Connexion réseau', color: '#3B82F6', icon: 'bi-wifi-off' },
    { key: 'ErreurFluxTransactionnel', label: 'Flux transactionnel', color: '#EC4899', icon: 'bi-arrow-left-right' },
    { key: 'ProblemeLogicielTPE', label: 'Logiciel TPE', color: '#14B8A6', icon: 'bi-code-slash' },
    { key: 'Autre', label: 'Autre', color: '#6B7280', icon: 'bi-three-dots' },
  ];

  // ✅ PROPRIÉTÉ CALCULÉE POUR LES COULEURS
  get barChartColors(): string[] {
    if (!this.barChartOptions.series) return [];
    return this.barChartOptions.series.map((s: any) => s.color);
  }

  constructor(private svc: PredictionService) {}

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
          this.buildBarChart();
          this.buildDonutChart();
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

  // ---- Sélecteurs ----
  setTab(tab: 'semaine' | 'mois') {
    this.activeTab = tab;
    this.buildBarChart();
    this.buildDonutChart();
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

    // Historique (90 derniers jours pour lisibilité)
    const hist = this.historical.slice(-90);
    const histDates = hist.map(d => new Date(d.date).toLocaleDateString('fr-FR'));
    const histValues = hist.map(d => this.getHistValue(d, this.selectedType));

    // Prévision semaine
    const prevDates = (this.prediction?.predictionSemaine ?? [])
      .map(p => new Date(p.date).toLocaleDateString('fr-FR'));
    const prevValues = (this.prediction?.predictionSemaine ?? [])
      .map(p => p.incidentsParType[this.selectedType] ?? p.totalIncidents);
    const prevLower = (this.prediction?.predictionSemaine ?? [])
      .map(p => Math.round(p.confidenceLower));
    const prevUpper = (this.prediction?.predictionSemaine ?? [])
      .map(p => Math.round(p.confidenceUpper));

    this.lineChartOptions = {
      series: [
        {
          name: 'Historique',
          data: histValues,
          color: cfg.color
        },
        {
          name: 'Prévision',
          data: [...new Array(histDates.length).fill(null), ...prevValues],
          color: cfg.color,
          dashArray: 5
        },
        {
          name: 'Borne basse',
          data: [...new Array(histDates.length).fill(null), ...prevLower],
          color: cfg.color + '44'
        },
        {
          name: 'Borne haute',
          data: [...new Array(histDates.length).fill(null), ...prevUpper],
          color: cfg.color + '44'
        }
      ],
      chart: {
        type: 'line',
        height: 300,
        toolbar: { show: false },
        zoom: { enabled: false },
        background: 'transparent'
      },
      stroke: {
        curve: 'smooth',
        width: [2, 2, 1, 1],
        dashArray: [0, 6, 0, 0]
      },
      fill: {
        type: ['solid', 'solid', 'gradient', 'gradient'],
        opacity: [1, 1, 0.3, 0.3]
      },
      xaxis: {
        categories: [...histDates, ...prevDates],
        labels: {
          show: false
        }
      },
      yaxis: { min: 0, labels: { style: { colors: '#94A3B8' } } },
      legend: { show: true, position: 'top' },
      tooltip: { shared: true, intersect: false },
      grid: { borderColor: '#1E293B' },
      theme: { mode: 'dark' }
    };
  }

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