import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../services/user.service';
import { User } from '../../models/User.model';
import { BadgeComponent } from '../../components/ui/badge/badge.component';
import { CheckboxComponent } from '../../components/form/input/checkbox.component';

@Component({
  selector: 'app-techniciens-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BadgeComponent, CheckboxComponent],
  templateUrl: './techniciens-list.component.html'
})
export class TechniciensListComponent implements OnInit {
  techniciens: User[] = [];
  loading = true;
  error: string | null = null;
  
  searchTerm = '';
  selectedTechniciens = new Set<string>();
  
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
  confirmUser: User | null = null;
  confirmToggleUser: User | null = null;
  // À ajouter dans les deux composants
Math = Math;
  
  // ✅ Suppression multiple
  showMultiDeleteModal = false;
  confirmUsers: User[] = [];
  bulkDeleting = false;
  
  // ✅ Alert (remplace notification)
  alert = {
    show: false,
    variant: 'success' as 'success' | 'error',
    title: '',
    message: ''
  };

  constructor(private userService: UserService,private router: Router) {}

  ngOnInit(): void {
    this.loadTechniciens();
  }
onEdit(technicien: any): void {
  this.router.navigate(['/update-technicien', technicien.id]);
}
  get filteredTechniciens(): User[] {
    let result = [...this.techniciens];
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(t => 
        t.nom?.toLowerCase().includes(term) ||
        t.prenom?.toLowerCase().includes(term) ||
        t.email?.toLowerCase().includes(term) ||
        t.phoneNumber?.includes(term)
      );
    }
    
    if (this.selectedStatut) {
      result = result.filter(t => t.statut === this.selectedStatut);
    }
    
    return result;
  }

  get paginatedTechniciens(): User[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredTechniciens.slice(start, end);
  }

loadTechniciens(keepCurrentPage: boolean = false): void {
  this.loading = true;
  const request = {
    page: 1,  // ✅ Toujours charger depuis la page 1
    pageSize: 100,
    sortBy: 'nom',
    sortDescending: false,
    role: 'Technicien'
  };

  this.userService.getTechniciens(request).subscribe({
    next: (response) => {
      console.log('📦 Réponse reçue:', response);
      
      if (response && response.data) {
        this.techniciens = response.data.filter((t: any) => t.emailConfirmed === true);
        console.log('✅ Techniciens après filtrage:', this.techniciens.length);
        
        // ✅ Mettre à jour la pagination
        this.updateTotalPages();
        
        // ✅ Si on a supprimé des éléments, ajuster la page courante
        if (!keepCurrentPage && this.currentPage > this.totalPages && this.totalPages > 0) {
          this.currentPage = this.totalPages;
        }
      } else {
        this.techniciens = [];
      }
      
      this.loading = false;
    },
    error: (err) => {
      console.error('Erreur chargement techniciens:', err);
      this.error = 'Impossible de charger les techniciens';
      this.loading = false;
    }
  });
}

updateTotalPages(): void {
  const totalFiltered = this.filteredTechniciens.length;
  this.totalPages = Math.ceil(totalFiltered / this.pageSize) || 1;
  
  // ✅ Ajuster la page courante si elle dépasse le nombre total de pages
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
    this.selectedTechniciens.clear();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatut = '';
    this.currentPage = 1;
    this.updateTotalPages();
    this.selectedTechniciens.clear();
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
    // ✅ Sélectionner TOUS les éléments filtrés (toutes pages confondues)
    this.filteredTechniciens.forEach(c => this.selectedTechniciens.add(c.id));
    this.selectedAllFiltered = true;
  } else {
    this.selectedTechniciens.clear();
    this.selectedAllFiltered = false;
  }
}

// Remplacer la méthode onSelect
onSelect(commercant: any, checked: boolean): void {
  if (checked) {
    this.selectedTechniciens.add(commercant.id);
  } else {
    this.selectedTechniciens.delete(commercant.id);
    // Si on désélectionne manuellement, sortir du mode "tout sélectionner"
    this.selectedAllFiltered = false;
  }
}

// Ajouter une méthode pour la sélection par lot (toutes les pages)
selectAllFiltered(): void {
  if (this.selectedAllFiltered) {
    // Déjà sélectionné, on désélectionne tout
    this.selectedTechniciens.clear();
    this.selectedAllFiltered = false;
  } else {
    // Sélectionner tous les éléments filtrés
    this.filteredTechniciens.forEach(c => this.selectedTechniciens.add(c.id));
    this.selectedAllFiltered = true;
  }
}

// Modifier isSelected pour prendre en compte le mode "tout sélectionner"
isSelected(id: string): boolean {
  if (this.selectedAllFiltered) {
    // Vérifier si l'élément fait partie des éléments filtrés
    return this.filteredTechniciens.some(t => t.id === id);
  }
  return this.selectedTechniciens.has(id);
}

// Modifier get isAllSelected
get isAllSelected(): boolean {
  if (this.filteredTechniciens.length === 0) return false;
  return this.filteredTechniciens.every(c => this.selectedTechniciens.has(c.id));
}

clearSelection(): void {
  this.selectedTechniciens.clear();
  this.selectedAllFiltered = false;
}

  // ================= ALERT =================
  showAlert(variant: 'success' | 'error', title: string, message: string): void {
    this.alert = { show: true, variant, title, message };
    setTimeout(() => { this.alert.show = false; }, 5000);
  }

  clearAlert(): void {
    this.alert.show = false;
  }

  // ================= SUPPRESSION MULTIPLE =================
  
