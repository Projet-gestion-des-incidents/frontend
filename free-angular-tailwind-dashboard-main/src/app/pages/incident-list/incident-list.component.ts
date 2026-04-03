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
import { UserService } from '../../shared/services/user.service';

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
  allIncidents: Incident[] = [];
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

// Modifiez les options pour les filtres
severiteOptions = [
  { value: 0, label: 'Non définie' },      // Ajout de l'option Non définie (valeur 0)
  { value: SeveriteIncident.Faible, label: 'Faible' },
  { value: SeveriteIncident.Moyenne, label: 'Moyenne' },
  { value: SeveriteIncident.Forte, label: 'Forte' }
];

statutOptions = [
  { value: StatutIncident.NonTraite, label: 'Non traité' },  // Ajout de l'option Non traité
  { value: StatutIncident.EnCours, label: 'En cours' },
  { value: StatutIncident.Ferme, label: 'Fermé' }
];



  // Années pour le filtre
  yearOptions: string[] = [];

  userRole: string = '';


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
        private userService: UserService,

    private router: Router
  ) {}

ngOnInit(): void {
  this.generateYearOptions();

  this.userService.getMyProfile().subscribe({
    next: (user) => {
      this.userRole = user.role;
      console.log('Rôle utilisateur:', this.userRole);
      
      if (user.role === 'Admin') {
        this.loadIncidents();
      } else {
        // ✅ Charger avec les filtres dès le départ
        this.loadMyIncidentsWithFilters();
      }
    },
    error: (err) => {
      this.error = 'Impossible de récupérer le profil utilisateur';
      console.error(err);
      this.loading = false;
    }
  });
}



  // Générer les 10 dernières années pour le filtre
  generateYearOptions(): void {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 10; i++) {
      this.yearOptions.push((currentYear - i).toString());
    }
  }

// Pour le commerçant
loadMyIncidents(): void {
  this.loading = true;
  this.error = null;
  
  console.log('🔄 Chargement des incidents du commerçant...');
  
  this.incidentService.getMyIncidents().subscribe({
    next: (response: any) => {
      console.log('📦 Réponse brute my-incidents:', response);
      
      let incidentsList: Incident[] = [];
      let total = 0;
      
      // ✅ CORRECTION: La réponse a directement les propriétés items, page, totalCount, etc.
      // Pas de wrapper "data"
      if (response?.items && Array.isArray(response.items)) {
        incidentsList = response.items;
        total = response.totalCount || incidentsList.length;
        console.log('✅ Cas 1 - Structure avec items directement (pas de wrapper data)');
      }
      // Cas 2: Structure avec wrapper data
      else if (response?.data?.items && Array.isArray(response.data.items)) {
        incidentsList = response.data.items;
        total = response.data.totalCount || incidentsList.length;
        console.log('✅ Cas 2 - Structure paginée (data.items)');
      }
      // Cas 3: Structure simple { data: [...] }
      else if (response?.data && Array.isArray(response.data)) {
        incidentsList = response.data;
        total = incidentsList.length;
        console.log('✅ Cas 3 - Structure simple (data tableau)');
      }
      // Cas 4: Tableau direct
      else if (Array.isArray(response)) {
        incidentsList = response;
        total = incidentsList.length;
        console.log('✅ Cas 4 - Tableau direct');
      }
      else {
        console.warn('⚠️ Structure non reconnue:', response);
      }
      
      console.log(`📊 ${incidentsList.length} incidents chargés`);
      if (incidentsList.length > 0) {
        console.log('📊 Premier incident:', incidentsList[0]);
      }
      
      this.incidents = incidentsList;
      this.filteredIncidents = [...incidentsList];
      this.totalCount = total;
      this.totalPages = Math.ceil(this.totalCount / this.pageSize);
      this.currentPage = 1;
      
      this.loading = false;
    },
    error: (err) => {
      console.error('❌ Erreur détaillée:', err);
      this.error = 'Impossible de charger vos incidents: ' + (err.message || 'Erreur inconnue');
      this.loading = false;
      this.incidents = [];
      this.filteredIncidents = [];
      this.totalCount = 0;
      this.totalPages = 1;
    }
  });
}

