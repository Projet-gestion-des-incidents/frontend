import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { RouterLink, RouterModule } from "@angular/router";
import { TPEService } from '../../../shared/services/tpe.service';
import { UserService } from '../../../shared/services/user.service';
import { BadgeColor, BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { AvatarTextComponent } from '../../../shared/components/ui/avatar/avatar-text.component';
import { PagedResponse } from '../../../shared/models/PagedResponse.model';
import { CheckboxComponent } from '../../../shared/components/form/input/checkbox.component';
import { DashboardAdminService, TPEDashboardDTO } from '../../../shared/services/dashboard-admin.service';

@Component({
  selector: 'app-tpe-list',
  standalone: true,
  imports: [ButtonComponent,CheckboxComponent, CommonModule, FormsModule, AvatarTextComponent, RouterModule, BadgeComponent, AlertComponent],
  templateUrl: './tpe-list.component.html',
})
export class TpeListComponent implements OnInit {
  tpes: any[] = [];
  userRole: string = '';
  loading = true;
today: string = new Date().toISOString().split('T')[0];
  showCommercantFilters = false;
tempCommercantFilters = {
  modele: '',
  createdAt: ''
};

// Pour la date de création (calendrier)
selectedCreatedAtForCommercant = '';
selectedDetectionDateObj: Date | null = null;
  showDeleteAllModal = false;  // Pour la modale de suppression totale
deleteAllCount = 0;          // Nombre de TPEs à supprimer
deleteAllLoading = false;
  // Pagination
  currentPage = 1;
  pageSize = 6;
  totalPages = 1;
  totalCount = 0;
  // Ajoutez ces propriétés avec les autres déclarations
selectedTPEs: Set<string> = new Set<string>();  // IDs des TPEs sélectionnés
showMultiDeleteModal = false;  // Pour la modale de suppression multiple
confirmTPEs: any[] = [];  // TPEs à supprimer en masse
bulkDeleting = false;  // État de suppression en cours
  // Filtres
  searchTerm = '';
  selectedModele = '';
selectedCommercantId: string | null = null;
  selectedNonAssigne: boolean = false;  // ← NOUVEAU

  commercants: any[] = [];
  
  // Options de modèles
  modeleOptions = [
    { value: '', label: 'Tous les modèles' },
    { value: 'Ingenico', label: 'Ingenico' },
    { value: 'Verifone', label: 'Verifone' },
    { value: 'PAX', label: 'PAX' }
  ];
  
  alert = {
    show: false,
    variant: 'info' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: ''
  };
  
  tpeToDeleteId: string | null = null;
  private searchTimeout: any;

  constructor(
    private tpeService: TPEService,
    private userService: UserService,
    private dashboardAdminService: DashboardAdminService
  ) {}
// Ajoutez cette méthode pour calculer les statistiques par modèle
getModeleStats(modele: string): { nombreTPEs: number; nombreIncidents: number; tauxPanne: number; pourcentage: number } {
  if (!this.tpeDashboard || !this.tpeDashboard.pannesParModele) {
    return { nombreTPEs: 0, nombreIncidents: 0, tauxPanne: 0, pourcentage: 0 };
  }
  
  const data = this.tpeDashboard.pannesParModele.find(m => m.modele === modele);
  const totalTPEs = this.tpeDashboard.overview.totalTPEs;
  
  if (!data) {
    return { nombreTPEs: 0, nombreIncidents: 0, tauxPanne: 0, pourcentage: 0 };
  }
  
  // Calcul du pourcentage par rapport au total des TPEs
  const pourcentage = totalTPEs > 0 ? Math.round((data.nombreTPEs / totalTPEs) * 100) : 0;
  
  return {
    nombreTPEs: data.nombreTPEs,
    nombreIncidents: data.nombreIncidents,
    tauxPanne: data.tauxPanne,
    pourcentage: pourcentage
  };
}

// Ajoutez Math dans le template si nécessaire (dans le constructeur ou au début de la classe)
Math = Math;
  ngOnInit(): void {
    this.userService.getMyProfile().subscribe({
      next: (user) => {
        this.userRole = user.role;
        if (this.userRole === 'Admin') {
          this.loadCommercants();
           this.loadTPEDashboard();
        }
        this.loadTPEs();
      },
      error: (err) => {
        console.error('Erreur récupération profil:', err);
        this.loading = false;
      }
    });
  }
// Dans TpeListComponent, ajoutez :

// Variables pour les filtres temporaires
tempFilters: {
  modele: string;
  commercantId: string | null;  // ← CHANGER de 'string' à 'string | null'
  nonAssigne: boolean;
  createdAt: string;
  updatedAt: string;
} = {
  modele: '',
  commercantId: null,  // ← CHANGER de '' à null
  nonAssigne: false,
  createdAt: '',
  updatedAt: ''
};

showFilters = false;

// Ajoutez ces propriétés
globalSelectionMode: boolean = false;  // Mode sélection globale activé

// Modifier toggleAllSelection
toggleAllSelection(checked: boolean): void {
  if (checked) {
    // Sélectionner TOUS les TPEs de TOUTES les pages
    this.selectAllTPEsAcrossPages();
  } else {
    this.globalSelectionMode = false;
    this.selectedTPEs.clear();
  }
}

// ✅ Optimisation : Sélectionner TOUS les TPEs SANS charger tous les détails
selectAllTPEsAcrossPages(): void {
  // 1. On active le mode global immédiatement (UI réactive)
  this.globalSelectionMode = true;
  
  // 2. On vide la sélection locale car on est en mode global
  this.selectedTPEs.clear();
  
  // 3. Optionnel : Afficher un indicateur de chargement
  this.loading = true;
  
  // 4. On récupère UNIQUEMENT les IDs des TPEs (pas tous les détails)
  //    Via une requête légère qui ne retourne que les IDs
  const params: any = {
    page: 1,
    pageSize: this.totalCount,
    searchTerm: this.searchTerm,
    modele: this.selectedModele || undefined,
    commercantId: this.selectedCommercantId || undefined,
    createdAt: this.selectedCreatedAt || undefined,
    updatedAt: this.selectedUpdatedAt || undefined,
    // ✅ AJOUTER un paramètre pour ne récupérer que les IDs
    onlyIds: true  // Si votre API supporte ce paramètre
  };
  
  this.tpeService.getPagedTPEs(params).subscribe({
    next: (response) => {
      const allTPEs = response.data;
      // On ne stocke que les IDs (pas tous les objets)
      this.selectedTPEs.clear();
      allTPEs.forEach(tpe => {
        this.selectedTPEs.add(tpe.id);
      });
      this.loading = false;
    },
    error: (err) => {
      console.error('Erreur sélection tous les TPEs:', err);
      this.loading = false;
      // Fallback: mode global sans IDs (toujours utilisable)
      // this.selectedTPEs reste vide, mais globalSelectionMode = true
    }
  });
}
// Vérifier si un TPE est sélectionné (pour l'affichage du checkmark)
isSelected(tpeId: string): boolean {
  // En mode global, tout est sélectionné
  if (this.globalSelectionMode) return true;
  return this.selectedTPEs.has(tpeId);
}

// Vérifier si tous les TPEs sont sélectionnés
isAllSelected(): boolean {
  return this.globalSelectionMode || (this.tpes.length > 0 && this.selectedTPEs.size === this.tpes.length);
}

// Vérifier si la sélection est partielle
isIndeterminate(): boolean {
  if (this.globalSelectionMode) return false;
  return this.selectedTPEs.size > 0 && this.selectedTPEs.size < this.tpes.length;
}

// Sélection individuelle (désactive le mode global)
toggleSelection(tpeId: string, checked: boolean): void {
  // Si on modifie une sélection individuelle, on désactive le mode global
  if (this.globalSelectionMode) {
    this.globalSelectionMode = false;
    // ✅ IMPORTANT: Ne pas toucher à selectedTPEs
    // Les IDs déjà sélectionnés restent pour refléter la réalité
  }
  
  if (checked) {
    this.selectedTPEs.add(tpeId);
  } else {
    this.selectedTPEs.delete(tpeId);
  }
}

confirmDeleteMultiple(): void {
  if (this.globalSelectionMode) {
    // ✅ Au lieu de confirm() JavaScript, on ouvre la modale
    this.deleteAllCount = this.totalCount;
    this.showDeleteAllModal = true;
    return;
  }
  
  if (this.selectedTPEs.size === 0) return;
  
  const selectedIds = Array.from(this.selectedTPEs);
  
  const params: any = {
    page: 1,
    pageSize: this.totalCount,
    searchTerm: this.searchTerm,
    modele: this.selectedModele || undefined,
    commercantId: this.selectedCommercantId || undefined,
    createdAt: this.selectedCreatedAt || undefined,
    updatedAt: this.selectedUpdatedAt || undefined
  };
  
  this.tpeService.getPagedTPEs(params).subscribe({
    next: (response) => {
      this.confirmTPEs = response.data.filter(tpe => selectedIds.includes(tpe.id));
      this.pendingDeleteIds = selectedIds;
      this.pendingDeleteCount = this.confirmTPEs.length;
      this.showMultiDeleteModal = true;
    },
    error: (err) => {
      console.error('Erreur chargement TPEs pour confirmation:', err);
      this.confirmTPEs = [];
      this.pendingDeleteIds = selectedIds;
      this.pendingDeleteCount = selectedIds.length;
      this.showMultiDeleteModal = true;
    }
  });
}


executeDeleteAll(): void {
  this.deleteAllLoading = true;
  
  const params: any = {
    page: 1,
    pageSize: this.totalCount,
    searchTerm: this.searchTerm,
    modele: this.selectedModele || undefined,
    commercantId: this.selectedCommercantId || undefined,
    createdAt: this.selectedCreatedAt || undefined,
    updatedAt: this.selectedUpdatedAt || undefined
  };
  
  this.tpeService.getPagedTPEs(params).subscribe({
    next: (response) => {
      const allTPEs = response.data;
      const totalToDelete = allTPEs.length;
      let deleted = 0;
      let errors = 0;
      
      allTPEs.forEach(tpe => {
        this.tpeService.deleteTPE(tpe.id).subscribe({
          next: () => {
            deleted++;
            if (deleted + errors === totalToDelete) {
              this.finishDeleteAll(deleted, errors);
            }
          },
          error: (err) => {
            console.error(`Erreur suppression TPE ${tpe.id}:`, err);
            errors++;
            if (deleted + errors === totalToDelete) {
              this.finishDeleteAll(deleted, errors);
            }
          }
        });
      });
    },
    error: (err) => {
      console.error('Erreur récupération TPEs:', err);
      this.deleteAllLoading = false;
      this.showDeleteAllModal = false;
      this.showAlert('error', 'Erreur', 'Impossible de récupérer la liste des TPEs');
    }
  });
}

finishDeleteAll(deleted: number, errors: number): void {
  this.deleteAllLoading = false;
  this.showDeleteAllModal = false;
  this.globalSelectionMode = false;
  this.selectedTPEs.clear();
  
  if (errors === 0) {
    this.showAlert('success', 'Succès', `${deleted} TPE(s) supprimé(s) avec succès.`);
  } else {
    this.showAlert('warning', 'Suppression partielle', `${deleted} TPE(s) supprimé(s), ${errors} échec(s).`);
  }
  
  this.loadTPEs();
}

cancelDeleteAll(): void {
  this.showDeleteAllModal = false;
  this.deleteAllLoading = false;
}
// Ajoutez cette méthode après la méthode clearSelection() ou à côté
tpeDashboard: TPEDashboardDTO | null = null;
loadingDashboard = false;
loadTPEDashboard(): void {
  this.loadingDashboard = true;
  
  this.dashboardAdminService.getTPEDashboard().subscribe({
    next: (response) => {
      if (response && response.data) {
        this.tpeDashboard = response.data;
        console.log('Dashboard TPE chargé:', this.tpeDashboard);
      }
      this.loadingDashboard = false;
    },
    error: (err) => {
      console.error('Erreur chargement dashboard TPE:', err);
      this.loadingDashboard = false;
    }
  });
}

// Désélectionner tous les TPEs
deselectAll(): void {
  this.selectedTPEs.clear();
  this.globalSelectionMode = false;
}
// Ajoutez ces propriétés
pendingDeleteIds: string[] = [];
pendingDeleteCount: number = 0;

// Modifiez executeMultiDelete pour supprimer par IDs (pas par objets)
executeMultiDelete(): void {
  if (this.pendingDeleteIds.length === 0) return;

  this.bulkDeleting = true;
  let completed = 0;
  const total = this.pendingDeleteIds.length;
  let successCount = 0;

  // ✅ Sauvegarder l'état avant suppression
  const currentPageBefore = this.currentPage;
  const wasLastItemOnPage = this.tpes.length === this.pendingDeleteIds.length;

  this.pendingDeleteIds.forEach(id => {
    this.tpeService.deleteTPE(id).subscribe({
      next: () => {
        const index = this.tpes.findIndex(t => t.id === id);
        if (index !== -1) this.tpes.splice(index, 1);
        
        this.selectedTPEs.delete(id);
        successCount++;
        completed++;
        
        if (completed === total) {
          this.bulkDeleting = false;
          this.showMultiDeleteModal = false;
          this.pendingDeleteIds = [];
          
          // ✅ Mettre à jour les compteurs
          this.totalCount = this.totalCount - successCount;
          
          // ✅ AJUSTER LA PAGE SI NÉCESSAIRE
          const newTotalPages = Math.ceil(this.totalCount / this.pageSize);
          
          if (wasLastItemOnPage && currentPageBefore > 1 && newTotalPages < currentPageBefore) {
            this.currentPage = newTotalPages;
          } else if (this.currentPage > newTotalPages && newTotalPages > 0) {
            this.currentPage = newTotalPages;
          } else if (newTotalPages === 0) {
            this.currentPage = 1;
          }
          
          this.totalPages = newTotalPages;
          
          if (successCount === total) {
            this.showAlert('success', 'Succès', `${total} TPE(s) supprimé(s) avec succès.`);
          } else if (successCount > 0) {
            this.showAlert('warning', 'Suppression partielle', `${successCount} TPE(s) supprimé(s), ${total - successCount} échec(s).`);
          } else {
            this.showAlert('error', 'Échec', `Aucun TPE n'a pu être supprimé.`);
          }
          
          // ✅ Recharger la liste
          this.loadTPEs();
        }
      },
      error: (err) => {
        console.error(`Erreur suppression TPE ${id}:`, err);
        completed++;
        if (completed === total) {
          this.bulkDeleting = false;
          this.showMultiDeleteModal = false;
          this.pendingDeleteIds = [];
          
          // ✅ Recalculer les pages
          this.totalCount = this.totalCount - successCount;
          const newTotalPages = Math.ceil(this.totalCount / this.pageSize);
          
          if (this.currentPage > newTotalPages && newTotalPages > 0) {
            this.currentPage = newTotalPages;
          } else if (newTotalPages === 0) {
            this.currentPage = 1;
          }
          
          this.totalPages = newTotalPages;
          this.showAlert('error', 'Erreur', `${successCount}/${total} TPE(s) supprimé(s).`);
          this.loadTPEs();
        }
      }
    });
  });
}

// Supprimer tous les TPEs (toutes pages)
deleteAllTPEs(): void {
  this.bulkDeleting = true;
  
  // Récupérer tous les IDs (une seule requête)
  const params: any = {
    page: 1,
    pageSize: this.totalCount, // Récupérer TOUS
    searchTerm: this.searchTerm,
    modele: this.selectedModele || undefined,
    commercantId: this.selectedCommercantId || undefined,
    createdAt: this.selectedCreatedAt || undefined,
    updatedAt: this.selectedUpdatedAt || undefined
  };
  
  this.tpeService.getPagedTPEs(params).subscribe({
    next: (response) => {
      const allTPEs = response.data;
      const totalToDelete = allTPEs.length;
      let deleted = 0;
      let errors = 0;
      
      // Supprimer un par un
      allTPEs.forEach(tpe => {
        this.tpeService.deleteTPE(tpe.id).subscribe({
          next: () => {
            deleted++;
            if (deleted + errors === totalToDelete) {
              this.finishBulkDelete(deleted, errors, totalToDelete);
            }
          },
          error: (err) => {
            console.error(`Erreur suppression TPE ${tpe.id}:`, err);
            errors++;
            if (deleted + errors === totalToDelete) {
              this.finishBulkDelete(deleted, errors, totalToDelete);
            }
          }
        });
      });
    },
    error: (err) => {
      console.error('Erreur récupération TPEs:', err);
      this.bulkDeleting = false;
      this.showAlert('error', 'Erreur', 'Impossible de récupérer la liste des TPEs');
    }
  });
}

// Terminer la suppression en masse
finishBulkDelete(deleted: number, errors: number, total: number): void {
  this.bulkDeleting = false;
  this.globalSelectionMode = false;
  this.selectedTPEs.clear();
  
  if (errors === 0) {
    this.showAlert('success', 'Succès', `${deleted} TPE(s) supprimé(s) avec succès.`);
  } else {
    this.showAlert('warning', 'Suppression partielle', `${deleted} TPE(s) supprimé(s), ${errors} échec(s).`);
  }
  
  this.loadTPEs(); // Recharger la liste
}


// Annuler la sélection
clearSelection(): void {
  this.selectedTPEs.clear();
}


cancelMultiDelete(): void {
  this.showMultiDeleteModal = false;
  this.confirmTPEs = [];
  this.pendingDeleteIds = [];
  this.bulkDeleting = false;
}



  showAlert(variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string) {
    this.alert = { show: true, variant, title, message };
    setTimeout(() => (this.alert.show = false), 5000);
  }

// ✅ Ajouter ces propriétés pour les dates
selectedCreatedAt = '';
selectedUpdatedAt = '';
toggleFilters(): void {
  this.showFilters = !this.showFilters;
  if (this.showFilters) {
    // Initialiser la valeur pour le select
    let commercantIdValue: any = this.selectedCommercantId;
    
    // Si on est en mode "Non assigné", mettre la valeur spéciale
    if (this.selectedNonAssigne) {
      commercantIdValue = '__NON_ASSIGNE__';
    }
    // Si selectedCommercantId est null et nonAssigne est false, garder null
    
    this.tempFilters = {
      modele: this.selectedModele,
      commercantId: commercantIdValue,
      nonAssigne: this.selectedNonAssigne,
      createdAt: this.selectedCreatedAt,
      updatedAt: this.selectedUpdatedAt
    };
    
    console.log('📂 toggleFilters - tempFilters:', {
      commercantId: this.tempFilters.commercantId,
      type: typeof this.tempFilters.commercantId,
      nonAssigne: this.tempFilters.nonAssigne
    });
  }
}

// ✅ Remplacer cancelFilters()
cancelFilters(): void {
  this.showFilters = false;
  
  // Restaurer correctement les valeurs
  let commercantIdValue: any = this.selectedCommercantId;
  
  if (this.selectedNonAssigne) {
    commercantIdValue = '__NON_ASSIGNE__';
  }
  
  this.tempFilters = {
    modele: this.selectedModele,
    commercantId: commercantIdValue,
    nonAssigne: this.selectedNonAssigne,
    createdAt: this.selectedCreatedAt,
    updatedAt: this.selectedUpdatedAt
  };
}

applyFilters(): void {
  console.log('🔍 applyFilters - tempFilters.commercantId:', 
    this.tempFilters.commercantId, 
    'type:', typeof this.tempFilters.commercantId);
  
  // ✅ Détecter la valeur spéciale '__NON_ASSIGNE__'
  if (this.tempFilters.commercantId === '__NON_ASSIGNE__') {
    this.selectedCommercantId = null;
    this.selectedNonAssigne = true;
    console.log('✅ Filtre "Non assigné" activé');
  } 
  // ✅ Valeur null signifie "Tous les commerçants"
  else if (this.tempFilters.commercantId === null) {
    this.selectedCommercantId = null;
    this.selectedNonAssigne = false;
    console.log('✅ Filtre "Tous les commerçants"');
  }
  // ✅ Un GUID valide
  else if (typeof this.tempFilters.commercantId === 'string' && this.tempFilters.commercantId) {
    this.selectedCommercantId = this.tempFilters.commercantId;
    this.selectedNonAssigne = false;
    console.log('✅ Filtre commerçant spécifique:', this.selectedCommercantId);
  }
  // ✅ Fallback
  else {
    this.selectedCommercantId = null;
    this.selectedNonAssigne = false;
  }
  
  this.selectedModele = this.tempFilters.modele;
  this.selectedCreatedAt = this.tempFilters.createdAt;
  this.selectedUpdatedAt = this.tempFilters.updatedAt;
  this.currentPage = 1;
  this.loadTPEs();
  this.showFilters = false;
}

// ✅ Correction
clearFilters(): void {
  this.tempFilters = {
    modele: '',
    commercantId: null,  // null = "Tous les commerçants"
    nonAssigne: false,
    createdAt: '',
    updatedAt: ''
  };
  this.selectedModele = '';
  this.selectedCommercantId = null;
  this.selectedNonAssigne = false;
  this.selectedCreatedAt = '';
  this.selectedUpdatedAt = '';
  this.searchTerm = '';
  this.currentPage = 1;
  this.loadTPEs();
  this.showFilters = false;
}
// Modifier resetFilters pour utiliser clearFilters
resetFilters(): void {
  this.clearFilters();
}
  loadCommercants(): void {
    this.loading = true;
    this.userService.getCommercants().subscribe({
      next: (commercants) => {
        this.commercants = commercants;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement commerçants:', err);
        this.loading = false;
      }
    });
  }


  // Méthodes pour les filtres du commerçant
toggleCommercantFilters(): void {
  this.showCommercantFilters = !this.showCommercantFilters;
  if (this.showCommercantFilters) {
    this.tempCommercantFilters = {
      modele: this.selectedModele,
      createdAt: this.selectedCreatedAtForCommercant
    };
  }
}

cancelCommercantFilters(): void {
  this.showCommercantFilters = false;
  this.tempCommercantFilters = {
    modele: this.selectedModele,
    createdAt: this.selectedCreatedAtForCommercant
  };
}

applyCommercantFilters(): void {
  this.selectedModele = this.tempCommercantFilters.modele;
  this.selectedCreatedAtForCommercant = this.tempCommercantFilters.createdAt;
  this.currentPage = 1;
  this.loadTPEs();
  this.showCommercantFilters = false;
}

clearCommercantFilters(): void {
  this.tempCommercantFilters = {
    modele: '',
    createdAt: ''
  };
  this.selectedModele = '';
  this.selectedCreatedAtForCommercant = '';
  this.searchTerm = '';
  this.currentPage = 1;
  this.loadTPEs();
  this.showCommercantFilters = false;
}

// Ajouter ces méthodes pour les calendriers admin

// Pour la date de création admin
onAdminCreatedAtChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const dateValue = input.value;
  
  if (dateValue) {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      this.tempFilters.createdAt = dateValue;
    } else {
      this.tempFilters.createdAt = '';
    }
  } else {
    this.tempFilters.createdAt = '';
  }
}

