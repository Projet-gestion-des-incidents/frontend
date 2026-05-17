import { Component, OnInit } from '@angular/core';
import { DashboardAdminService, IncidentDashboardDTO, TPEDashboardDTO } from '../../../../shared/services/dashboard-admin.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownComponent } from '../../../../shared/components/ui/dropdown/dropdown.component';
import { DropdownItemComponent } from '../../../../shared/components/ui/dropdown/dropdown-item/dropdown-item.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import { TunisiaGovernoratesService } from '../../../../shared/services/tunisia-governorates.service';
import { TunisiaMapComponent } from '../tunisia-map-data/tunisia-map-data.component';
import { ExportExcelService } from '../../../../shared/services/export-excel.service';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgApexchartsModule,
    DropdownComponent,
    TunisiaMapComponent,
    DropdownItemComponent,ButtonComponent
  ],
  templateUrl: './incidents.component.html',
  styleUrls: ['./incidents.component.css']
})
export class IncidentsComponent implements OnInit {
  govData: any[] = [];
  chartPannesParGovernorat: any;
  incidentData: IncidentDashboardDTO | null = null;
  tpeData: TPEDashboardDTO | null = null;
  
  loadingIncidents = true;
  loadingTPE = true;
  errorIncidents: string | null = null;
  errorTPE: string | null = null;
  
  selectedPeriode: 'jour' | 'semaine' | 'mois' = 'semaine';
  
  chartIncidentDonut: any;
  chartIncidentEvolution: any;
  chartSeveriteRadial: any;
  chartTypeProbleme: any;
  chartPannesParModele: any;
  chartPannesParAdresse: any;
    
  // Export
  showExportModal = false;
  exportPeriod: 'jour' | 'semaine' | 'mois' | 'annee' = 'mois';
  exportYears: number[] = [];
  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;
  
  isOpen = false;
  totalTPEs: number = 0;
  totalIncidents: number = 0;
  tauxMoyen: number = 0;

  constructor(
    private dashboardService: DashboardAdminService,
    private govService: TunisiaGovernoratesService,
    private exportExcelService: ExportExcelService,
    private router: Router
  ) {
    this.initYears();
  }