confirmDeleteMultiple(): void {
  let selectedIds: string[];
  
  if (this.selectedAllFiltered) {
    // Sélectionner TOUS les éléments filtrés (toutes pages)
    this.confirmUsers = [...this.filteredTechniciens];
  } else {
    if (this.selectedTechniciens.size === 0) return;
    selectedIds = Array.from(this.selectedTechniciens);
    this.confirmUsers = this.techniciens.filter(t => selectedIds.includes(t.id));
  }
  
  if (this.confirmUsers.length === 0) return;
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

  this.confirmUsers.forEach(user => {
    this.userService.deleteUser(user.id).subscribe({
      next: (response: any) => {
        const isSuccess = typeof response === 'boolean'
          ? response
          : (response?.isSuccess === true);

        if (isSuccess) {
          const index = this.techniciens.findIndex(u => u.id === user.id);
          if (index !== -1) this.techniciens.splice(index, 1);
          this.selectedTechniciens.delete(user.id);
          successCount++;
        }

        completed++;
        
        if (completed === total) {
          this.bulkDeleting = false;
          this.showMultiDeleteModal = false;
          this.confirmUsers = [];
          
          // ✅ Réinitialiser le mode "tout sélectionner"
          this.selectedAllFiltered = false;
          this.selectedTechniciens.clear();
          
          // ✅ Recharger la liste complète depuis le backend
          this.loadTechniciens();
          
          if (successCount === total) {
            this.showAlert('success', 'Succès', `${total} technicien(s) supprimé(s) avec succès.`);
          } else if (successCount > 0) {
            this.showAlert('error', 'Attention', `${successCount} technicien(s) supprimé(s), ${total - successCount} échec(s).`);
          } else {
            this.showAlert('error', 'Erreur', `Aucun technicien n'a pu être supprimé.`);
          }
        }
      },
      error: (err) => {
        console.error(`Erreur suppression ${user.prenom} ${user.nom}:`, err);
        completed++;
        if (completed === total) {
          this.bulkDeleting = false;
          this.showMultiDeleteModal = false;
          this.confirmUsers = [];
          this.selectedAllFiltered = false;
          this.selectedTechniciens.clear();
          this.loadTechniciens();
          this.showAlert('error', 'Erreur', `${successCount}/${total} technicien(s) supprimé(s).`);
        }
      }
    });
  });
}
selectedAllFiltered = false;  // Mode "Sélectionner tout sur toutes les pages"

  // ================= ACTIONS SIMPLES =================
  
  onToggle(user: User): void {
    this.confirmToggleUser = user;
  }

  cancelToggle(): void {
    this.confirmToggleUser = null;
    this.toggling = false;
  }

  confirmToggle(): void {
    if (!this.confirmToggleUser) return;

    this.toggling = true;
    
    const user = this.confirmToggleUser;
    const userName = `${user.prenom} ${user.nom}`;
    const isActivating = user.statut === 'Inactif';
    
    const action$ = isActivating
      ? this.userService.activateUser(user.id)
      : this.userService.desactivateUser(user.id);

    action$.subscribe({
      next: () => {
        const index = this.techniciens.findIndex(u => u.id === user.id);
        if (index !== -1) {
          this.techniciens[index].statut = isActivating ? 'Actif' : 'Inactif';
        }
        this.confirmToggleUser = null;
        this.toggling = false;
        this.showAlert('success', 'Succès', `${userName} a été ${isActivating ? 'activé' : 'désactivé'} avec succès.`);
        this.loadTechniciens();
      },
      error: (err) => {
        console.error('Erreur', err);
        this.toggling = false;
        this.showAlert('error', 'Erreur', err.error?.message || `Impossible de ${isActivating ? 'activer' : 'désactiver'} ${userName}.`);
        this.confirmToggleUser = null;
      }
    });
  }

  onDelete(user: User): void {
    this.confirmUser = user;
  }

  cancelDelete(): void {
    this.confirmUser = null;
    this.deleting = false;
  }

// ✅ APRÈS (technicien)
confirmDelete(): void {
  if (!this.confirmUser) return;

  this.deleting = true;
  const userToDelete = this.confirmUser;
  const userName = `${userToDelete.prenom} ${userToDelete.nom}`;

  this.userService.deleteUser(userToDelete.id).subscribe({
    next: (response: any) => {
      const isSuccess = typeof response === 'boolean'
        ? response
        : (response?.isSuccess === true);

      if (isSuccess) {
        this.techniciens = this.techniciens.filter(u => u.id !== userToDelete.id);
        this.showAlert('success', 'Succès', `${userName} a été supprimé avec succès.`);
        this.loadTechniciens();
      } else {
        const errorMsg = response?.message || 'Impossible de supprimer ce technicien.';
        this.showAlert('error', 'Erreur', errorMsg);
      }
      this.deleting = false;
      this.confirmUser = null;
    },
    error: (err) => {
      console.error('Erreur suppression', err);
      this.deleting = false;
      const errorMessage = err.error?.message || err.message || 'Erreur inconnue';
      this.showAlert('error', 'Erreur', errorMessage);
      this.confirmUser = null;
    }
  });
}

  getStatutCount(statut: string): number {
    return this.techniciens.filter(t => t.statut === statut).length;
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