openAdminCreatedAtCalendar(): void {
  const dateInput = document.getElementById('adminCreatedAtDate') as HTMLInputElement;
  if (dateInput) {
    dateInput.showPicker();
  }
}

// Pour la date de modification admin
onAdminUpdatedAtChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const dateValue = input.value;
  
  if (dateValue) {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      this.tempFilters.updatedAt = dateValue;
    } else {
      this.tempFilters.updatedAt = '';
    }
  } else {
    this.tempFilters.updatedAt = '';
  }
}

openAdminUpdatedAtCalendar(): void {
  const dateInput = document.getElementById('adminUpdatedAtDate') as HTMLInputElement;
  if (dateInput) {
    dateInput.showPicker();
  }
}

// Méthode pour la date (comme dans incidents)
openCalendar(): void {
  const dateInput = document.getElementById('tpeDate') as HTMLInputElement;
  if (dateInput) {
    dateInput.showPicker();
  }
}

onDateChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const dateValue = input.value;
  
  if (dateValue) {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      this.selectedDetectionDateObj = date;
      this.selectedCreatedAtForCommercant = dateValue;
      this.tempCommercantFilters.createdAt = dateValue;
    } else {
      this.selectedDetectionDateObj = null;
      this.selectedCreatedAtForCommercant = '';
      this.tempCommercantFilters.createdAt = '';
    }
  } else {
    this.selectedDetectionDateObj = null;
    this.selectedCreatedAtForCommercant = '';
    this.tempCommercantFilters.createdAt = '';
  }
}

