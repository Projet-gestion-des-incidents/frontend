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
import { DatePickerComponent } from '../../shared/components/form/date-picker/date-picker.component';
// Dans incident-list.component.ts, ajoutez ces imports manquants en haut du fichier :
import { TypeEntiteImpactee } from '../../shared/models/incident.model';
import { EntiteImpacteeService } from '../../shared/services/entite-impactee.service';

@Component({
  selector: 'app-incident-list',
  standalone: true,
  imports: [
    CommonModule, AlertComponent,
    RouterModule, FormsModule,DatePickerComponent,
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

// Dans incident-list.component.ts - Ajoutez ces propriétés

// Pour l'archivage
incidentToArchive: Incident | null = null;
showArchiveModal: boolean = false;
archiving: boolean = false;

// Pour afficher les archives
showArchives = false;
archivedIncidents: Incident[] = [];
archivedTotalCount = 0;
archivedCurrentPage = 1;
archivedTotalPages = 1;
loadingArchives = false;

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
private entiteImpacteeService: EntiteImpacteeService,  // ← Ajoutez ceci
    private router: Router
  ) {}
 loadDashboardStats(): void {
    this.loadingDashboard = true;
    
    this.incidentService.getIncidentDashboard().subscribe({
      next: (response) => {
        if (response) {
          this.dashboardStats = response;
          console.log('Dashboard stats chargées:', this.dashboardStats);
        }
        this.loadingDashboard = false;
      },
      error: (err) => {
        console.error('Erreur chargement dashboard stats:', err);
        this.loadingDashboard = false;
      }
    });
  }
  // Dans incident-list.component.ts

/**
 * Ouvre la modale de confirmation d'archivage
 */
onArchive(incident: Incident): void {
  console.log('📦 Archivage de l\'incident:', incident.codeIncident);
  this.incidentToArchive = incident;
  this.showArchiveModal = true;
}

/**
 * Annule l'archivage
 */
cancelArchive(): void {
  this.showArchiveModal = false;
  this.incidentToArchive = null;
  this.archiving = false;
}

confirmArchive(): void {
  if (!this.incidentToArchive) return;
  
  this.archiving = true;
  
  // Sauvegarder l'ID avant l'archivage
  const incidentId = this.incidentToArchive.id;
  const isFerme = this.getStatutNumber(this.incidentToArchive.statutIncident) === StatutIncident.Ferme;
  
  this.incidentService.archiverIncident(incidentId).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        this.showAlert('success', 'Succès', `L'incident "${this.incidentToArchive!.codeIncident}" a été archivé.`);
        
        // Retirer l'incident de la liste actuelle
        const index = this.filteredIncidents.findIndex(i => i.id === incidentId);
        if (index !== -1) {
          this.filteredIncidents.splice(index, 1);
          this.incidents.splice(index, 1);
          this.totalCount--;
          this.totalPages = Math.ceil(this.totalCount / this.pageSize);
        }
        
        // Désélectionner et mettre à jour les stats
        if (this.selectedIncidents.has(incidentId)) {
          this.selectedIncidents.delete(incidentId);
          if (isFerme) {
            this.cachedSelectionStats.archivable--;
          } else {
            this.cachedSelectionStats.deletable--;
          }
          this.cachedSelectionStats.total--;
        }
        
        // Si plus d'éléments sélectionnés, réinitialiser le type global
        if (this.selectedIncidents.size === 0) {
          this.currentSelectionType = null;
          this.cachedSelectionStats = { deletable: 0, archivable: 0, other: 0, total: 0 };
        }
      } else {
        this.showAlert('error', 'Erreur', response.message || 'Impossible d\'archiver l\'incident.');
      }
      this.cancelArchive();
    },
    error: (err) => {
      console.error('❌ Erreur archivage:', err);
      const errorMessage = err.error?.message || err.message || 'Erreur lors de l\'archivage';
      this.showAlert('error', 'Erreur', errorMessage);
      this.cancelArchive();
    }
  });
}

/**
 * Restaure un incident archivé
 */
restaurerIncident(incident: Incident): void {
  if (!confirm(`Voulez-vous restaurer l'incident "${incident.codeIncident}" ?`)) return;
  
  this.incidentService.restaurerIncident(incident.id).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        this.showAlert('success', 'Succès', `L'incident "${incident.codeIncident}" a été restauré.`);
        
        // Retirer de la liste des archives
        const index = this.archivedIncidents.findIndex(i => i.id === incident.id);
        if (index !== -1) {
          this.archivedIncidents.splice(index, 1);
          this.archivedTotalCount--;
          this.archivedTotalPages = Math.ceil(this.archivedTotalCount / this.pageSize);
        }
      } else {
        this.showAlert('error', 'Erreur', response.message || 'Impossible de restaurer l\'incident.');
      }
    },
    error: (err) => {
      console.error('❌ Erreur restauration:', err);
      this.showAlert('error', 'Erreur', err.error?.message || 'Erreur lors de la restauration');
    }
  });
}

/**
 * Charge les incidents archivés
 */
loadArchivedIncidents(): void {
  this.loadingArchives = true;
  
  const params = {
    Page: this.archivedCurrentPage,
    PageSize: this.pageSize,
    SortBy: 'DateArchivage',
    SortDescending: true
  };
  
  this.incidentService.getIncidentsArchives(params).subscribe({
    next: (response: any) => {
      let incidentsList: Incident[] = [];
      let total = 0;
      
      if (response?.items && Array.isArray(response.items)) {
        incidentsList = response.items;
        total = response.totalCount || incidentsList.length;
      } else if (response?.data?.items && Array.isArray(response.data.items)) {
        incidentsList = response.data.items;
        total = response.data.totalCount || incidentsList.length;
      } else if (Array.isArray(response)) {
        incidentsList = response;
        total = incidentsList.length;
      }
      
      this.archivedIncidents = incidentsList;
      this.archivedTotalCount = total;
      this.archivedTotalPages = Math.ceil(total / this.pageSize);
      this.loadingArchives = false;
    },
    error: (err) => {
      console.error('❌ Erreur chargement archives:', err);
      this.showAlert('error', 'Erreur', 'Impossible de charger les incidents archivés');
      this.loadingArchives = false;
      this.archivedIncidents = [];
    }
  });
}