  ngOnInit() {
    console.log('🟢 Composant incidents initialisé');
    this.loadIncidentDashboard();
    this.loadTPEDashboard();
  }

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


// incidents.component.ts - Remplacer la méthode exportData()

// incidents.component.ts - Remplacer la méthode exportData()

// incidents.component.ts - Remplacer la méthode exportData()

exportData() {
  console.log('📊 === DÉBUT exportData Incidents ===');
  console.log('📊 exportPeriod:', this.exportPeriod);
  console.log('📊 selectedYear:', this.selectedYear);
  console.log('📊 selectedMonth:', this.selectedMonth);
  
  if (!this.incidentData) {
    console.error('❌ incidentData est null!');
    return;
  }
  
  let filename = '';
  
  switch (this.exportPeriod) {
    case 'jour':
      filename = `incidents_quotidiens_${this.getCurrentDate()}`;
      break;
    case 'semaine':
      filename = `incidents_hebdomadaires_${this.selectedYear}_${this.selectedMonth}`;
      break;
    case 'mois':
      const currentYear = new Date().getFullYear();
      filename = `incidents_mensuels_${currentYear}`;
      break;
    default:
      filename = `dashboard_incidents_${this.getCurrentDate()}`;
  }
  
  const evolutionData = this.getEvolutionSheet();
  console.log('📊 Données à exporter:', evolutionData.length, 'lignes');
  console.log('📊 Première ligne:', evolutionData[0]);
  console.log('📊 Headers:', Object.keys(evolutionData[0] || {}));
  
  // ✅ Version complète avec toutes les options pour Incidents
  this.exportExcelService.exportToExcelWithColors({
    filename: filename,
    sheetName: 'Évolution des incidents',
    data: evolutionData,
    columnColors: {
        'Jour': { bgColor: 'FFFFFF', fontColor: '0C144E' },
      'Créés': { bgColor: 'ECECFF', fontColor: '8788FF' },
      'Non traités': { bgColor: 'FEE2E2', fontColor: 'EF4444' },
      'En cours': { bgColor: 'FFEDD5', fontColor: 'F97316' },
      'Fermés': { bgColor: 'D1FAE5', fontColor: '10B981' }
    },
    firstColumnBold: true,                       // ✅ Première colonne en gras
    colorHeadersWithColumnColors: true,          // ✅ En-têtes colorés comme les colonnes
    excludeFirstColumnDataFromColoring: true     // ✅ Données 1ère colonne sans couleur (blanc)
  });
  
  this.closeExportModal();
  console.log('📊 === FIN exportData Incidents ===');
}
// incidents.component.ts - Corriger la méthode getEvolutionSheet()

private getEvolutionSheet(): any[] {
  if (!this.incidentData) return [];
  
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
        
        const dayData = this.incidentData!.statsParJour.find(d => 
          new Date(d.date).toISOString().split('T')[0] === dateStr
        );
        
        weekDays.push({
          'Date': date.toLocaleDateString('fr-FR'),
          'Jour': date.toLocaleDateString('fr-FR', { weekday: 'long' }),
          'Créés': dayData?.crees || 0,
          'Non traités': dayData?.nonTraite || 0,
          'En cours': dayData?.enCours || 0,
          'Fermés': dayData?.ferme || 0
        });
      }
      return weekDays;
    }
      
    case 'semaine': {
      // ✅ Afficher les SEMAINES du MOIS SÉLECTIONNÉ (via selectedMonth)
      const year = new Date().getFullYear(); // Année actuelle
      const month = this.selectedMonth; // Mois sélectionné dans le modal
      
      // Premier jour du mois
      const firstDayOfMonth = new Date(year, month - 1, 1);
      // Dernier jour du mois
      const lastDayOfMonth = new Date(year, month, 0);
      
      // Filtrer les semaines qui tombent dans le mois sélectionné
      const weeksInMonth = this.incidentData.statsParSemaine.filter(week => {
        const weekDate = new Date(week.date);
        // Vérifier si la semaine chevauche le mois
        const weekStart = weekDate;
        const weekEnd = new Date(weekDate);
        weekEnd.setDate(weekDate.getDate() + 6);
        
        return (weekStart <= lastDayOfMonth && weekEnd >= firstDayOfMonth);
      });
      
      if (weeksInMonth.length === 0) {
        return [{
          'Information': `Aucune donnée pour le mois de ${this.getMonthName(month)} ${year}`,
          'Créés': 0,
          'Non traités': 0,
          'En cours': 0,
          'Fermés': 0
        }];
      }
      
      return weeksInMonth.map((week) => {
        // Extraire le numéro de semaine
        const weekDate = new Date(week.date);
        const weekNumber = this.getWeekNumber(weekDate);
        
        return {
          'Semaine': `Semaine ${weekNumber} (du ${week.dateFormatee})`,
          'Créés': week.crees,
          'Non traités': week.nonTraite,
          'En cours': week.enCours,
          'Fermés': week.ferme
        };
      });
    }
      
case 'mois': {
  // Afficher les MOIS de l'ANNÉE ACTUELLE
  const currentYear = new Date().getFullYear();
  const monthsInYear = this.incidentData!.statsParMois.filter(month => 
    new Date(month.date).getFullYear() === currentYear
  );
  
  // Fonction pour obtenir le nom du mois à partir de la date
  const getMonthNameFromDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return monthNames[date.getMonth()];
  };
  
  return monthsInYear.map(month => ({
    'Mois': `${getMonthNameFromDate(month.date)} ${currentYear}`,
    'Créés': month.crees,
    'Non traités': month.nonTraite,
    'En cours': month.enCours,
    'Fermés': month.ferme
  }));
}
      
    default:
      return [];
  }
}

