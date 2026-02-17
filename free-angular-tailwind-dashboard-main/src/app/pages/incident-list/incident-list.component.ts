import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AvatarTextComponent } from '../../shared/components/ui/avatar/avatar-text.component';
import { BadgeColor, BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { CheckboxComponent } from '../../shared/components/form/input/checkbox.component';
import { Incident, SeveriteIncident, StatutIncident } from '../../shared/models/incident.model';
import { IncidentService } from '../../shared/services/incident.service';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-incident-list',
  standalone: true,
  imports: [
    CommonModule, AlertComponent,
    RouterModule, FormsModule,
    BadgeComponent, AvatarTextComponent,
    CheckboxComponent, ButtonComponent
  ],
  templateUrl: './incident-list.component.html',
  styles: ``
})
export class IncidentListComponent implements OnInit {
  incidents: Incident[] = [];
  filteredIncidents: Incident[] = [];
  loading = true;
  error: string | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 5;
  totalPages = 1;
  totalCount = 0;

  // Filtres
  searchTerm = '';
  selectedSeverite?: number;
  selectedStatut?: number;
  selectedYear: string = '';

  // Options pour les filtres
  severiteOptions = [
    { value: SeveriteIncident.Faible, label: 'Faible' },
    { value: SeveriteIncident.Moyenne, label: 'Moyenne' },
    { value: SeveriteIncident.Forte, label: 'Forte' }
  ];

  statutOptions = [
    { value: StatutIncident.Nouveau, label: 'Nouveau' },
    { value: StatutIncident.Assigne, label: 'Assigné' },
    { value: StatutIncident.EnCours, label: 'En cours' },
    { value: StatutIncident.EnAttente, label: 'En attente' },
    { value: StatutIncident.Resolu, label: 'Résolu' },
    { value: StatutIncident.Ferme, label: 'Fermé' }
  ];

  // Années pour le filtre
  yearOptions: string[] = [];

  // Pour la sélection multiple


  // Pour la confirmation de suppression
  confirmIncident: Incident | null = null;
  alert = {
    show: false,
    variant: 'info' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: ''
  };

  private searchTimeout: any;

  constructor(
    private incidentService: IncidentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.generateYearOptions();
    this.loadIncidents();
  }

  // Générer les 10 dernières années pour le filtre
  generateYearOptions(): void {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 10; i++) {
      this.yearOptions.push((currentYear - i).toString());
    }
  }

  // Chargement des incidents avec pagination et filtres côté client
// Dans incident-list.component.ts

// Chargement des incidents avec pagination et filtres
loadIncidents(): void {
  this.loading = true;
  this.error = null;

  // Si on a des filtres spécifiques, on utilise les endpoints dédiés
  if (this.selectedSeverite !== undefined && this.selectedSeverite !== null) {
    // Filtrer par sévérité
    this.incidentService.getIncidentsBySeverite(this.selectedSeverite).subscribe({
      next: (incidents) => {
        this.applyFiltersAndPaginate(incidents);
      },
      error: (err) => this.handleError(err)
    });
  } 
  else if (this.selectedStatut !== undefined && this.selectedStatut !== null) {
    // Filtrer par statut
    this.incidentService.getIncidentsByStatut(this.selectedStatut).subscribe({
      next: (incidents) => {
        this.applyFiltersAndPaginate(incidents);
      },
      error: (err) => this.handleError(err)
    });
  } 
  else {
    // Pas de filtres spécifiques, on charge tout
    this.incidentService.getAllIncidents().subscribe({
      next: (incidents) => {
        this.applyFiltersAndPaginate(incidents);
      },
      error: (err) => this.handleError(err)
    });
  }
}

