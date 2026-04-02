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

  // Options pour les filtres
  severiteOptions = [
    { value: SeveriteIncident.Faible, label: 'Faible' },
    { value: SeveriteIncident.Moyenne, label: 'Moyenne' },
    { value: SeveriteIncident.Forte, label: 'Forte' }
  ];

  statutOptions = [
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

    // Récupérer le profil de l'utilisateur connecté
    this.userService.getMyProfile().subscribe({
      next: (user) => {
        this.userRole = user.role; // Stocker le rôle
        console.log(this.userRole)
        if (user.role === 'Admin') {
          this.loadIncidents(); // Admin utilise searchIncidents avec filtres
        } else {
          this.loadMyIncidents(); // Commerçant utilise getMyIncidents
        }
      },
      error: (err) => {
        this.error = 'Impossible de récupérer le profil utilisateur';
        console.error(err);
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
  this.incidentService.getMyIncidents().subscribe({
    next: (response: any) => {
      // Adapter selon la structure de réponse
      if (response.data) {
        this.incidents = response.data;
      } else if (Array.isArray(response)) {
        this.incidents = response;
      } else {
        this.incidents = [];
      }
      
      this.filteredIncidents = [...this.incidents];
      this.totalCount = this.incidents.length;
      this.totalPages = Math.ceil(this.totalCount / this.pageSize);
      this.loading = false;
    },
    error: (err) => {
      this.error = 'Impossible de charger vos incidents';
      console.error(err);
      this.loading = false;
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


// Recherche avec debounce
onSearch(): void {
  if (this.searchTimeout) clearTimeout(this.searchTimeout);
  
  this.searchTimeout = setTimeout(() => {
    console.log('🔍 Recherche lancée pour:', this.searchTerm);
    this.currentPage = 1;
    if (this.userRole === 'Admin') {
      this.loadIncidents();
    } else {
      // Pour le commerçant, filtrer côté client
      this.filterMerchantIncidents();
    }
  }, 400);
}

// Filtrer les incidents du commerçant côté client
filterMerchantIncidents(): void {
  if (!this.searchTerm) {
    this.filteredIncidents = this.incidents;
  } else {
    const term = this.searchTerm.toLowerCase();
    this.filteredIncidents = this.incidents.filter(incident => {
      // Convertir le typeProbleme (enum) en string pour la recherche
      const typeProblemeStr = this.getTypeProblemeLibelle(incident.typeProbleme)?.toLowerCase() || '';
      
      return incident.codeIncident?.toLowerCase().includes(term) ||
             incident.emplacement?.toLowerCase().includes(term) ||
             typeProblemeStr.includes(term);
    });
  }
  this.totalCount = this.filteredIncidents.length;
  this.totalPages = Math.ceil(this.totalCount / this.pageSize);
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
// Application des filtres
applyFilters(): void {
  console.log('🎯 Filtres appliqués - Sévérité:', this.tempFilters.severite, 'Statut:', this.tempFilters.statut);
  
  // Mettre à jour les filtres sélectionnés
  this.selectedSeverite = this.tempFilters.severite;
  this.selectedStatut = this.tempFilters.statut;
  
  this.currentPage = 1;
  
  if (this.userRole === 'Admin') {
    this.loadIncidents(); // Admin utilise l'API avec filtres
  } else {
    this.filterMerchantIncidentsWithFilters(); // Commerçant filtre côté client
  }
  
  this.showFilters = false;
}

// Filtrer les incidents du commerçant avec tous les filtres
filterMerchantIncidentsWithFilters(): void {
  let filtered = [...this.incidents];
  
  // Filtre par terme de recherche
  if (this.searchTerm) {
    const term = this.searchTerm.toLowerCase();
    filtered = filtered.filter(incident => {
      const typeProblemeStr = this.getTypeProblemeLibelle(incident.typeProbleme)?.toLowerCase() || '';
      
      return incident.codeIncident?.toLowerCase().includes(term) ||
             incident.emplacement?.toLowerCase().includes(term) ||
             typeProblemeStr.includes(term);
    });
  }
  
  // Filtre par sévérité
  if (this.selectedSeverite != null) {
    filtered = filtered.filter(incident => 
      Number(incident.severiteIncident) === this.selectedSeverite
    );
  }
  
  // Filtre par statut
  if (this.selectedStatut != null) {
    filtered = filtered.filter(incident => 
      Number(incident.statutIncident) === this.selectedStatut
    );
  }
  
  this.filteredIncidents = filtered;
  this.totalCount = filtered.length;
  this.totalPages = Math.ceil(this.totalCount / this.pageSize);
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
  console.log('Sévérité reçue:', severite, 'Type:', typeof severite);
  
  // Cas 1: La sévérité est 0 ou null
  if (severite === 0 || severite === null || severite === undefined) {
    return 'light'; // Gris pour "Non définie"
  }
  
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
        // Si la string n'est pas reconnue, essayer de la parser en nombre
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
      return 'light'; // Gris pour les autres cas
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
  
  // Si c'est une string comme "Moyenne"
  if (typeof incident.severiteIncident === 'string') {
    return incident.severiteIncident;
  }
  
  // Si c'est un nombre, le convertir en libellé
  if (typeof incident.severiteIncident === 'number') {
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
  
  return 'Non définie';
}
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
     
    
      case 'en cours':
      case 'encours':
        statutValue = StatutIncident.EnCours;
        console.log('✅ Correspond à En cours');
        break;
      case 'en attente':
     
      case 'résolu':
      case 'resolu':
        statutValue = StatutIncident.Ferme;
        console.log('✅ Correspond à Fermé');
        break;
      case 'fermé':
     
      default:
        console.log('❌ Aucune correspondance trouvée pour:', statutClean);
        statutValue = StatutIncident.EnCours;
    }
  } else {
    statutValue = statut;
    console.log('Statut nombre reçu:', statutValue);
  }
  
  console.log('Valeur finale du statut:', statutValue);
  
  switch(statutValue) {
   
  
    case StatutIncident.EnCours:
      return 'warning';
  
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

// Reset des filtres
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
    this.filteredIncidents = this.incidents;
    this.totalCount = this.incidents.length;
    this.totalPages = Math.ceil(this.totalCount / this.pageSize);
  }
  this.showFilters = false;
}
deleting = false;

}