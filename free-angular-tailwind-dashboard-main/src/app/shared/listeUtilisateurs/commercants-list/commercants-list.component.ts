import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule ,Router} from '@angular/router';
import { UserService } from '../../services/user.service';
import { BadgeComponent } from '../../components/ui/badge/badge.component';
import { CheckboxComponent } from '../../components/form/input/checkbox.component';

@Component({
  selector: 'app-commercants-list',
  standalone: true,
  imports: [CommonModule,FormsModule, RouterModule, BadgeComponent, CheckboxComponent],
  templateUrl: './commercants-list.component.html'
})
export class CommercantsListComponent implements OnInit {
  commercants: any[] = [];
  loading = true;
  error: string | null = null;
  // À ajouter dans les deux composants
Math = Math;
  searchTerm = '';
  selectedCommercants = new Set<string>();
  
  // Filtres
  showFilters = false;
  selectedStatut = '';
  statutOptions = ['Actif', 'Inactif'];
  
  // Pagination
  currentPage = 1;
  pageSize = 8;
  totalPages = 1;
  
  // États pour les opérations
  deleting = false;
  toggling = false;
  confirmUser: any = null;
  confirmToggleUser: any = null;
  
  // ✅ Suppression multiple
  showMultiDeleteModal = false;
  confirmUsers: any[] = [];
  bulkDeleting = false;
  
  // ✅ Alert
 // ✅ Alert - Ajouter 'warning' au type
alert = {
  show: false,
  variant: 'success' as 'success' | 'error' | 'warning',
  title: '',
  message: ''
};

  constructor(private userService: UserService,    private router: Router
) {}

  ngOnInit(): void {
    this.loadCommercants();
  }

  get filteredCommercants(): any[] {
    let result = this.commercants;
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(c => 
        c.nomMagasin?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.phoneNumber?.includes(term) ||
        c.adresse?.toLowerCase().includes(term)
      );
    }
    
    if (this.selectedStatut) {
      result = result.filter(c => c.statut === this.selectedStatut);
    }
    
    return result;
  }

  get paginatedCommercants(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredCommercants.slice(start, end);
  }