// Méthode pour appliquer tous les filtres et la pagination
private applyFiltersAndPaginate(incidents: Incident[]): void {
  console.log('✅ Incidents chargés:', incidents.length);
  
  // Appliquer les filtres côté client
  let filtered = incidents || [];
  
  // 1. FILTRE PAR RECHERCHE TEXTE (code, titre, créateur, année)
  if (this.searchTerm?.trim()) {
    const term = this.searchTerm.toLowerCase().trim();
    filtered = filtered.filter(incident => {
      // Recherche par code
      const codeMatch = (incident.codeIncident?.toLowerCase() || '').includes(term);
      
      // Recherche par titre
      const titreMatch = (incident.titreIncident?.toLowerCase() || '').includes(term);
      
      // Recherche par créateur
      const createurMatch = (incident.createdByName?.toLowerCase() || '').includes(term);
      
      // Recherche par année de création
      let anneeMatch = false;
      if (incident.dateDetection) {
        const annee = new Date(incident.dateDetection).getFullYear().toString();
        anneeMatch = annee.includes(term);
      }
      
      return codeMatch || titreMatch || createurMatch || anneeMatch;
    });
    console.log(`🔍 Recherche "${term}" → ${filtered.length} résultats`);
  }
  
  // 2. FILTRE PAR SÉVÉRITÉ (seulement si pas déjà filtré par l'API)
  if (this.selectedSeverite !== undefined && this.selectedSeverite !== null && 
      !(this.selectedSeverite !== undefined && this.selectedSeverite !== null)) {
    // Cette condition est déjà gérée par l'API, donc on ne refiltre pas
  }
  
  // 3. FILTRE PAR STATUT (seulement si pas déjà filtré par l'API)
  if (this.selectedStatut !== undefined && this.selectedStatut !== null && 
      !(this.selectedStatut !== undefined && this.selectedStatut !== null)) {
    // Cette condition est déjà gérée par l'API, donc on ne refiltre pas
  }
  
  // 4. FILTRE PAR ANNÉE
  if (this.selectedYear && this.selectedYear.trim() !== '') {
    console.log('Filtre année appliqué:', this.selectedYear);
    filtered = filtered.filter(incident => {
      if (!incident.dateDetection) return false;
      const year = new Date(incident.dateDetection).getFullYear().toString();
      return year === this.selectedYear;
    });
  }
  
  console.log('📊 Résultats après tous les filtres:', filtered.length);
  
  // Pagination côté client
  this.totalCount = filtered.length;
  this.totalPages = Math.ceil(filtered.length / this.pageSize) || 1;
  
  // Ajuster la page courante si nécessaire
  if (this.currentPage > this.totalPages) {
    this.currentPage = this.totalPages;
  }
  
  const startIndex = (this.currentPage - 1) * this.pageSize;
  const endIndex = startIndex + this.pageSize;
  this.incidents = filtered.slice(startIndex, endIndex);
  this.filteredIncidents = this.incidents;
  
  console.log('📄 Page', this.currentPage, ':', this.incidents.length, 'incidents');
  
  // Reset de la sélection

  
  this.loading = false;
}

private handleError(err: any): void {
  console.error('❌ Erreur chargement incidents:', err);
  this.error = 'Impossible de charger la liste des incidents';
  this.loading = false;
  this.incidents = [];
  this.filteredIncidents = [];
  this.totalPages = 1;
  this.totalCount = 0;
}

// Recherche avec debounce
onSearch(): void {
  if (this.searchTimeout) clearTimeout(this.searchTimeout);
  
  this.searchTimeout = setTimeout(() => {
    console.log('🔍 Recherche lancée pour:', this.searchTerm);
    this.currentPage = 1;
    this.loadIncidents();
  }, 400);
}

// Application des filtres (sévérité, statut, année)
applyFilter(): void {
  console.log('🎯 Filtres appliqués - Sévérité:', this.selectedSeverite, 'Statut:', this.selectedStatut, 'Année:', this.selectedYear);
  this.currentPage = 1;
  this.loadIncidents();
}

// Reset des filtres
resetFilters(): void {
  console.log('🔄 Reset tous les filtres');
  this.searchTerm = '';
  this.selectedSeverite = undefined;
  this.selectedStatut = undefined;
  this.selectedYear = '';
  this.currentPage = 1;
  this.loadIncidents();
}

  // Gestion de la pagination
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadIncidents();
    }
  }

  // Génération des numéros de page
  getPageNumbers(): number[] {
    if (this.totalPages <= 0) {
      return [1];
    }
    
    const maxVisible = 5;
    const pages: number[] = [];
    
    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push(-1);
        pages.push(this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = this.totalPages - 3; i <= this.totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(this.totalPages);
      }
    }
    
    return pages;
  }

  // Pour la suppression simple
  onDelete(incident: Incident) {
    this.confirmIncident = incident;
    this.alert = {
      show: true,
      variant: 'warning',
      title: 'Confirmation',
      message: `Voulez-vous vraiment supprimer l'incident "${incident.titreIncident}" ?`
    };
  }

  confirmDelete() {
    if (!this.confirmIncident) return;

    this.incidentService.deleteIncident(this.confirmIncident.id).subscribe({
      next: () => {
        this.showAlert('success', 'Incident supprimé', `L'incident "${this.confirmIncident!.titreIncident}" a été supprimé.`);
        this.confirmIncident = null;
        this.alert.show = false;
        this.loadIncidents(); // Recharger la liste
      },
      error: (err) => {
        console.error(err);
        this.showAlert('error', 'Erreur', `Impossible de supprimer l'incident "${this.confirmIncident!.titreIncident}".`);
        this.confirmIncident = null;
        this.alert.show = false;
      }
    });
  }

  cancelDelete() {
    this.confirmIncident = null;
    this.alert.show = false;
  }

  showAlert(variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string) {
    this.alert = { show: true, variant, title, message };
    setTimeout(() => (this.alert.show = false), 3000);
  }



  // Navigation
  viewIncidentDetails(id: string): void {
    this.router.navigate(['/incidents', id]);
  }