/**
 * Bascule entre la vue des incidents actifs et des archives
 */
toggleArchives(show: boolean): void {
  this.showArchives = show;
  if (show) {
    this.loadArchivedIncidents();
  }
}
  openCalendar(): void {
  const dateInput = document.getElementById('incidentDate') as HTMLInputElement;
  if (dateInput) {
    dateInput.showPicker(); // Fonctionne dans les navigateurs modernes
  }
}
  get incidentDate(): Date | null {
    return this.tempFilters.dateDetection ? new Date(this.tempFilters.dateDetection) : null;
  }
ngOnInit(): void {
  this.generateYearOptions();

  this.userService.getMyProfile().subscribe({
    next: (user) => {
      this.userRole = user.role;
      console.log('Rôle utilisateur:', this.userRole);
      
      if (user.role === 'Admin') {
        this.loadIncidents();
             this.loadDashboardStats(); 
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

  const searchParams: any = {
    Page: this.currentPage,
    PageSize: this.pageSize,
    SearchTerm: this.searchTerm || '',
    SortBy: 'DateDetection',
    SortDescending: true
  };

  if (this.selectedSeverite != null) {
    searchParams.SeveriteIncident = this.selectedSeverite;
  }

 if (this.selectedStatut != null) {
    let statutLibelle = '';
    switch(this.selectedStatut) {
      case StatutIncident.NonTraite:
        statutLibelle = 'Non traité';
        break;
      case StatutIncident.EnCours:
        statutLibelle = 'En cours';
        break;
      case StatutIncident.Ferme:
        statutLibelle = 'Fermé';
        break;
      default:
        statutLibelle = '';
    }
    if (statutLibelle) {
      searchParams.StatutLibelle = statutLibelle;
    }
  }

  // ✅ Ajout des filtres par date
  if (this.selectedDateDetection) {
    searchParams.DateDetection = this.selectedDateDetection;
  }

  if (this.selectedDateResolution) {
    searchParams.DateResolution = this.selectedDateResolution;
  }
  if (this.selectedTypeProbleme != null) {
    searchParams.TypeProbleme = this.selectedTypeProbleme;
  }

  // ✅ NOUVEAU : Filtre par entité impactée (pour Commercant)
  if (this.selectedEntiteImpactee != null) {
    searchParams.EntiteImpactee = this.selectedEntiteImpactee;
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
// Ajoutez cette propriété dans la classe
today: string = new Date().toISOString().split('T')[0];

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

// Dans incident-list.component.ts, ajoutez cette méthode

// Dans incident-list.component.ts, ajoutez cette méthode

// Mapping pour les types d'entité impactée
getEntiteImpacteeLabel(incident: any): string {
  // Si l'incident a la propriété entiteImpactee directement
  if (incident.entiteImpactee) {
    return incident.entiteImpactee;
  }
  
  // Si l'incident a la propriété typeEntiteImpactee (depuis le backend)
  if (incident.typeEntiteImpactee) {
    return this.formatEntiteImpactee(incident.typeEntiteImpactee);
  }
  
  // Si l'incident a la liste des entités impactées
  if (incident.entitesImpactees && incident.entitesImpactees.length > 0) {
    const types = incident.entitesImpactees.map((e: any) => 
      this.formatEntiteImpactee(e.typeEntiteImpactee)
    ).join(', ');
    return types;
  }
  
  // Valeur par défaut
  return 'Non spécifiée';
}
dashboardStats = {
    overview: {
      totalIncidents: 0,
      incidentsNonTraite: 0,
      incidentsEnCours: 0,
      incidentsFerme: 0,
      tauxNonTraite: 0,
      tauxEnCours: 0,
      tauxFerme: 0
    },
    statsParStatut: [] as { statut: string; count: number; color: string; pourcentage: number }[],
    statsParJour: [] as any[],
    statsParSemaine: [] as any[],
    statsParMois: [] as any[]
  };
  
  loadingDashboard = false;
// Formater le libellé de l'entité impactée
private formatEntiteImpactee(type: string): string {
  const mapping: { [key: string]: string } = {
    'MachineTPE': 'Machine TPE',
    'FluxTransactionnel': 'Flux transactionnel',
    'Reseau': 'Réseau',
    'ServiceApplicatif': 'Service applicatif'
  };
  
  return mapping[type] || type;
}
getTypeProblemeLibelle(typeProbleme: any): string {
  if (typeProbleme === undefined || typeProbleme === null) return 'Non spécifié';
  
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
      default: return 'Non spécifié';
    }
  }
  
  // Si c'est une string
  if (typeof typeProbleme === 'string') {
    return typeProbleme;
  }
  
  return 'Non spécifié';
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
  
  // ✅ LOG pour déboguer - Afficher les valeurs avant l'envoi
  console.log('🔍 DEBUG - selectedStatut:', this.selectedStatut);
  console.log('🔍 DEBUG - selectedDateDetection:', this.selectedDateDetection);
  console.log('🔍 DEBUG - selectedDateResolution:', this.selectedDateResolution);
  console.log('🔍 DEBUG - selectedYear:', this.selectedYear);
  
  // Convertir le statut en string pour l'API
  if (this.selectedStatut != null) {
    let statutString = '';
    switch(this.selectedStatut) {
      case StatutIncident.NonTraite:
        statutString = 'NonTraite';
        break;
      case StatutIncident.EnCours:
        statutString = 'EnCours';
        break;
      case StatutIncident.Ferme:
        statutString = 'Ferme';
        break;
    }
    if (statutString) {
      searchParams.StatutIncident = statutString;
      console.log('🔍 DEBUG - Statut converti:', statutString);
    }
  }
  
  // ✅ Vérifier que les dates sont bien ajoutées
  if (this.selectedDateDetection && this.selectedDateDetection.trim() !== '') {
    searchParams.DateDetection = this.selectedDateDetection;
    console.log('🔍 DEBUG - DateDetection ajoutée:', this.selectedDateDetection);
  } else {
    console.log('🔍 DEBUG - Aucune DateDetection à envoyer');
  }
  if (this.selectedTypeProbleme != null) {
    searchParams.TypeProbleme = this.selectedTypeProbleme;
    console.log('🔍 TypeProbleme sélectionné:', this.selectedTypeProbleme);
  }

  if (this.selectedDateResolution && this.selectedDateResolution.trim() !== '') {
    searchParams.DateResolution = this.selectedDateResolution;
    console.log('🔍 DEBUG - DateResolution ajoutée:', this.selectedDateResolution);
  } else {
    console.log('🔍 DEBUG - Aucune DateResolution à envoyer');
  }
  
  if (this.selectedYear) {
    searchParams.YearDetection = Number(this.selectedYear);
    console.log('🔍 DEBUG - YearDetection ajoutée:', this.selectedYear);
  }
  
  console.log('🔍 Envoi requête my-incidents avec params FINAUX:', searchParams);
    this.incidentService.searchMyIncidents(searchParams).subscribe({
      next: (response: any) => {
        let incidentsList: Incident[] = [];
        let total = 0;
        
        if (response?.items && Array.isArray(response.items)) {
          incidentsList = response.items;
          total = response.totalCount || incidentsList.length;
        } else if (response?.data?.items && Array.isArray(response.data.items)) {
          incidentsList = response.data.items;
          total = response.data.totalCount || incidentsList.length;
        } else if (Array.isArray(response)) {
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
    console.log('🎯 Filtres appliqués - Sévérité:', this.tempFilters.severite,
       'Statut:', this.tempFilters.statut,
        'TypeProbleme:', this.tempFilters.typeProbleme,
              'EntiteImpactee:', this.tempFilters.entiteImpactee);
    
    this.selectedSeverite = this.tempFilters.severite;
    this.selectedStatut = this.tempFilters.statut;
      this.selectedTypeProbleme = this.tempFilters.typeProbleme;
  this.selectedEntiteImpactee = this.tempFilters.entiteImpactee;
    this.selectedDateDetection = this.tempFilters.dateDetection;
    this.selectedDateResolution = this.tempFilters.dateResolution;
    
    // ✅ Mettre à jour les objets Date pour le DatePicker
    if (this.selectedDateDetection) {
      const parts = this.selectedDateDetection.split('-');
      this.selectedDetectionDateObj = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2])
      );
    } else {
      this.selectedDetectionDateObj = null;
    }
    
    if (this.selectedDateResolution) {
      const parts = this.selectedDateResolution.split('-');
      this.selectedResolutionDateObj = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2])
      );
    } else {
      this.selectedResolutionDateObj = null;
    }
    
    this.currentPage = 1;
    
    if (this.userRole === 'Admin') {
      this.loadIncidents();
    } else {
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
    setTimeout(() => (this.alert.show = false), 5000);
  }


  globalSelectionMode: boolean = false;  // Mode sélection globale activé
  pendingDeleteIds: string[] = [];
  pendingArchiveIds: string[] = [];
  pendingDeleteCount: number = 0;
  pendingArchiveCount: number = 0;
  showMultiArchiveModal: boolean = false;  // Pour la modale d'archivage multiple
  confirmArchives: any[] = [];  // Incidents à archiver en masse
  bulkArchiving: boolean = false;
  // Navigation
  viewIncidentDetails(id: string): void {
    this.router.navigate(['/incidents', id]);
  }
getSeveriteBadgeClasses(severite: any): string {
  // Cas où la sévérité est 0, null ou undefined
  if (severite === 0 || severite === null || severite === undefined) {
    return 'bg-[#C5C6FF] text-[#0C144E]';  // Digital Blue 48%
  }
  
  let severiteValue: number;
  
  if (typeof severite === 'string') {
    switch(severite) {
      case 'Non définie':
        return 'bg-[#C5C6FF] text-[#0C144E]';
      case 'Faible':
        severiteValue = 1;
        break;
      case 'Moyenne':
        severiteValue = 2;
        break;
      case 'Forte':
        severiteValue = 3;
        break;
      default:
        severiteValue = 0;
    }
  } else {
    severiteValue = severite;
  }
  
  switch(severiteValue) {
    case 1: // Faible
      return 'bg-[#B2B3FF] text-[#0C144E]';  // Digital Blue 64%
    case 2: // Moyenne
      return 'bg-[#8788FF] text-white';       // Digital Purple
    case 3: // Forte
      return 'bg-[#D4B8FF] text-[#0C144E]';   // Rose Mauve
    default:
      return 'bg-[#C5C6FF] text-[#0C144E]';   // Digital Blue 48%
  }
}
getStatutBadgeClasses(statut: any): string {
  // Convertir en nombre si c'est une string
  let statutValue: number;
  
  if (typeof statut === 'string') {
    const statutClean = statut.trim().toLowerCase();
    switch(statutClean) {
      case 'non traité':
      case 'nontraite':
      case 'non_traite':
        statutValue = 0;
        break;
      case 'en cours':
      case 'encours':
        statutValue = 1;
        break;
      case 'fermé':
      case 'ferme':
      case 'résolu':
      case 'resolu':
        statutValue = 2;
        break;
      default:
        statutValue = 0;
    }
  } else {
    statutValue = statut;
  }
  
  switch(statutValue) {
    case 0: // Non traité
      return 'bg-[#C5C6FF] text-[#0C144E]';   // Digital Blue 48%
    case 1: // En cours
      return 'bg-[#8788FF] text-white';        // Digital Purple
    case 2: // Fermé
      return 'bg-[#D4B8FF] text-[#0C144E]';   // Digital Blue 64%
    default:
      return 'bg-[#D4B8FF] text-[#0C144E]';
  }
}
// Ajoutez ces propriétés avec les autres
selectedIncidents: Set<string> = new Set<string>();  // IDs des incidents sélectionnés
showMultiDeleteModal = false;  // Pour la modale de suppression multiple
confirmIncidents: Incident[] = [];  // Incidents à supprimer en masse
bulkDeleting = false;  // État de suppression en cours
  // Désélectionner tous
  deselectAll(): void {
    const totalSelected = this.globalSelectionMode ? this.totalCount : this.selectedIncidents.size;
    this.selectedIncidents.clear();
    this.globalSelectionMode = false;
  this.cachedSelectionStats = { deletable: 0, archivable: 0, other: 0, total: 0 };
  this.currentSelectionType = null
  }

toggleSelection(incidentId: string, checked: boolean): void {
  const incident = this.filteredIncidents.find(i => i.id === incidentId);
  if (!incident) return;

  const incidentStatut = this.getStatutNumber(incident.statutIncident);
  const isFerme = incidentStatut === StatutIncident.Ferme;
  const isNonFerme = incidentStatut === StatutIncident.NonTraite || incidentStatut === StatutIncident.EnCours;

  if (checked) {
    // Si c'est le premier élément sélectionné, définir le type global
    if (this.selectedIncidents.size === 0 && !this.globalSelectionMode) {
      this.selectedIncidents.add(incidentId);
      // Définir le type global
      if (isFerme) {
        this.currentSelectionType = 'ferme';
      } else if (isNonFerme) {
        this.currentSelectionType = 'nonFerme';
      }
      // Mettre à jour les stats en cache
      if (isFerme) {
        this.cachedSelectionStats = { ...this.cachedSelectionStats, archivable: this.cachedSelectionStats.archivable + 1, total: this.cachedSelectionStats.total + 1 };
      } else if (isNonFerme) {
        this.cachedSelectionStats = { ...this.cachedSelectionStats, deletable: this.cachedSelectionStats.deletable + 1, total: this.cachedSelectionStats.total + 1 };
      }
      return;
    }

    // Vérifier la compatibilité avec le type global
    if (this.currentSelectionType === 'ferme' && !isFerme) {
      this.showAlert('warning', 'Sélection impossible', 
        'Vous avez déjà sélectionné des incidents fermés. Vous ne pouvez sélectionner que des incidents fermés.');
      return;
    }
    
    if (this.currentSelectionType === 'nonFerme' && !isNonFerme) {
      this.showAlert('warning', 'Sélection impossible', 
        'Vous avez déjà sélectionné des incidents à traiter (Non traités ou En cours). Vous ne pouvez sélectionner que des incidents du même type.');
      return;
    }

    this.selectedIncidents.add(incidentId);
    // Mettre à jour les stats en cache
    if (isFerme) {
      this.cachedSelectionStats.archivable++;
    } else if (isNonFerme) {
      this.cachedSelectionStats.deletable++;
    } else {
      this.cachedSelectionStats.other++;
    }
    this.cachedSelectionStats.total++;
    
    // Si c'était le mode global, désactiver
    if (this.globalSelectionMode) {
      this.globalSelectionMode = false;
    }
  } else {
    this.selectedIncidents.delete(incidentId);
    if (this.globalSelectionMode) this.globalSelectionMode = false;
    
    // Mettre à jour les stats en cache
    if (isFerme) {
      this.cachedSelectionStats.archivable--;
    } else if (isNonFerme) {
      this.cachedSelectionStats.deletable--;
    } else {
      this.cachedSelectionStats.other--;
    }
    this.cachedSelectionStats.total--;
    
    // Si plus d'éléments sélectionnés, réinitialiser le type global
    if (this.selectedIncidents.size === 0) {
      this.currentSelectionType = null;
    }
  }
}

// Ajoutez cette propriété avec les autres
cachedSelectionStats = { deletable: 0, archivable: 0, other: 0, total: 0 };
private getCurrentSelectionType(): 'ferme' | 'nonFerme' | null {
  if (this.selectedIncidents.size === 0) return null;
  
  let hasFerme = false;
  let hasNonFerme = false;
  
  for (const id of this.selectedIncidents) {
    const incident = this.filteredIncidents.find(i => i.id === id);
    if (incident) {
      const statut = this.getStatutNumber(incident.statutIncident);
      if (statut === StatutIncident.Ferme) {
        hasFerme = true;
      } else if (statut === StatutIncident.NonTraite || statut === StatutIncident.EnCours) {
        hasNonFerme = true;
      }
    }
  }
  
  if (hasFerme && !hasNonFerme) return 'ferme';
  if (hasNonFerme && !hasFerme) return 'nonFerme';
  return null; // Mixte ou vide
}

// Modifiez toggleAllSelection pour respecter la logique
toggleAllSelection(checked: boolean): void {
  if (checked) {
    // Vérifier si tous les incidents ont le même type avant de tout sélectionner
    const hasFerme = this.filteredIncidents.some(i => this.getStatutNumber(i.statutIncident) === StatutIncident.Ferme);
    const hasNonFerme = this.filteredIncidents.some(i => {
      const statut = this.getStatutNumber(i.statutIncident);
      return statut === StatutIncident.NonTraite || statut === StatutIncident.EnCours;
    });
    
    if (hasFerme && hasNonFerme) {
      this.showAlert('warning', 'Sélection impossible', 
        'Cette page contient des incidents de types différents (fermés et non fermés). Veuillez filtrer pour sélectionner tous les incidents.');
      return;
    }
    
    this.selectAllIncidentsAcrossPages();
  } else {
    this.globalSelectionMode = false;
    this.selectedIncidents.clear();
  }
}

// Modifiez selectAllIncidentsAcrossPages pour filtrer par type si nécessaire
selectAllIncidentsAcrossPages(): void {
  this.loading = true;
  
  const params: any = {
    Page: 1,
    PageSize: this.totalCount,
    SearchTerm: this.searchTerm || '',
    SortBy: 'DateDetection',
    SortDescending: true
  };
  
  if (this.selectedSeverite != null) params.SeveriteIncident = this.selectedSeverite;
  
  // Utiliser le type global existant ou déterminer le type
  let typeToSelect = this.currentSelectionType;
  
  if (typeToSelect === 'ferme') {
    params.StatutLibelle = 'Fermé';
  } else if (typeToSelect === 'nonFerme') {
    // Ne pas filtrer par statut, on va filtrer manuellement après
  } else {
    // Pas de type défini, vérifier les incidents de la page
    const hasFerme = this.filteredIncidents.some(i => this.getStatutNumber(i.statutIncident) === StatutIncident.Ferme);
    const hasNonFerme = this.filteredIncidents.some(i => {
      const statut = this.getStatutNumber(i.statutIncident);
      return statut === StatutIncident.NonTraite || statut === StatutIncident.EnCours;
    });
    
    if (hasFerme && hasNonFerme) {
      this.showAlert('warning', 'Sélection impossible', 
        'Cette page contient des incidents de types différents. Veuillez filtrer pour sélectionner tous les incidents.');
      this.loading = false;
      return;
    }
    
    if (hasFerme) {
      typeToSelect = 'ferme';
    } else if (hasNonFerme) {
      typeToSelect = 'nonFerme';
    }
  }
  
  if (this.selectedDateDetection) params.DateDetection = this.selectedDateDetection;
  if (this.selectedDateResolution) params.DateResolution = this.selectedDateResolution;
  
  this.incidentService.searchIncidents(params).subscribe({
    next: (response: any) => {
      let allIncidents: any[] = [];
      if (response?.data?.items) allIncidents = response.data.items;
      else if (response?.items) allIncidents = response.items;
      else if (Array.isArray(response)) allIncidents = response;
      
      // Filtrer selon le type
      if (typeToSelect === 'ferme') {
        allIncidents = allIncidents.filter(i => this.getStatutNumber(i.statutIncident) === StatutIncident.Ferme);
        this.currentSelectionType = 'ferme';
      } else if (typeToSelect === 'nonFerme') {
        allIncidents = allIncidents.filter(i => {
          const statut = this.getStatutNumber(i.statutIncident);
          return statut === StatutIncident.NonTraite || statut === StatutIncident.EnCours;
        });
        this.currentSelectionType = 'nonFerme';
      }
      
      this.selectedIncidents.clear();
      this.cachedSelectionStats = { deletable: 0, archivable: 0, other: 0, total: 0 };
      
      allIncidents.forEach(incident => {
        this.selectedIncidents.add(incident.id);
        const statut = this.getStatutNumber(incident.statutIncident);
        if (statut === StatutIncident.Ferme) {
          this.cachedSelectionStats.archivable++;
        } else if (statut === StatutIncident.NonTraite || statut === StatutIncident.EnCours) {
          this.cachedSelectionStats.deletable++;
        } else {
          this.cachedSelectionStats.other++;
        }
        this.cachedSelectionStats.total++;
      });
      
      this.globalSelectionMode = true;
      this.loading = false;
      this.showAlert('success', 'Succès', `${this.selectedIncidents.size} incident(s) sélectionné(s) (toutes pages).`);
    },
    error: (err) => {
      console.error('Erreur sélection tous les incidents:', err);
      this.loading = false;
      this.showAlert('error', 'Erreur', 'Impossible de sélectionner tous les incidents');
    }
  });
}
currentSelectionType: 'ferme' | 'nonFerme' | null = null;

canSelectIncident(incident: any): boolean {
  // Si aucune sélection existante, tout est sélectionnable
  if (this.selectedIncidents.size === 0 && !this.globalSelectionMode && this.currentSelectionType === null) {
    return true;
  }
  
  const incidentStatut = this.getStatutNumber(incident.statutIncident);
  const isFerme = incidentStatut === StatutIncident.Ferme;
  
  // Utiliser le type global stocké
  if (this.currentSelectionType === 'ferme' && !isFerme) return false;
  if (this.currentSelectionType === 'nonFerme' && isFerme) return false;
  
  return true;
}
  // Vérifier si un incident est sélectionné
  isSelected(incidentId: string): boolean {
    if (this.globalSelectionMode) return true;
    return this.selectedIncidents.has(incidentId);
  }

  // Vérifier si tous les incidents sont sélectionnés
  isAllSelected(): boolean {
    return this.globalSelectionMode || (this.filteredIncidents.length > 0 && 
           this.selectedIncidents.size === this.filteredIncidents.length);
  }

  // Vérifier si la sélection est partielle
  isIndeterminate(): boolean {
    if (this.globalSelectionMode) return false;
    return this.selectedIncidents.size > 0 && 
           this.selectedIncidents.size < this.filteredIncidents.length;
  }


  getSelectionStats(): { deletable: number, archivable: number, other: number } {
    let deletable = 0;  // Non traités ou En cours
    let archivable = 0; // Fermés
    let other = 0;
    
    const selectedIds = Array.from(this.selectedIncidents);
    
    selectedIds.forEach(id => {
      const incident = this.filteredIncidents.find(i => i.id === id);
      if (incident) {
        const statutValue = typeof incident.statutIncident === 'number' 
          ? incident.statutIncident 
          : this.getStatutNumber(incident.statutIncident);
        
        if (statutValue === StatutIncident.Ferme) {
          archivable++;
        } else if (statutValue === StatutIncident.NonTraite || statutValue === StatutIncident.EnCours) {
          deletable++;
        } else {
          other++;
        }
      }
    });
    
    return { deletable, archivable, other };
  }

  // Helper pour convertir le statut en nombre
  private getStatutNumber(statut: any): number {
    if (typeof statut === 'number') return statut;
    if (typeof statut === 'string') {
      const s = statut.toLowerCase();
      if (s.includes('fermé') || s.includes('ferme') || s.includes('resolu')) return StatutIncident.Ferme;
      if (s.includes('cours')) return StatutIncident.EnCours;
    }
    return StatutIncident.NonTraite;
  }

  // Action principale du bouton (Supprimer ou Archiver selon la sélection)
  onBulkAction(): void {
    const stats = this.getSelectionStats();
    
    if (stats.archivable > 0 && stats.deletable === 0) {
      // Uniquement des incidents fermés → Archiver
      this.confirmArchiveMultiple();
    } else if (stats.deletable > 0 && stats.archivable === 0) {
      // Uniquement des incidents non fermés → Supprimer
      this.confirmDeleteMultiple();
    } else if (stats.deletable > 0 && stats.archivable > 0) {
      // Mixte → Afficher un message d'erreur
      this.showAlert('warning', 'Action impossible', 
        `Vous ne pouvez pas mélanger des incidents à supprimer (${stats.deletable}) et à archiver (${stats.archivable}) dans la même sélection.`);
    } else {
      this.showAlert('info', 'Aucune action', 'Aucun incident sélectionné ne peut être supprimé ou archivé.');
    }
  }
confirmDeleteMultiple(): void {
  if (this.selectedIncidents.size === 0) return;
  
  const selectedIds = Array.from(this.selectedIncidents);
  
  // Afficher un indicateur de chargement
  this.loading = true;
  
  // Récupérer TOUS les incidents sélectionnés via l'API
  const params: any = {
    Page: 1,
    PageSize: this.totalCount, // Récupérer TOUS
    SearchTerm: this.searchTerm || '',
    SortBy: 'DateDetection',
    SortDescending: true
  };
  
  // Ajouter les filtres actuels pour correspondre à la sélection globale
  if (this.selectedSeverite != null) params.SeveriteIncident = this.selectedSeverite;
  if (this.selectedStatut != null) {
    let statutLibelle = '';
    switch(this.selectedStatut) {
      case StatutIncident.NonTraite: statutLibelle = 'Non traité'; break;
      case StatutIncident.EnCours: statutLibelle = 'En cours'; break;
      case StatutIncident.Ferme: statutLibelle = 'Fermé'; break;
    }
    if (statutLibelle) params.StatutLibelle = statutLibelle;
  }
  if (this.selectedDateDetection) params.DateDetection = this.selectedDateDetection;
  if (this.selectedDateResolution) params.DateResolution = this.selectedDateResolution;
  
  this.incidentService.searchIncidents(params).subscribe({
    next: (response: any) => {
      let allIncidents: any[] = [];
      if (response?.data?.items) allIncidents = response.data.items;
      else if (response?.items) allIncidents = response.items;
      else if (Array.isArray(response)) allIncidents = response;
      
      // Filtrer pour ne garder que les incidents non fermés qui sont sélectionnés
      this.confirmIncidents = allIncidents.filter(incident => {
        const statutValue = this.getStatutNumber(incident.statutIncident);
        return selectedIds.includes(incident.id) && statutValue !== StatutIncident.Ferme;
      });
      
      this.pendingDeleteIds = this.confirmIncidents.map(i => i.id);
      this.pendingDeleteCount = this.confirmIncidents.length;
      this.showMultiDeleteModal = true;
      this.loading = false;
    },
    error: (err) => {
      console.error('Erreur chargement incidents pour suppression:', err);
      this.loading = false;
      // Fallback: utiliser les incidents de la page courante
      this.confirmIncidents = this.filteredIncidents.filter(incident => {
        const statutValue = this.getStatutNumber(incident.statutIncident);
        return selectedIds.includes(incident.id) && statutValue !== StatutIncident.Ferme;
      });
      this.pendingDeleteIds = this.confirmIncidents.map(i => i.id);
      this.pendingDeleteCount = this.confirmIncidents.length;
      this.showMultiDeleteModal = true;
    }
  });
}

confirmArchiveMultiple(): void {
  if (this.selectedIncidents.size === 0) return;
  
  const selectedIds = Array.from(this.selectedIncidents);
  
  // Afficher un indicateur de chargement
  this.loading = true;
  
  // ✅ Utiliser la bonne API selon le rôle
  const searchMethod = this.userRole === 'Admin' 
    ? this.incidentService.searchIncidents.bind(this.incidentService)
    : this.incidentService.searchMyIncidents.bind(this.incidentService);
  
  const params: any = {
    Page: 1,
    PageSize: this.totalCount,
    SearchTerm: this.searchTerm || '',
    SortBy: 'DateDetection',
    SortDescending: true
  };
  
  if (this.selectedSeverite != null) params.SeveriteIncident = this.selectedSeverite;
  if (this.selectedStatut != null) {
    let statutLibelle = '';
    switch(this.selectedStatut) {
      case StatutIncident.NonTraite: statutLibelle = 'Non traité'; break;
      case StatutIncident.EnCours: statutLibelle = 'En cours'; break;
      case StatutIncident.Ferme: statutLibelle = 'Fermé'; break;
    }
    if (statutLibelle) params.StatutLibelle = statutLibelle;
  }
  if (this.selectedDateDetection) params.DateDetection = this.selectedDateDetection;
  if (this.selectedDateResolution) params.DateResolution = this.selectedDateResolution;
  
  // Pour le commerçant, ajouter le filtre de statut en string
  if (this.userRole !== 'Admin' && this.selectedStatut != null) {
    let statutString = '';
    switch(this.selectedStatut) {
      case StatutIncident.NonTraite: statutString = 'NonTraite'; break;
      case StatutIncident.EnCours: statutString = 'EnCours'; break;
      case StatutIncident.Ferme: statutString = 'Ferme'; break;
    }
    if (statutString) params.StatutIncident = statutString;
  }
  
  searchMethod(params).subscribe({
    next: (response: any) => {
      let allIncidents: any[] = [];
      if (response?.data?.items) allIncidents = response.data.items;
      else if (response?.items) allIncidents = response.items;
      else if (Array.isArray(response)) allIncidents = response;
      
      // Filtrer pour ne garder que les incidents fermés qui sont sélectionnés
      this.confirmArchives = allIncidents.filter(incident => {
        const statutValue = this.getStatutNumber(incident.statutIncident);
        return selectedIds.includes(incident.id) && statutValue === StatutIncident.Ferme;
      });
      
      this.pendingArchiveIds = this.confirmArchives.map(i => i.id);
      this.pendingArchiveCount = this.confirmArchives.length;
      this.showMultiArchiveModal = true;
      this.loading = false;
    },
    error: (err) => {
      console.error('Erreur chargement incidents pour archivage:', err);
      this.loading = false;
      // Fallback: utiliser les incidents de la page courante
      this.confirmArchives = this.filteredIncidents.filter(incident => {
        const statutValue = this.getStatutNumber(incident.statutIncident);
        return selectedIds.includes(incident.id) && statutValue === StatutIncident.Ferme;
      });
      this.pendingArchiveIds = this.confirmArchives.map(i => i.id);
      this.pendingArchiveCount = this.confirmArchives.length;
      this.showMultiArchiveModal = true;
    }
  });
}

executeMultiArchive(): void {
  if (this.pendingArchiveIds.length === 0) return;
  
  this.bulkArchiving = true;
  let completed = 0;
  const total = this.pendingArchiveIds.length;
  let successCount = 0;
  
  this.pendingArchiveIds.forEach(id => {
    this.incidentService.archiverIncident(id).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          const index = this.filteredIncidents.findIndex(i => i.id === id);
          if (index !== -1) this.filteredIncidents.splice(index, 1);
          this.selectedIncidents.delete(id);
          
          // ✅ Décrémenter les stats en cache
          this.cachedSelectionStats.archivable--;
          this.cachedSelectionStats.total--;
          
          successCount++;
        }
        completed++;
        
        if (completed === total) {
          this.bulkArchiving = false;
          this.showMultiArchiveModal = false;
          this.pendingArchiveIds = [];
          this.confirmArchives = [];
          
          // ✅ Mettre à jour totalCount et totalPages
          this.totalCount = this.filteredIncidents.length;
          this.totalPages = Math.ceil(this.totalCount / this.pageSize);
          
          // ✅ Si plus d'éléments sélectionnés, tout réinitialiser
          if (this.selectedIncidents.size === 0) {
            this.currentSelectionType = null;
            this.cachedSelectionStats = { deletable: 0, archivable: 0, other: 0, total: 0 };
          }
          
          if (successCount === total) {
            this.showAlert('success', 'Succès', `${total} incident(s) archivé(s) avec succès.`);
          } else if (successCount > 0) {
            this.showAlert('warning', 'Archivage partiel', `${successCount} incident(s) archivé(s), ${total - successCount} échec(s).`);
          }
          this.loadIncidents();
        }
      },
      error: (err) => {
        console.error(`Erreur archivage ${id}:`, err);
        completed++;
        if (completed === total) {
          this.bulkArchiving = false;
          this.showMultiArchiveModal = false;
          this.pendingArchiveIds = [];
          this.confirmArchives = [];
          this.showAlert('error', 'Erreur', `${successCount}/${total} incident(s) archivé(s).`);
          this.loadIncidents();
        }
      }
    });
  });
}