// Méthode utilitaire pour obtenir le numéro de semaine
private getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Méthode utilitaire pour obtenir le nom du mois
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
  this.processPannesParGovernorat();   }

initPannesParModeleChart() {
  const data = this.tpeData!.pannesParModele;
  
  // Map des couleurs pastel pour chaque modèle
  const modeleColors: { [key: string]: string } = {
    'Ingenico': '#FCA5A5',  // cyan-300
    'Verifone': '#A7F3D0',  // green-300  
    'PAX': '#FDE047'        // yellow-300
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
      style: { color: '#1E293B', fontSize: '15px', fontWeight: '600', fontFamily: 'Poppins, system-ui, sans-serif' }
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
processPannesParGovernorat() {
  console.log('📊 === DÉBUT processPannesParGovernorat ===');
  
  if (!this.tpeData?.pannesParAdresse) {
    console.warn('⚠️ Aucune donnée pannesParAdresse disponible');
    return;
  }
  
  console.log('📊 Nombre de commerçants:', this.tpeData.pannesParAdresse.length);
  
  // Grouper par gouvernorat
  const govMap = new Map<string, {
    gouvName: string;
    totalTPEs: number;
    totalIncidents: number;
    commercants: any[];
  }>();
  
  for (const item of this.tpeData.pannesParAdresse) {
    const govName = this.govService.extractGovernorateFromAddress(item.adresse);
    
    if (!govMap.has(govName)) {
      govMap.set(govName, {
        gouvName: govName,
        totalTPEs: 0,
        totalIncidents: 0,
        commercants: []
      });
    }
    
    const govData = govMap.get(govName)!;
    govData.totalTPEs += item.nombreTPEs;
    govData.totalIncidents += item.nombreIncidents;
    govData.commercants.push(item);
  }
  
  // Convertir en tableau et calculer les taux
  this.govData = Array.from(govMap.values()).map(gov => ({
    name: gov.gouvName,
    totalTPEs: gov.totalTPEs,
    totalIncidents: gov.totalIncidents,
    tauxPanne: gov.totalTPEs > 0 ? Math.round((gov.totalIncidents / gov.totalTPEs) * 100) : 0,
    commercants: gov.commercants,
    color: this.govService.getGovernorateColor(gov.gouvName)
  })).sort((a, b) => b.tauxPanne - a.tauxPanne);
  
  // ✅ Mettre à jour les statistiques
  this.updateStatsFromGovData();
  
  // Initialiser le graphique
  this.initPannesParGovernoratChart();
}

initPannesParGovernoratChart() {
  console.log('📊 === DÉBUT initPannesParGovernoratChart ===');
  
  const data = this.govData.slice(0, 10);
  
  if (data.length === 0) {
    console.warn('⚠️ Aucune donnée de gouvernorat disponible');
    return;
  }
  
  // Préparer les données pour l'affichage
  const chartData = data.map(g => ({
    name: g.name,
    displayValue: Math.min(g.tauxPanne, 100),
    originalValue: g.tauxPanne,
    totalTPEs: g.totalTPEs,
    totalIncidents: g.totalIncidents,
    color: g.color,
    isOverflow: g.tauxPanne > 100
  }));
  
  // Couleurs pour chaque barre
  const barColors = chartData.map(g => g.isOverflow ? '#FCA5A5' : '#86efac');
  
  this.chartPannesParGovernorat = {
    series: [{
      name: "Taux de panne (%)",
      data: chartData.map(g => g.displayValue)
    }],
    chart: {
      type: 'bar',
      height: Math.max(350, chartData.length * 35),
      toolbar: { show: false },
      fontFamily: 'Poppins, system-ui, sans-serif',
      animations: { enabled: true, easing: 'easeinout', speed: 800 }
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        horizontal: true,
        barHeight: '40%',
        dataLabels: { position: 'top' },
        distributed: true
      }
    },
    xaxis: {
      categories: chartData.map(g => g.name),
      labels: {
        style: { fontSize: '12px', fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 500 },
        trim: false
      },
      title: { text: "Taux de panne (%)", style: { fontSize: '12px', fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 600 } }
    },
    yaxis: {
      labels: { style: { fontSize: '12px', fontFamily: 'Poppins, system-ui, sans-serif' } },
      max: 100
    },
    colors: barColors,
    // ✅ LÉGENDE DÉSACTIVÉE - À METTRE ICI, PAS DANS responsive
    legend: {
      show: false
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number, { dataPointIndex }: any) => {
        const item = chartData[dataPointIndex];
        return `${item.originalValue}%`;
      },
      style: { fontSize: '11px', fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 'bold', colors: ['#1E293B'] },
      offsetX: 10
    },
    tooltip: {
      custom: ({ dataPointIndex }: any) => {
        const item = chartData[dataPointIndex];
        return `
          <div style="padding: 12px 16px; font-family: Poppins; min-width: 240px; border-radius: 12px; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #e2e8f0;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${item.isOverflow ? '#FCA5A5' : '#86efac'};"></div>
              <strong style="color: #0C144E; font-size: 14px;">${item.name}</strong>
              ${item.isOverflow ? '<span style="background: #FEE2E2; color: #FCA5A5; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: bold; margin-left: 8px;">Critique</span>' : ''}
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b;">TPEs:</span>
              <strong style="color: #0C144E;">${item.totalTPEs}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b;">Incidents:</span>
              <strong style="color: #0C144E;">${item.totalIncidents}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid #e2e8f0;">
              <span style="color: #64748b;">Taux de panne:</span>
              <strong style="color: ${item.isOverflow ? '#FCA5A5' : '#86efac'}; font-size: 14px;">${item.originalValue}%</strong>
            </div>
           
          </div>
        `;
      }
    },
    title: {
      text: 'Taux de panne par gouvernorat',
      align: 'center',
      style: { fontSize: '15px', fontWeight: '600', fontFamily: 'Poppins, system-ui, sans-serif', color: '#0C144E' }
    },
    grid: { borderColor: '#e2e8f0', strokeDashArray: 4, position: 'back' },
    states: { hover: { filter: { type: 'darken', value: 0.1 } } },
    responsive: [{
      breakpoint: 768,
      options: {
        chart: { height: 300 },
        plotOptions: { bar: { barHeight: '35%' } },
        dataLabels: { style: { fontSize: '9px' } },
        xaxis: { labels: { style: { fontSize: '10px' } } }
      }
    }]
  };
  
  console.log('✅ Graphique chartPannesParGovernorat configuré');
  console.log('📊 Couleurs finales:', barColors);
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


// Ajouter cette méthode dans la classe IncidentsComponent
updateStatsFromGovData() {
  this.totalTPEs = this.govData.reduce((sum, g) => sum + g.totalTPEs, 0);
  this.totalIncidents = this.govData.reduce((sum, g) => sum + g.totalIncidents, 0);
  this.tauxMoyen = this.govData.length > 0 
    ? this.govData.reduce((sum, g) => sum + g.tauxPanne, 0) / this.govData.length 
    : 0;
  
  console.log('📊 Statistiques mises à jour:', {
    totalTPEs: this.totalTPEs,
    totalIncidents: this.totalIncidents,
    tauxMoyen: this.tauxMoyen
  });
}
  isNavigating = false;

 navigateToPredictions() {
    this.isNavigating = true;
    
    // Petit délai pour l'animation (optionnel)
    setTimeout(() => {
      this.router.navigate(['/predictions']);
    }, 300);
  }

  closeDropdown() {
    this.isOpen = false;
  }
}