// Dans incident-list.component.ts

// Helper pour les badges de sévérité
// Dans incident-list.component.ts

// Helper pour les badges de sévérité
// Helper pour les badges de sévérité
getSeveriteBadgeColor(severite: SeveriteIncident | string): BadgeColor {
  // Convertir en nombre si c'est une string
  let severiteValue: number;
  
  if (typeof severite === 'string') {
    // Mapper les strings vers les nombres
    switch(severite) {
      case 'Faible':
        severiteValue = SeveriteIncident.Faible;
        break;
      case 'Moyenne':
        severiteValue = SeveriteIncident.Moyenne;
        break;
      case 'Forte':
        severiteValue = SeveriteIncident.Forte;
        break;
      default:
        severiteValue = SeveriteIncident.Moyenne;
    }
  } else {
    severiteValue = severite;
  }
  
  switch(severiteValue) {
    case SeveriteIncident.Faible:
      return 'success'; // Vert
    case SeveriteIncident.Moyenne:
      return 'warning'; // Orange
    case SeveriteIncident.Forte:
      return 'error'; // Rouge
    default:
      return 'info';
  }
}

// Helper pour les badges de statut
// Helper pour les badges de statut
getStatutBadgeColor(statut: StatutIncident | string): BadgeColor {
  console.log('Statut reçu:', statut, 'Type:', typeof statut);
  
  // Convertir en nombre si c'est une string
  let statutValue: number;
  
  if (typeof statut === 'string') {
    console.log('Statut string reçu exactement:', JSON.stringify(statut));
    
    // Nettoyer la string (enlever les espaces, accents, etc)
    const statutClean = statut.trim().toLowerCase();
    console.log('Statut nettoyé:', statutClean);
    
    // Mapper les strings vers les nombres
    switch(statutClean) {
      case 'nouveau':
        statutValue = StatutIncident.Nouveau;
        console.log('✅ Correspond à Nouveau');
        break;
      case 'assigné':
      case 'assigne':
        statutValue = StatutIncident.Assigne;
        console.log('✅ Correspond à Assigné');
        break;
      case 'en cours':
      case 'encours':
        statutValue = StatutIncident.EnCours;
        console.log('✅ Correspond à En cours');
        break;
      case 'en attente':
      case 'enattente':
        statutValue = StatutIncident.EnAttente;
        console.log('✅ Correspond à En attente');
        break;
      case 'résolu':
      case 'resolu':
        statutValue = StatutIncident.Resolu;
        console.log('✅ Correspond à Résolu');
        break;
      case 'fermé':
      case 'ferme':
        statutValue = StatutIncident.Ferme;
        console.log('✅ Correspond à Fermé');
        break;
      default:
        console.log('❌ Aucune correspondance trouvée pour:', statutClean);
        statutValue = StatutIncident.Nouveau;
    }
  } else {
    statutValue = statut;
    console.log('Statut nombre reçu:', statutValue);
  }
  
  console.log('Valeur finale du statut:', statutValue);
  
  switch(statutValue) {
    case StatutIncident.Nouveau:
      return 'info';
    case StatutIncident.Assigne:
      return 'primary';
    case StatutIncident.EnCours:
      return 'warning';
    case StatutIncident.EnAttente:
      return 'light';
    case StatutIncident.Resolu:
      return 'success';
    case StatutIncident.Ferme:
      return 'dark';
    default:
      return 'info';
  }
}
  // Formatter la date
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Extraire l'année d'une date
  extractYear(date: Date): string {
    return new Date(date).getFullYear().toString();
  }
}