clearSelection(): void {
  this.selectedIncidents.clear();
  this.globalSelectionMode = false;
  this.currentSelectionType = null;
  this.cachedSelectionStats = { deletable: 0, archivable: 0, other: 0, total: 0 };
}

cancelMultiDelete(): void {
  this.showMultiDeleteModal = false;
  this.confirmIncidents = [];
  this.bulkDeleting = false;
}

cancelMultiArchive(): void {
  this.showMultiArchiveModal = false;
  this.confirmArchives = [];
  this.pendingArchiveIds = [];
  this.bulkArchiving = false;
}

executeMultiDelete(): void {
  if (this.confirmIncidents.length === 0) return;

  this.bulkDeleting = true;
  let completed = 0;
  const total = this.confirmIncidents.length;
  let successCount = 0;

  this.confirmIncidents.forEach(incident => {
    this.incidentService.deleteIncident(incident.id).subscribe({
      next: () => {
        const index = this.filteredIncidents.findIndex(i => i.id === incident.id);
        if (index !== -1) this.filteredIncidents.splice(index, 1);
        
        const indexAll = this.incidents.findIndex(i => i.id === incident.id);
        if (indexAll !== -1) this.incidents.splice(indexAll, 1);
        
        this.selectedIncidents.delete(incident.id);
        
        // ✅ Décrémenter les stats en cache
        this.cachedSelectionStats.deletable--;
        this.cachedSelectionStats.total--;
        
        successCount++;
        completed++;
        
        if (completed === total) {
          this.bulkDeleting = false;
          this.showMultiDeleteModal = false;
          this.confirmIncidents = [];
          
          this.totalCount = this.filteredIncidents.length;
          this.totalPages = Math.ceil(this.totalCount / this.pageSize);
          if (this.currentPage > this.totalPages && this.totalPages > 0) {
            this.currentPage = this.totalPages;
          }
          
          // ✅ Si plus d'éléments sélectionnés, tout réinitialiser
          if (this.selectedIncidents.size === 0) {
            this.currentSelectionType = null;
            this.cachedSelectionStats = { deletable: 0, archivable: 0, other: 0, total: 0 };
          }
          
          if (successCount === total) {
            this.showAlert('success', 'Succès', `${total} incident(s) supprimé(s) avec succès.`);
          } else if (successCount > 0) {
            this.showAlert('warning', 'Suppression partielle', `${successCount} incident(s) supprimé(s), ${total - successCount} échec(s).`);
          } else {
            this.showAlert('error', 'Échec', `Aucun incident n'a pu être supprimé.`);
          }
          this.loadIncidents();
        }
      },
      error: (err) => {
        console.error(`Erreur suppression ${incident.codeIncident}:`, err);
        completed++;
        if (completed === total) {
          this.bulkDeleting = false;
          this.showMultiDeleteModal = false;
          this.confirmIncidents = [];
          this.showAlert('error', 'Erreur', `${successCount}/${total} incident(s) supprimé(s).`);
          this.loadIncidents();
        }
      }
    });
  });
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
      return 'error';  // Bleu pour "Non traité"
    case StatutIncident.EnCours:
      return 'orange';  // Orange pour "En cours"
    case StatutIncident.Ferme:
      return 'success';  // Vert pour "Fermé"
    default:
      return 'light';
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
typeProblemeOptions = [
  { value: 1, label: 'Paiement refusé' },
  { value: 2, label: 'Terminal hors ligne' },
  { value: 3, label: 'Lenteur' },
  { value: 4, label: 'Bug affichage' },
  { value: 5, label: 'Connexion réseau' },
  { value: 6, label: 'Erreur flux transactionnel' },
  { value: 7, label: 'Problème logiciel TPE' },
  { value: 8, label: 'Autre' }
];

// Options pour le filtre par entité impactée (Admin)
entiteImpacteeOptions = [
  { value: 1, label: 'Machine TPE' },
  { value: 2, label: 'Flux transactionnel' },
  { value: 3, label: 'Réseau' },
  { value: 4, label: 'Service applicatif' }
];
showFilters = false;
tempFilters = {
  severite: undefined as number | undefined,
  statut: undefined as number | undefined,
   typeProbleme: undefined as number | undefined,  // ✅ Ajouté pour Commercant
  entiteImpactee: undefined as number | undefined, // ✅ Ajouté pour Admin
  dateDetection: '' as string,  // ✅ Ajouté
  dateResolution: '' as string  // ✅ Ajouté
};
selectedTypeProbleme?: number;
selectedEntiteImpactee?: number;
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
    if (this.showFilters) {
      // Convertir les strings en Date pour le DatePicker
      if (this.selectedDateDetection) {
        const parts = this.selectedDateDetection.split('-');
        this.selectedDetectionDateObj = new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2])
        );
      } else {
        this.selectedDetectionDateObj = null;
      }
      
      if (this.selectedDateResolution) {
        const parts = this.selectedDateResolution.split('-');
        this.selectedResolutionDateObj = new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2])
        );
      } else {
        this.selectedResolutionDateObj = null;
      }
      
      this.tempFilters = {
        severite: this.selectedSeverite,
        statut: this.selectedStatut,
        dateDetection: this.selectedDateDetection || '',
        dateResolution: this.selectedDateResolution || '',
            typeProbleme: this.selectedTypeProbleme,      // ✅ Ajouté
      entiteImpactee: this.selectedEntiteImpactee  // ✅ Ajouté
      };
    }
  }

  cancelFilters(): void {
    this.showFilters = false;
    this.tempFilters = {
      severite: this.selectedSeverite,
      statut: this.selectedStatut,
      dateDetection: this.selectedDateDetection || '',
      dateResolution: this.selectedDateResolution || '',
        typeProbleme: this.selectedTypeProbleme,      // ✅ Ajouté
    entiteImpactee: this.selectedEntiteImpactee  
    };
  }

 clearFilters(): void {
    this.tempFilters = {
         severite: undefined,
    statut: undefined,
    dateDetection: '',
    dateResolution: '',
    typeProbleme: undefined,
    entiteImpactee: undefined
  };
  this.selectedSeverite = undefined;
  this.selectedStatut = undefined;
  this.selectedTypeProbleme = undefined;
  this.selectedEntiteImpactee = undefined;
    this.selectedDateDetection = '';
    this.selectedDateResolution = '';
    this.selectedDetectionDateObj = null;
    this.selectedResolutionDateObj = null;
    this.searchTerm = '';
    this.currentPage = 1;
    
    if (this.userRole === 'Admin') {
      this.loadIncidents();
    } else {
      this.loadMyIncidentsWithFilters();
    }
    this.showFilters = false;
  }