loadCommercants(): void {
  this.loading = true;
  
  // ✅ Récupérer TOUS les commerçants en une seule requête
  this.userService.getCommercants().subscribe({
    next: (response: any[]) => {
      console.log('📦 Réponse commerçants:', response);
      
      if (response && Array.isArray(response)) {
        this.commercants = response;
        console.log('✅ Commerçants chargés:', this.commercants.length);
        console.log('✅ Total dans la base:', response.length);
        
        // ✅ Mettre à jour la pagination
        this.updateTotalPages();
      } else {
        this.commercants = [];
      }
      
      this.loading = false;
    },
    error: (err: any) => {
      console.error('Erreur chargement commerçants:', err);
      this.error = 'Impossible de charger les commerçants';
      this.loading = false;
    }
  });
}
onEdit(commercant: any): void {
  this.router.navigate(['/update-commercant', commercant.id]);
}
  updateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredCommercants.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  onSearch(): void {
    this.currentPage = 1;
    this.updateTotalPages();
  }

  applyFilter(): void {
    this.currentPage = 1;
    this.updateTotalPages();
    this.selectedCommercants.clear();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatut = '';
    this.currentPage = 1;
    this.updateTotalPages();
    this.selectedCommercants.clear();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onSelectAll(checked: boolean): void {
    if (checked) {
      this.paginatedCommercants.forEach(c => this.selectedCommercants.add(c.id));
    } else {
      this.selectedCommercants.clear();
    }
  }

  onSelect(commercant: any, checked: boolean): void {
    if (checked) {
      this.selectedCommercants.add(commercant.id);
    } else {
      this.selectedCommercants.delete(commercant.id);
    }
  }

  isSelected(id: string): boolean {
    return this.selectedCommercants.has(id);
  }

  get isAllSelected(): boolean {
    return this.paginatedCommercants.length > 0 && 
           this.selectedCommercants.size === this.paginatedCommercants.length;
  }

  clearSelection(): void {
    this.selectedCommercants.clear();
  }

  // ================= ALERT =================
 // ================= ALERT =================
showAlert(variant: 'success' | 'error' | 'warning', title: string, message: string): void {
  this.alert = { show: true, variant, title, message };
  setTimeout(() => { this.alert.show = false; }, 5000);
}

  clearAlert(): void {
    this.alert.show = false;
  }

  // ================= SUPPRESSION MULTIPLE =================
  
  confirmDeleteMultiple(): void {
    if (this.selectedCommercants.size === 0) return;
    // ✅ Correction : convertir le Set en tableau
    const selectedIds = Array.from(this.selectedCommercants);
    this.confirmUsers = this.commercants.filter(c => selectedIds.includes(c.id));
    this.showMultiDeleteModal = true;
  }

  cancelMultiDelete(): void {
    this.showMultiDeleteModal = false;
    this.confirmUsers = [];
    this.bulkDeleting = false;
  }

executeMultiDelete(): void {
  if (this.confirmUsers.length === 0) return;

  this.bulkDeleting = true;
  let completed = 0;
  const total = this.confirmUsers.length;
  let successCount = 0;
  const errors: string[] = [];

  this.confirmUsers.forEach(commercant => {
    this.userService.deleteUser(commercant.id).subscribe({
      next: (response: any) => {
        const isSuccess = typeof response === 'boolean' 
          ? response 
          : (response?.isSuccess === true);
        
        if (isSuccess) {
          const index = this.commercants.findIndex(c => c.id === commercant.id);
          if (index !== -1) this.commercants.splice(index, 1);
          this.selectedCommercants.delete(commercant.id);
          successCount++;
        } else {
          errors.push(`${commercant.nomMagasin}: ${response?.message || 'Erreur inconnue'}`);
        }
        completed++;
        
        if (completed === total) {
          this.bulkDeleting = false;
          this.showMultiDeleteModal = false;
          this.confirmUsers = [];
          
          if (successCount === total) {
            this.showAlert('success', 'Succès', `${total} commerçant(s) supprimé(s) avec succès.`);
          } else if (successCount > 0) {
            this.showAlert('error', 'Attention', `${successCount} commerçant(s) supprimé(s), ${total - successCount} échec(s).\n${errors.slice(0, 3).join(', ')}`);
          } else {
            this.showAlert('error', 'Erreur', `Aucun commerçant n'a pu être supprimé.\n${errors.slice(0, 3).join(', ')}`);
          }
          this.loadCommercants();
        }
      },
      error: (err) => {
        console.error(`Erreur suppression ${commercant.nomMagasin}:`, err);
        let errorMsg = err.error?.message || err.message || 'Erreur';
        if (errorMsg.includes('TPEs') || errorMsg.includes('incidents')) {
          errorMsg = 'Ce commerçant a des données associées.';
        }
        errors.push(`${commercant.nomMagasin}: ${errorMsg}`);
        completed++;
        if (completed === total) {
          this.bulkDeleting = false;
          this.showMultiDeleteModal = false;
          this.confirmUsers = [];
          this.showAlert('error', 'Erreur', `${successCount}/${total} commerçant(s) supprimé(s).\n${errors.slice(0, 3).join(', ')}`);
          this.loadCommercants();
        }
      }
    });
  });
}

  // ================= ACTIONS SIMPLES =================
  
  onToggle(commercant: any): void {
    this.confirmToggleUser = commercant;
  }

  cancelToggle(): void {
    this.confirmToggleUser = null;
    this.toggling = false;
  }

  confirmToggle(): void {
    if (!this.confirmToggleUser) return;

    this.toggling = true;
    
    const commercant = this.confirmToggleUser;
    const nomMagasin = commercant.nomMagasin;
    const isActivating = commercant.statut === 'Inactif';
    
    const action$ = isActivating
      ? this.userService.activateUser(commercant.id)
      : this.userService.desactivateUser(commercant.id);

    action$.subscribe({
      next: () => {
        const index = this.commercants.findIndex(c => c.id === commercant.id);
        if (index !== -1) {
          this.commercants[index].statut = isActivating ? 'Actif' : 'Inactif';
        }
        this.confirmToggleUser = null;
        this.toggling = false;
        this.showAlert('success', 'Succès', `${nomMagasin} a été ${isActivating ? 'activé' : 'désactivé'} avec succès.`);
        this.loadCommercants();
      },
      error: (err) => {
        console.error('Erreur', err);
        this.toggling = false;
        this.showAlert('error', 'Erreur', err.error?.message || `Impossible de ${isActivating ? 'activer' : 'désactiver'} ${nomMagasin}.`);
        this.confirmToggleUser = null;
      }
    });
  }

onDelete(commercant: any): void {
  // ✅ Vérifier si le commerçant a des incidents
  this.userService.getCommercantById(commercant.id).subscribe({
    next: (details) => {
      // Vérifier la propriété appropriée selon votre DTO
      if (details && (details.nombreIncidents > 0 || details.hasIncidents || details.incidentCount > 0)) {
        this.showAlert('error', 'Suppression impossible', 
          `Ce commerçant a ${details.nombreIncidents || details.incidentCount} incident(s) associé(s). Supprimez-les d'abord ou contactez l'administrateur.`);
      } else {
        this.confirmUser = commercant;
      }
    },
    error: () => {
      // Si on ne peut pas vérifier, afficher un avertissement
      this.showAlert('warning', 'Attention', 
        'Impossible de vérifier les dépendances. La suppression pourrait échouer si des incidents sont associés.');
      // On autorise quand même
      this.confirmUser = commercant;
    }
  });
}

  cancelDelete(): void {
    this.confirmUser = null;
    this.deleting = false;
  }

confirmDelete(): void {
  if (!this.confirmUser) return;

  this.deleting = true;
  
  const commercantToDelete = this.confirmUser;
  const nomMagasin = commercantToDelete.nomMagasin;
  
  this.userService.deleteUser(commercantToDelete.id).subscribe({
    next: (response: any) => {
      // ✅ Vérifier la réponse correctement
      const isSuccess = typeof response === 'boolean' 
        ? response 
        : (response?.isSuccess === true);
      
      if (isSuccess) {
        // ✅ Supprimer de la liste locale seulement si succès
        this.commercants = this.commercants.filter(c => c.id !== commercantToDelete.id);
        this.selectedCommercants.delete(commercantToDelete.id);
        this.showAlert('success', 'Succès', `${nomMagasin} a été supprimé avec succès.`);
        this.loadCommercants(); // Recharger pour mettre à jour les compteurs
      } else {
        // ❌ Afficher l'erreur réelle du backend
        const errorMsg = response?.message || 'Impossible de supprimer ce commerçant.';
        this.showAlert('error', 'Erreur', errorMsg);
      }
      this.deleting = false;
      this.confirmUser = null;
    },
    error: (err) => {
      console.error('Erreur suppression', err);
      this.deleting = false;
      
      // ✅ Récupérer le message d'erreur détaillé
      let errorMessage = err.error?.message || err.message || 'Erreur inconnue';
      
      // ✅ Message spécifique pour les incidents
      if (errorMessage.includes('incident') || errorMessage.toLowerCase().includes('incident')) {
        errorMessage = 'Ce commerçant a des incidents associés. Supprimez les incidents d\'abord avant de supprimer le commerçant.';
      } else if (errorMessage.includes('TPEs') || errorMessage.toLowerCase().includes('tpe')) {
        errorMessage = 'Ce commerçant a des TPEs associés. Détachez ou supprimez les TPEs d\'abord.';
      }
      
      this.showAlert('error', 'Erreur', errorMessage);
      this.confirmUser = null;
    }
  });
}


  getStatutCount(statut: string): number {
    return this.commercants.filter(c => c.statut === statut).length;
  }
// À ajouter dans les deux composants
getPageNumbers(): (number | -1)[] {
  const total = this.totalPages;
  const current = this.currentPage;
  const delta = 2; // Nombre de pages à afficher de chaque côté
  const range: number[] = [];
  
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    range.push(i);
  }
  
  if (current - delta > 2) {
    range.unshift(-1); // -1 représente "..."
  }
  if (current + delta < total - 1) {
    range.push(-1);
  }
  
  range.unshift(1);
  if (total !== 1) {
    range.push(total);
  }
  
  return range;
}

}