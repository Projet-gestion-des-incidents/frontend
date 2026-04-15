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
  alert = {
    show: false,
    variant: 'success' as 'success' | 'error',
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
    this.userService.getCommercants().subscribe({
      next: (commercants) => {
        this.commercants = commercants;
        this.loading = false;
        this.updateTotalPages();
      },
      error: (err) => {
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
  showAlert(variant: 'success' | 'error', title: string, message: string): void {
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

    this.confirmUsers.forEach(commercant => {
      this.userService.deleteUser(commercant.id).subscribe({
        next: () => {
          const index = this.commercants.findIndex(c => c.id === commercant.id);
          if (index !== -1) this.commercants.splice(index, 1);
          this.selectedCommercants.delete(commercant.id);
          successCount++;
          completed++;
          
          if (completed === total) {
            this.bulkDeleting = false;
            this.showMultiDeleteModal = false;
            this.confirmUsers = [];
            
            if (successCount === total) {
              this.showAlert('success', 'Succès', `${total} commerçant(s) supprimé(s) avec succès.`);
            } else if (successCount > 0) {
              this.showAlert('error', 'Attention', `${successCount} commerçant(s) supprimé(s), ${total - successCount} échec(s).`);
            } else {
              this.showAlert('error', 'Erreur', `Aucun commerçant n'a pu être supprimé.`);
            }
            this.loadCommercants();
          }
        },
        error: (err) => {
          console.error(`Erreur suppression ${commercant.nomMagasin}:`, err);
          completed++;
          if (completed === total) {
            this.bulkDeleting = false;
            this.showMultiDeleteModal = false;
            this.confirmUsers = [];
            this.showAlert('error', 'Erreur', `${successCount}/${total} commerçant(s) supprimé(s).`);
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
    this.confirmUser = commercant;
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
      next: () => {
        this.commercants = this.commercants.filter(c => c.id !== commercantToDelete.id);
        this.confirmUser = null;
        this.deleting = false;
        this.showAlert('success', 'Succès', `${nomMagasin} a été supprimé avec succès.`);
        this.loadCommercants();
      },
      error: (err) => {
        console.error('Erreur suppression', err);
        this.deleting = false;
        
        if (err.error?.message?.includes('TPEs associés')) {
          this.showAlert('error', 'Attention', 'Ce commerçant a des TPEs associés. Supprimez-les d\'abord.');
        } else {
          this.showAlert('error', 'Erreur', err.error?.message || `Impossible de supprimer ${nomMagasin}.`);
        }
        this.confirmUser = null;
      }
    });
  }

  getStatutCount(statut: string): number {
    return this.commercants.filter(c => c.statut === statut).length;
  }


}