// Ajoutez ces propriétés pour stocker les dates sélectionnées
selectedDetectionDate: Date | null = null;
selectedResolutionDate: Date | null = null;
todayDate: Date = new Date();


// Remplacer la méthode existante par celle-ci
onDateDetectionChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const dateValue = input.value;
  
  if (dateValue) {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      this.selectedDetectionDateObj = date;
      this.selectedDateDetection = dateValue;
      this.tempFilters.dateDetection = dateValue;
    } else {
      this.selectedDetectionDateObj = null;
      this.selectedDateDetection = '';
      this.tempFilters.dateDetection = '';
    }
  } else {
    this.selectedDetectionDateObj = null;
    this.selectedDateDetection = '';
    this.tempFilters.dateDetection = '';
  }
}

// Corriger aussi la méthode onDateResolutionChange si elle existe
onDateResolutionChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const dateValue = input.value;
  
  if (dateValue) {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      this.selectedResolutionDateObj = date;
      this.selectedDateResolution = dateValue;
      this.tempFilters.dateResolution = dateValue;
    } else {
      this.selectedResolutionDateObj = null;
      this.selectedDateResolution = '';
      this.tempFilters.dateResolution = '';
    }
  } else {
    this.selectedResolutionDateObj = null;
    this.selectedDateResolution = '';
    this.tempFilters.dateResolution = '';
  }
}
selectedDateDetection: string = '';
selectedDateResolution: string = '';
selectedDetectionDateObj: Date | null = null;
selectedResolutionDateObj: Date | null = null;

deleting = false;

}