loadIncidents(): void {
  this.loading = true;
  this.error = null;

  // Construction des paramètres de recherche
  const searchParams: any = {
  Page: this.currentPage,
  PageSize: this.pageSize,
  SearchTerm: this.searchTerm || '',
  SortBy: 'DateDetection',
  SortDescending: true
};


  // Ajouter les filtres seulement s'ils sont définis
  if (this.selectedSeverite != null) {
  searchParams.SeveriteIncident = this.selectedSeverite;
}

if (this.selectedStatut != null) {
  searchParams.StatutIncident = this.selectedStatut;
}

if (this.selectedYear) {
  searchParams.YearDetection = Number(this.selectedYear);
}



  console.log('🔍 Envoi requête avec params:', searchParams);

  this.incidentService.searchIncidents(searchParams).subscribe({
    next: (response: any) => {
      console.log('📦 Réponse brute:', response);
      
      // Vérifier la structure de la réponse
      if (response) {
        // Cas 1: Response avec propriété 'data'
        if (response.data) {
          if (Array.isArray(response.data)) {
            // Si data est un tableau
            this.incidents = response.data;
            this.filteredIncidents = response.data;
            this.totalCount = response.data.length;
            this.totalPages = Math.ceil(response.data.length / this.pageSize);
          } else if (response.data.items) {
            // Si data a une propriété 'items' (format PagedResult)
            this.incidents = response.data.items;
            this.filteredIncidents = response.data.items;
            this.totalCount = response.data.totalCount || response.data.items.length;
            this.totalPages = response.data.totalPages || Math.ceil(this.totalCount / this.pageSize);
          }
        }
        // Cas 2: Response avec propriété 'items' directement
        else if (response.items) {
          this.incidents = response.items;
          this.filteredIncidents = response.items;
          this.totalCount = response.totalCount || response.items.length;
          this.totalPages = response.totalPages || Math.ceil(this.totalCount / this.pageSize);
        }
        // Cas 3: Response est un tableau direct
        else if (Array.isArray(response)) {
          this.incidents = response;
          this.filteredIncidents = response;
          this.totalCount = response.length;
          this.totalPages = Math.ceil(response.length / this.pageSize);
        }
        
        console.log('✅ Incidents chargés:', this.incidents.length);
        console.log('📊 Total count:', this.totalCount);
        console.log('📄 Pages:', this.totalPages);
      }
      
      this.loading = false;
    },
    error: (err) => {
      console.error('❌ Erreur détaillée:', err);
      this.error = 'Impossible de charger la liste des incidents: ' + (err.message || 'Erreur inconnue');
      this.loading = false;
      this.incidents = [];
      this.filteredIncidents = [];
      this.totalPages = 1;
      this.totalCount = 0;
    }
  });
}


onSearch(): void {
  if (this.searchTimeout) clearTimeout(this.searchTimeout);
  
  this.searchTimeout = setTimeout(() => {
    console.log('🔍 Recherche lancée pour:', this.searchTerm);
    this.currentPage = 1;
    if (this.userRole === 'Admin') {
      this.loadIncidents();
    } else {
      // ✅ Utiliser l'API avec le terme de recherche
      this.loadMyIncidentsWithFilters();
    }
  }, 400);
}


