import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../shared/services/user.service';
import { User } from '../../../shared/models/User.model';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { FormsModule } from '@angular/forms';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { CheckboxComponent } from '../../../shared/components/form/input/checkbox.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    AlertComponent,
    CheckboxComponent,
    BadgeComponent,
    ButtonComponent
  ],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  users: User[] = [];
  loading = true;
  error: string | null = null;

  // Selection properties
  selectedUsers = new Set<string>();
  selectAll = false;
  confirmUser: User | null = null;
  confirmUsers: User[] = [];
  showMultiDeleteAlert = false;
  confirmToggleUser: User | null = null;

  currentPage = 1;
  pageSize = 4;
  totalPages = 1;
  totalCount = 0;

  searchTerm = '';
  selectedRole = '';
  selectedStatut = '';

  // Cache
  private allUsersCache: User[] | null = null;
  private searchTimeout: any;

  // États pour les opérations
  deleting = false;
  deleteError = false;
  deleteErrorMessage = '';
  toggling = false;
  toggleError = false;
  toggleErrorMessage = '';

  // Notification
  notification = {
    show: false,
    variant: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
    icon: ''
  };

  // Bulk actions
  showMultiToggleAlert = false;
  confirmToggleUsers: User[] = [];
  bulkAction: 'activate' | 'deactivate' | null = null;

  // Modals
  showDeactivationModal = false;
  deactivationProposalUser: User | null = null;
  deactivationErrorMessage = '';

  // Filtres
  roleOptions: string[] = ['Technicien', 'Commercant'];
  statutOptions: string[] = ['Actif', 'Inactif'];
  showFilters = false;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadAllUsers();
    this.loadRoles();
  }

  // ================= CHARGEMENT DES DONNÉES =================
  
  loadAllUsers(): void {
    this.loading = true;
    
    const request: any = {
      page: 1,
      pageSize: 1000,
      sortBy: 'nom',
      sortDescending: false
    };

    this.userService.searchUsers(request).subscribe({
      next: (res) => {
        this.allUsersCache = res.data || [];
        this.applyFiltersAndPagination();
      },
      error: (err) => {
        console.error('Erreur:', err);
        this.loading = false;
        this.error = 'Impossible de charger les utilisateurs';
      }
    });
  }

  private applyFiltersAndPagination(): void {
    if (!this.allUsersCache) return;
    
    this.loading = true;
    
    // 1. Exclure les Admins
    let filteredUsers = this.allUsersCache.filter(user => user.role !== 'Admin');
    
    // 2. Appliquer le filtre de recherche
    if (this.searchTerm?.trim()) {
      filteredUsers = this.filterUsersBySearchTerm(filteredUsers, this.searchTerm.trim());
    }
    
    // 3. Appliquer le filtre de rôle
    if (this.selectedRole) {
      filteredUsers = filteredUsers.filter(user => user.role === this.selectedRole);
    }
    
    // 4. Appliquer le filtre de statut
    if (this.selectedStatut) {
      filteredUsers = filteredUsers.filter(user => user.statut === this.selectedStatut);
    }
    
    // 5. Pagination
    this.totalCount = filteredUsers.length;
    this.totalPages = Math.ceil(filteredUsers.length / this.pageSize) || 1;
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.users = filteredUsers.slice(startIndex, endIndex);
    
    this.loading = false;
    this.selectedUsers.clear();
    this.selectAll = false;
  }

  private filterUsersBySearchTerm(users: User[], term: string): User[] {
    const lowerTerm = term.toLowerCase();
    
    const isYear = /^\d{4}$/.test(term);
    const yearToFind = isYear ? parseInt(term) : null;
    const isPhoneSearch = /^[0-9\s\+\-]+$/.test(term);
    const cleanPhoneTerm = term.replace(/\D/g, '');
    
    return users.filter(user => {
      let match = 
        (user.nom?.toLowerCase() || '').includes(lowerTerm) ||
        (user.prenom?.toLowerCase() || '').includes(lowerTerm) ||
        (user.email?.toLowerCase() || '').includes(lowerTerm) ||
        (user.role?.toLowerCase() || '').includes(lowerTerm) ||
        (user.statut?.toLowerCase() || '').includes(lowerTerm);
      
      if (!match && isPhoneSearch && user.phoneNumber) {
        const cleanUserPhone = user.phoneNumber.replace(/\D/g, '');
        match = cleanUserPhone.includes(cleanPhoneTerm);
      }
      
      if (!match && isYear && user.birthDate) {
        let year: number | null = null;
        if (user.birthDate instanceof Date) {
          year = user.birthDate.getFullYear();
        } else if (typeof user.birthDate === 'string') {
          const yearStr = user.birthDate.split('-')[0];
          year = parseInt(yearStr);
        }
        match = year === yearToFind;
      }
      
      return match;
    });
  }

  // ================= PAGINATION ET FILTRES =================
  
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyFiltersAndPagination();
    }
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

  onSearch(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.applyFiltersAndPagination();
    }, 400);
  }

  applyFilter(): void {
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedRole = '';
    this.selectedStatut = '';
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  // ================= SÉLECTION =================
  
  onSelectUser(user: User, checked: boolean) {
    if (checked) {
      this.selectedUsers.add(user.id);
    } else {
      this.selectedUsers.delete(user.id);
    }
    this.selectAll = this.selectedUsers.size === this.users.length;
  }

  handleSelectAll(checked: boolean) {
    this.selectAll = checked;
    if (checked) {
      this.users.forEach(u => this.selectedUsers.add(u.id));
    } else {
      this.selectedUsers.clear();
    }
  }

  // ================= SUPPRESSION SIMPLE =================
  
  onDelete(user: User) {
    this.deleteError = false;
    this.deleteErrorMessage = '';
    this.confirmUser = user;
  }

  cancelDelete() {
    this.confirmUser = null;
    this.deleteError = false;
    this.deleteErrorMessage = '';
    this.deleting = false;
  }

  confirmDelete() {
    if (!this.confirmUser) return;

    this.deleting = true;
    this.deleteError = false;
    
    const userToDelete = this.confirmUser;
    const userName = `${userToDelete.prenom} ${userToDelete.nom}`;
    
    this.userService.deleteUser(userToDelete.id).subscribe({
      next: () => {
        // Mettre à jour le cache
        if (this.allUsersCache) {
          const index = this.allUsersCache.findIndex(u => u.id === userToDelete.id);
          if (index !== -1) this.allUsersCache.splice(index, 1);
        }
        
        this.selectedUsers.delete(userToDelete.id);
        this.confirmUser = null;
        this.deleting = false;
        
        this.showSuccessNotification('Succès', `${userName} a été supprimé avec succès.`);
        this.applyFiltersAndPagination();
      },
      error: (err) => {
        console.error('Erreur suppression', err);
        this.deleting = false;
        this.deleteError = true;
        
        if (err.error?.message?.includes('TPEs associés')) {
          this.deleteErrorMessage = err.error.message;
          this.showDeactivationProposal(userToDelete, err.error.message);
        } else {
          this.deleteErrorMessage = err.error?.message || `Impossible de supprimer ${userName}.`;
          this.showErrorNotification('Erreur', this.deleteErrorMessage);
        }
      }
    });
  }

  // ================= SUPPRESSION MULTIPLE =================
  
  confirmDeleteMultiple() {
    if (this.selectedUsers.size === 0) return;
    this.confirmUsers = this.users.filter(u => this.selectedUsers.has(u.id));
    this.showMultiDeleteAlert = true;
  }

  deleteSelectedUsers() {
    if (this.confirmUsers.length === 0) return;

    const ids = this.confirmUsers.map(u => u.id);
    let completed = 0;
    const total = ids.length;
    let successCount = 0;

    ids.forEach(id => {
      this.userService.deleteUser(id).subscribe({
        next: () => {
          // Mettre à jour le cache
          if (this.allUsersCache) {
            const index = this.allUsersCache.findIndex(u => u.id === id);
            if (index !== -1) this.allUsersCache.splice(index, 1);
          }
          this.selectedUsers.delete(id);
          successCount++;
          completed++;
          
          if (completed === total) {
            if (successCount === total) {
              this.showSuccessNotification('Succès', `${total} utilisateur(s) supprimé(s) avec succès.`);
            } else if (successCount > 0) {
              this.showAlert('warning', 'Attention', `${successCount} utilisateur(s) supprimé(s), ${total - successCount} échec(s).`);
            } else {
              this.showAlert('error', 'Erreur', `Aucun utilisateur n'a pu être supprimé.`);
            }
            
            this.confirmUsers = [];
            this.showMultiDeleteAlert = false;
            this.selectAll = false;
            this.applyFiltersAndPagination();
          }
        },
        error: () => {
          completed++;
          if (completed === total) {
            this.showAlert('error', 'Erreur', `Certains utilisateurs n'ont pas pu être supprimés.`);
            this.confirmUsers = [];
            this.showMultiDeleteAlert = false;
            this.selectAll = false;
          }
        }
      });
    });
  }

  // ================= ACTIVATION/DÉSACTIVATION SIMPLE =================
  
  onToggleUser(user: User) {
    this.toggleError = false;
    this.toggleErrorMessage = '';
    this.confirmToggleUser = user;
  }

  cancelToggle() {
    this.confirmToggleUser = null;
    this.toggleError = false;
    this.toggleErrorMessage = '';
    this.toggling = false;
  }

  confirmToggle() {
    if (!this.confirmToggleUser) return;

    this.toggling = true;
    this.toggleError = false;
    
    const user = this.confirmToggleUser;
    const userName = `${user.prenom} ${user.nom}`;
    const isActivating = user.statut === 'Inactif';
    const actionText = isActivating ? 'activer' : 'désactiver';
    
    const action$ = isActivating
      ? this.userService.activateUser(user.id)
      : this.userService.desactivateUser(user.id);

    action$.subscribe({
      next: () => {
        // Mettre à jour le cache
        if (this.allUsersCache) {
          const cachedUser = this.allUsersCache.find(u => u.id === user.id);
          if (cachedUser) cachedUser.statut = isActivating ? 'Actif' : 'Inactif';
        }
        
        user.statut = isActivating ? 'Actif' : 'Inactif';
        this.confirmToggleUser = null;
        this.toggling = false;
        
        const action = isActivating ? 'activé' : 'désactivé';
        this.showSuccessNotification('Succès', `${userName} a été ${action} avec succès.`);
        this.applyFiltersAndPagination();
      },
      error: (err) => {
        console.error('Erreur lors du changement de statut', err);
        this.toggling = false;
        this.toggleError = true;
        
        const errorMsg = err.error?.message || `Impossible de ${actionText} ${userName}.`;
        this.toggleErrorMessage = errorMsg;
        this.showErrorNotification('Erreur', errorMsg);
      }
    });
  }

  // ================= ACTIVATION/DÉSACTIVATION MULTIPLE =================
  
  confirmBulkToggle(action: 'activate' | 'deactivate') {
    if (this.selectedUsers.size === 0) return;
    this.bulkAction = action;
    this.confirmToggleUsers = this.users.filter(u => this.selectedUsers.has(u.id));
    this.showMultiToggleAlert = true;
  }

  cancelBulkToggle() {
    this.showMultiToggleAlert = false;
    this.confirmToggleUsers = [];
    this.bulkAction = null;
  }

  executeBulkToggle() {
    if (this.confirmToggleUsers.length === 0) return;

    this.toggling = true;
    let completed = 0;
    const total = this.confirmToggleUsers.length;
    let successCount = 0;

    const action = this.bulkAction === 'activate' ? 'activer' : 'désactiver';
    const actionPast = this.bulkAction === 'activate' ? 'activés' : 'désactivés';

    this.confirmToggleUsers.forEach(user => {
      const action$ = this.bulkAction === 'activate'
        ? this.userService.activateUser(user.id)
        : this.userService.desactivateUser(user.id);

      action$.subscribe({
        next: () => {
          // Mettre à jour le cache
          if (this.allUsersCache) {
            const cachedUser = this.allUsersCache.find(u => u.id === user.id);
            if (cachedUser) cachedUser.statut = this.bulkAction === 'activate' ? 'Actif' : 'Inactif';
          }
          
          user.statut = this.bulkAction === 'activate' ? 'Actif' : 'Inactif';
          this.selectedUsers.delete(user.id);
          successCount++;
          completed++;
          
          if (completed === total) {
            this.toggling = false;
            
            if (successCount === total) {
              this.showSuccessNotification('Succès', `${total} utilisateur(s) ${actionPast} avec succès.`);
            } else if (successCount > 0) {
              this.showAlert('warning', 'Attention', `${successCount} utilisateur(s) ${actionPast}, ${total - successCount} échec(s).`);
            } else {
              this.showAlert('error', 'Erreur', `Aucun utilisateur n'a pu être ${action}.`);
            }
            
            this.confirmToggleUsers = [];
            this.showMultiToggleAlert = false;
            this.bulkAction = null;
            this.selectAll = false;
            this.applyFiltersAndPagination();
          }
        },
        error: (err) => {
          console.error(`Erreur lors de l'${action}`, err);
          completed++;
          if (completed === total) {
            this.toggling = false;
            this.showAlert('error', 'Erreur', `${successCount}/${total} utilisateur(s) ${actionPast}.`);
            this.confirmToggleUsers = [];
            this.showMultiToggleAlert = false;
            this.bulkAction = null;
            this.selectAll = false;
          }
        }
      });
    });
  }

  // ================= PROPOSITION DE DÉSACTIVATION =================
  
  showDeactivationProposal(user: User, errorMessage: string) {
    const confirmDeactivate = confirm(
      `${errorMessage}\n\n` +
      `Souhaitez-vous plutôt désactiver ${user.prenom} ${user.nom} ?\n\n` +
      `(L'utilisateur perdra l'accès à la plateforme mais pourra être réactivé ultérieurement)`
    );
    
    if (confirmDeactivate) {
      this.userService.desactivateUser(user.id).subscribe({
        next: () => {
          if (this.allUsersCache) {
            const cachedUser = this.allUsersCache.find(u => u.id === user.id);
            if (cachedUser) cachedUser.statut = 'Inactif';
          }
          user.statut = 'Inactif';
          this.confirmUser = null;
          this.deleteError = false;
          this.showSuccessNotification('Succès', `${user.prenom} ${user.nom} a été désactivé avec succès.`);
          this.applyFiltersAndPagination();
        },
        error: (deactivateErr) => {
          console.error('Erreur désactivation', deactivateErr);
          this.showErrorNotification('Erreur', `Impossible de désactiver ${user.prenom} ${user.nom}.`);
          this.confirmUser = null;
          this.deleteError = false;
        }
      });
    } else {
      this.confirmUser = null;
      this.deleteError = false;
    }
  }

  confirmDeactivation() {
    if (!this.deactivationProposalUser) return;
    
    const user = this.deactivationProposalUser;
    
    this.userService.desactivateUser(user.id).subscribe({
      next: () => {
        if (this.allUsersCache) {
          const cachedUser = this.allUsersCache.find(u => u.id === user.id);
          if (cachedUser) cachedUser.statut = 'Inactif';
        }
        user.statut = 'Inactif';
        
        this.showDeactivationModal = false;
        this.confirmUser = null;
        this.deactivationProposalUser = null;
        this.deleteError = false;
        
        this.showSuccessNotification('Succès', `${user.prenom} ${user.nom} a été désactivé avec succès.`);
        this.applyFiltersAndPagination();
      },
      error: (err) => {
        console.error('Erreur désactivation', err);
        this.showAlert('error', 'Erreur', `Impossible de désactiver ${user.prenom} ${user.nom}.`);
        this.showDeactivationModal = false;
        this.deactivationProposalUser = null;
        this.confirmUser = null;
        this.deleteError = false;
      }
    });
  }

  cancelDeactivation() {
    this.showDeactivationModal = false;
    this.deactivationProposalUser = null;
    this.confirmUser = null;
    this.deleteError = false;
  }

  // ================= NOTIFICATIONS =================
  
  showNotification(variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    
    this.notification = {
      show: true,
      variant,
      title,
      message,
      icon: icons[variant]
    };
    
    setTimeout(() => {
      this.notification.show = false;
    }, 4000);
  }

  showSuccessNotification(title: string, message: string) {
    this.showNotification('success', title, message);
  }

  showErrorNotification(title: string, message: string) {
    this.showNotification('error', title, message);
  }

  showAlert(variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string) {
    alert(`${title}: ${message}`);
  }

  // ================= UTILITAIRES =================
  
  loadRoles(): void {
    this.userService.getAvailableRoles().subscribe({
      next: (roles) => {
        this.roleOptions = roles.map(r => r.name);
      },
      error: (err) => {
        console.error('Erreur chargement rôles:', err);
      }
    });
  }

  deleteUser(user: User) {
    this.userService.deleteUser(user.id).subscribe(() => {
      if (this.allUsersCache) {
        const index = this.allUsersCache.findIndex(u => u.id === user.id);
        if (index !== -1) this.allUsersCache.splice(index, 1);
      }
      this.selectedUsers.delete(user.id);
      this.applyFiltersAndPagination();
    });
  }
}