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

  loadTechniciens(): void {
    this.loading = true;
    const request: any = {
      page: 1,
      pageSize: 1000,
      sortBy: 'nom',
      sortDescending: false
    };

    this.userService.searchUsers(request).subscribe({
      next: (res) => {
        this.techniciens = (res.data || []).filter(user => user.role === 'Technicien');
        this.loading = false;
        this.updateTotalPages();
      },
      error: (err) => {
        console.error('Erreur chargement techniciens:', err);
        this.error = 'Impossible de charger les techniciens';
        this.loading = false;
      }
    });
  }

  updateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredTechniciens.length / this.pageSize) || 1;
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
      this.paginatedTechniciens.forEach(t => this.selectedTechniciens.add(t.id));
    } else {
      this.selectedTechniciens.clear();
    }
  }

  onSelect(technicien: User, checked: boolean): void {
    if (checked) {
      this.selectedTechniciens.add(technicien.id);
    } else {
      this.selectedTechniciens.delete(technicien.id);
    }
  }

  isSelected(id: string): boolean {
    return this.selectedTechniciens.has(id);
  }

  get isAllSelected(): boolean {
    return this.paginatedTechniciens.length > 0 && 
           this.selectedTechniciens.size === this.paginatedTechniciens.length;
  }

  clearSelection(): void {
    this.selectedTechniciens.clear();
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
    if (this.selectedTechniciens.size === 0) return;
    this.confirmUsers = this.paginatedTechniciens.filter(u => this.selectedTechniciens.has(u.id));
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
        next: () => {
          const index = this.techniciens.findIndex(u => u.id === user.id);
          if (index !== -1) this.techniciens.splice(index, 1);
          this.selectedTechniciens.delete(user.id);
          successCount++;
          completed++;
          
          if (completed === total) {
            this.bulkDeleting = false;
            this.showMultiDeleteModal = false;
            this.confirmUsers = [];
            
            if (successCount === total) {
              this.showAlert('success', 'Succès', `${total} technicien(s) supprimé(s) avec succès.`);
            } else if (successCount > 0) {
              this.showAlert('error', 'Attention', `${successCount} technicien(s) supprimé(s), ${total - successCount} échec(s).`);
            } else {
              this.showAlert('error', 'Erreur', `Aucun technicien n'a pu être supprimé.`);
            }
            this.loadTechniciens();
          }
        },
        error: (err) => {
          console.error(`Erreur suppression ${user.prenom} ${user.nom}:`, err);
          completed++;
          if (completed === total) {
            this.bulkDeleting = false;
            this.showMultiDeleteModal = false;
            this.confirmUsers = [];
            this.showAlert('error', 'Erreur', `${successCount}/${total} technicien(s) supprimé(s).`);
            this.loadTechniciens();
          }
        }
      });
    });
  }

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

  confirmDelete(): void {
    if (!this.confirmUser) return;

    this.deleting = true;
    
    const userToDelete = this.confirmUser;
    const userName = `${userToDelete.prenom} ${userToDelete.nom}`;
    
    this.userService.deleteUser(userToDelete.id).subscribe({
      next: () => {
        this.techniciens = this.techniciens.filter(u => u.id !== userToDelete.id);
        this.confirmUser = null;
        this.deleting = false;
        this.showAlert('success', 'Succès', `${userName} a été supprimé avec succès.`);
        this.loadTechniciens();
      },
      error: (err) => {
        console.error('Erreur suppression', err);
        this.deleting = false;
        this.showAlert('error', 'Erreur', err.error?.message || `Impossible de supprimer ${userName}.`);
        this.confirmUser = null;
      }
    });
  }

  getStatutCount(statut: string): number {
    return this.techniciens.filter(t => t.statut === statut).length;
  }

}