getTypeProblemeLibelle(typeProbleme: any): string {
  if (typeProbleme === undefined || typeProbleme === null) return '';
  
  // Si c'est déjà un nombre (enum)
  if (typeof typeProbleme === 'number') {
    switch(typeProbleme) {
      case 1: return 'Paiement refusé';
      case 2: return 'Terminal hors ligne';
      case 3: return 'Lenteur';
      case 4: return 'Bug affichage';
      case 5: return 'Connexion réseau';
      case 6: return 'Erreur flux transactionnel';
      case 7: return 'Problème logiciel TPE';
      case 8: return 'Autre';
      default: return '';
    }
  }
  
  // Si c'est une string (ancien format)
  if (typeof typeProbleme === 'string') {
    return typeProbleme;
  }
  
  return '';
}
loadMyIncidentsWithFilters(): void {
  this.loading = true;
  this.error = null;
  
  // Construction des paramètres de recherche
  const searchParams: any = {
    Page: this.currentPage,
    PageSize: this.pageSize,
    SearchTerm: this.searchTerm || '',
    SortBy: 'DateDetection',
    SortDescending: true
  };
  
  // ✅ CORRECTION CRUCIALE: Convertir le statut en STRING pour l'API
  if (this.selectedStatut !== undefined && this.selectedStatut !== null) {
    let statutString = '';
    switch(this.selectedStatut) {
      case 0: // StatutIncident.NonTraite
        statutString = 'NonTraite';
        break;
      case 1: // StatutIncident.EnCours
        statutString = 'EnCours';
        break;
      case 2: // StatutIncident.Ferme
        statutString = 'Ferme';
        break;
      default:
        statutString = '';
    }
    if (statutString) {
      searchParams.StatutIncident = statutString;
    }
  }
  
  // Ajouter le filtre par année
  if (this.selectedYear) {
    searchParams.YearDetection = Number(this.selectedYear);
  }
  
  console.log('🔍 Envoi requête my-incidents avec params:', searchParams);
  
  this.incidentService.searchMyIncidents(searchParams).subscribe({
    next: (response: any) => {
      console.log('📦 Réponse my-incidents filtrée:', response);
      
      let incidentsList: Incident[] = [];
      let total = 0;
      
      if (response?.items && Array.isArray(response.items)) {
        incidentsList = response.items;
        total = response.totalCount || incidentsList.length;
      }
      else if (response?.data?.items && Array.isArray(response.data.items)) {
        incidentsList = response.data.items;
        total = response.data.totalCount || incidentsList.length;
      }
      else if (Array.isArray(response)) {
        incidentsList = response;
        total = incidentsList.length;
      }
      
      this.incidents = incidentsList;
      this.filteredIncidents = [...incidentsList];
      this.totalCount = total;
      this.totalPages = Math.ceil(total / this.pageSize);
      
      this.loading = false;
    },
    error: (err) => {
      console.error('❌ Erreur:', err);
      this.error = 'Impossible de charger vos incidents';
      this.loading = false;
      this.incidents = [];
      this.filteredIncidents = [];
      this.totalCount = 0;
      this.totalPages = 1;
    }
  });
}
applyFilters(): void {
  console.log('🎯 Filtres appliqués - Sévérité:', this.tempFilters.severite, 'Statut:', this.tempFilters.statut);
  
  // ✅ Convertir la valeur du statut pour l'affichage et l'utilisation
  let statutPourAffichage = this.tempFilters.statut;
  
  // Mettre à jour les filtres sélectionnés
  this.selectedSeverite = this.tempFilters.severite;
  this.selectedStatut = this.tempFilters.statut;
  
  this.currentPage = 1;
  
  if (this.userRole === 'Admin') {
    this.loadIncidents();
  } else {
    // ✅ Recharger avec les nouveaux filtres
    this.loadMyIncidentsWithFilters();
  }
  
  this.showFilters = false;
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

 onPageChange(page: number): void {
  if (page >= 1 && page <= this.totalPages) {
    this.currentPage = page;
    if (this.userRole === 'Admin') {
      this.loadIncidents();
    } else {
      this.loadMyIncidentsWithFilters();
    }
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

 // Pour la suppression simple - MODIFIER
onDelete(incident: Incident) {
  this.confirmIncident = incident;
  // Ne pas utiliser l'alerte, on utilise le modal directement
}
StatutIncident = StatutIncident; 
confirmDelete() {
  if (!this.confirmIncident) return;

  this.deleting = true;
  
  this.incidentService.deleteIncident(this.confirmIncident.id).subscribe({
    next: () => {
      this.showAlert('success', 'Incident supprimé', `L'incident "${this.confirmIncident!.codeIncident}" a été supprimé.`);
      this.confirmIncident = null;
      this.deleting = false;
      this.loadIncidents(); // Recharger la liste
    },
    error: (err) => {
      console.error(err);
      this.showAlert('error', 'Erreur', `Impossible de supprimer l'incident "${this.confirmIncident!.codeIncident}".`);
      this.confirmIncident = null;
      this.deleting = false;
    }
  });
}

cancelDelete() {
  this.confirmIncident = null;
  this.deleting = false;
}

  showAlert(variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string) {
    this.alert = { show: true, variant, title, message };
    setTimeout(() => (this.alert.show = false), 3000);
  }



  // Navigation
  viewIncidentDetails(id: string): void {
    this.router.navigate(['/incidents', id]);
  }

getSeveriteBadgeColor(severite: any): BadgeColor {
  // Cas 1: La sévérité est 0 ou null
  if (severite === 0 || severite === null || severite === undefined) {
    return 'light'; // Gris pour "Non définie"
  }
  
  let severiteValue: number;
  
  if (typeof severite === 'string') {
    switch(severite) {
      case 'Non définie':
        return 'light';
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
        const parsed = parseInt(severite);
        severiteValue = isNaN(parsed) ? 0 : parsed;
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
      return 'light'; // Gris pour "Non définie"
  }
}
getSeveriteLibelle(incident: any): string {
  // Si le libellé est déjà fourni
  if (incident.severiteIncidentLibelle) {
    return incident.severiteIncidentLibelle;
  }
  
  // Si la sévérité est 0 ou null
  if (incident.severiteIncident === 0 || 
      incident.severiteIncident === null || 
      incident.severiteIncident === undefined) {
    return 'Non définie';
  }
  
  // Si c'est une string
  if (typeof incident.severiteIncident === 'string') {
    return incident.severiteIncident;
  }
  
  // Si c'est un nombre
  switch(incident.severiteIncident) {
    case SeveriteIncident.Faible:
      return 'Faible';
    case SeveriteIncident.Moyenne:
      return 'Moyenne';
    case SeveriteIncident.Forte:
      return 'Forte';
    default:
      return 'Non définie';
  }
}
getStatutBadgeColor(statut: StatutIncident | string | number): BadgeColor {
  console.log('Statut reçu:', statut, 'Type:', typeof statut);
  
  // Convertir en nombre si c'est une string
  let statutValue: number;
  
  if (typeof statut === 'string') {
    const statutClean = statut.trim().toLowerCase();
    
    switch(statutClean) {
      case 'non traité':
      case 'nontraite':
      case 'non_traite':
        statutValue = StatutIncident.NonTraite;
        break;
      case 'en cours':
      case 'encours':
        statutValue = StatutIncident.EnCours;
        break;
      case 'fermé':
      case 'ferme':
      case 'résolu':
      case 'resolu':
        statutValue = StatutIncident.Ferme;
        break;
      default:
        statutValue = StatutIncident.NonTraite;
    }
  } else {
    statutValue = statut;
  }
  
  switch(statutValue) {
    case StatutIncident.NonTraite:
      return 'info';  // Bleu pour "Non traité"
    case StatutIncident.EnCours:
      return 'warning';  // Orange pour "En cours"
    case StatutIncident.Ferme:
      return 'success';  // Vert pour "Fermé"
    default:
      return 'info';
  }
}
getStatutLibelle(statut: number | string): string {
  if (statut === undefined || statut === null) return 'Non traité';
  
  let statutValue: number;
  
  if (typeof statut === 'string') {
    const statutClean = statut.trim().toLowerCase();
    switch(statutClean) {
      case 'non traité':
      case 'nontraite':
        return 'Non traité';
      case 'en cours':
      case 'encours':
        return 'En cours';
      case 'fermé':
      case 'ferme':
      case 'résolu':
      case 'resolu':
        return 'Fermé';
      default:
        return statut;
    }
  }
  
  statutValue = statut;
  
  switch(statutValue) {
    case StatutIncident.NonTraite:
      return 'Non traité';
    case StatutIncident.EnCours:
      return 'En cours';
    case StatutIncident.Ferme:
      return 'Fermé';
    default:
      return 'Non traité';
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

  // Ajoutez ces propriétés dans la classe
showFilters = false;
tempFilters = {
  severite: undefined as number | undefined,
  statut: undefined as number | undefined,
  dateDebut: '',
  dateFin: ''
};

// Ajoutez ces méthodes
toggleFilters(): void {
  this.showFilters = !this.showFilters;
  if (this.showFilters) {
    // Initialiser les filtres temporaires avec les valeurs actuelles
    this.tempFilters = {
      severite: this.selectedSeverite,
      statut: this.selectedStatut,
      dateDebut: '',
      dateFin: ''
    };
  }
}



cancelFilters(): void {
  this.showFilters = false;
  this.tempFilters = {
    severite: this.selectedSeverite,
    statut: this.selectedStatut,
    dateDebut: '',
    dateFin: ''
  };
}

clearFilters(): void {
  this.tempFilters = {
    severite: undefined,
    statut: undefined,
    dateDebut: '',
    dateFin: ''
  };
  this.selectedSeverite = undefined;
  this.selectedStatut = undefined;
  this.selectedYear = '';
  this.searchTerm = '';
  this.currentPage = 1;
  
  if (this.userRole === 'Admin') {
    this.loadIncidents();
  } else {
    // ✅ Appeler loadMyIncidentsWithFilters avec les paramètres par défaut
    this.loadMyIncidentsWithFilters();
  }
  this.showFilters = false;
}
deleting = false;

}