loadTPEs(): void {
  this.loading = true;
  
  if (this.userRole === 'Admin') {
    this.tpeService.getPagedTPEs({
      page: this.currentPage,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm,
      modele: this.selectedModele || undefined,
      commercantId: this.selectedCommercantId || undefined,
            nonAssigne: this.selectedNonAssigne,  // ← AJOUTER CE PARAMÈTRE

      createdAt: this.selectedCreatedAt || undefined,
      updatedAt: this.selectedUpdatedAt || undefined
    }).subscribe({
      next: (response: PagedResponse<any>) => {
        this.tpes = response.data;
        this.totalCount = response.pagination.totalCount;
        this.totalPages = response.pagination.totalPages;
        this.currentPage = response.pagination.page;
        this.loading = false;
      },
      error: err => {
        console.error('Erreur chargement TPEs:', err);
        this.loading = false;
      }
    });
  } else if (this.userRole === 'Commercant') {
    // ✅ Commerçant avec filtre modèle ET date de création
    this.tpeService.getMesTPEsPaged({
      page: this.currentPage,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm,
      modele: this.selectedModele || undefined,
      createdAt: this.selectedCreatedAtForCommercant || undefined
    }).subscribe({
      next: (response: PagedResponse<any>) => {
        this.tpes = response.data;
        this.totalCount = response.pagination.totalCount;
        this.totalPages = response.pagination.totalPages;
        this.currentPage = response.pagination.page;
        this.loading = false;
      },
      error: err => {
        console.error('Erreur chargement TPEs (Commercant):', err);
        this.loading = false;
      }
    });
  } else {
    this.tpes = [];
    this.loading = false;
  }
}

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadTPEs();
    }
  }

  onSearch(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.loadTPEs();
    }, 400);
  }


  getPageNumbers(): number[] {
    if (this.totalPages <= 0) return [1];
    
    const maxVisible = 5;
    const pages: number[] = [];
    
    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
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

getBadgeClasses(modele: string): string {
  const map: Record<string, string> = {
    'Ingenico': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    'Verifone': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'PAX': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  };
  const key = modele?.trim() || '';
  return map[key] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
}
  canManage(): boolean {
    return this.userRole === 'Admin';
  }

 // Ajoutez ces propriétés dans la classe TpeListComponent
deleting = false;
tpeToDelete: any = null;

// Modifiez la méthode deleteTPE
deleteTPE(tpe: any) {
  if (!this.canManage()) {
    this.alert = {
      show: true,
      variant: 'error',
      title: 'Accès refusé',
      message: 'Seuls les administrateurs peuvent supprimer des TPEs'
    };
    return;
  }

  this.tpeToDelete = tpe;
  this.tpeToDeleteId = tpe.id;
}

// Modifiez confirmDelete
confirmDelete() {
  if (!this.tpeToDeleteId) return;

  this.deleting = true;
  
  this.tpeService.deleteTPE(this.tpeToDeleteId).subscribe({
    next: () => {
      this.showAlert('success', 'Succès', 'TPE supprimé avec succès');
      this.loadTPEs();
      this.cancelDelete();
      this.deleting = false;
    },
    error: (err) => {
      this.showAlert('error', 'Erreur', err.error?.message || 'Erreur lors de la suppression du TPE');
      this.cancelDelete();
      this.deleting = false;
    }
  });
}

// Modifiez cancelDelete
cancelDelete() {
  this.tpeToDeleteId = null;
  this.tpeToDelete = null;
  this.deleting = false;
}
  formatCommercant(tpe: any): string {
    if (this.userRole === 'Admin') {
      return tpe.commercantNom || 'Non assigné';
    }
    return 'Vous';
  }




}