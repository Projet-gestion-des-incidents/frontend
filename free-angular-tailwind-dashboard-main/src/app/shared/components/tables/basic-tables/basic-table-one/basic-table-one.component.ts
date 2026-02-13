import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BadgeComponent } from '../../../ui/badge/badge.component';
import { User } from '../../../../models/User.model';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../ui/button/button.component';
import { FormsModule } from '@angular/forms';
import { AlertComponent } from '../../../ui/alert/alert.component';
import { UserService } from '../../../../services/user.service';
import { CheckboxComponent } from '../../../form/input/checkbox.component';

@Component({
  selector: 'app-basic-table-one',
  standalone: true,
  imports: [CommonModule, BadgeComponent, ButtonComponent,CheckboxComponent, FormsModule, AlertComponent],
  templateUrl: './basic-table-one.component.html',
})
export class BasicTableOneComponent {

  @Input() tableData: User[] = [];
  @Output() deactivate = new EventEmitter<User>();
  @Output() toggle = new EventEmitter<User>();
  @Output() delete = new EventEmitter<User>();
@Input() currentPage!: number;
@Input() totalPages!: number;
@Output() pageChange = new EventEmitter<number>();

  alert = {
    show: false,
    variant: 'info' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: ''
  };

// suppression simple
confirmUser: User | null = null;

// suppression multiple
confirmUsers: User[] = [];
showMultiDeleteAlert = false; // flag spécifique

  constructor(private userService: UserService) {}

  toggleUser(user: User) {
    this.toggle.emit(user);
  }
    selectedUsers = new Set<string>(); // stocke les IDs sélectionnés
  selectAll = false; // pour le checkbox "tout sélectionner"
  handleSelectAll(checked: boolean) {
    this.selectAll = checked;
    if (checked) {
      this.tableData.forEach(u => this.selectedUsers.add(u.id));
    } else {
      this.selectedUsers.clear();
    }
  }

onSelectUser(user: User, checked: boolean) {
    if (checked) this.selectedUsers.add(user.id);
    else this.selectedUsers.delete(user.id);

    this.selectAll = this.selectedUsers.size === this.tableData.length;
  }
  goToPage(page: number) {
  if (page >= 1 && page <= this.totalPages) {
    this.pageChange.emit(page);
  }
}

deleteSelectedUsers() {
  if (this.confirmUsers.length === 0) return;

  const ids = this.confirmUsers.map(u => u.id);

  ids.forEach(id => {
    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.tableData = this.tableData.filter(u => u.id !== id);
        this.selectedUsers.delete(id);
      },
      error: () => {
        this.showAlert('error', 'Erreur', `Impossible de supprimer un utilisateur.`);
      }
    });
  });

  this.showAlert('success', 'Utilisateurs supprimés', `${this.confirmUsers.length} utilisateur(s) supprimé(s).`);
  
  // reset
  this.confirmUsers = [];
  this.showMultiDeleteAlert = false;
  this.selectAll = false;
}
 confirmDeleteMultiple() {
  if (this.selectedUsers.size === 0) return;

  this.confirmUsers = this.tableData.filter(u => this.selectedUsers.has(u.id));
  this.showMultiDeleteAlert = true; // uniquement pour suppression multiple
}

  onDelete(user: User) {
    this.confirmUser = user;
    this.alert = {
      show: true,
      variant: 'warning',
      title: 'Confirmation',
      message: `Voulez-vous vraiment supprimer ${user.nom} ${user.prenom} ?`
    };
  }

  // Confirmer la suppression
  confirmDelete() {
    if (!this.confirmUser) return;

    // Appel HTTP pour supprimer l'utilisateur
    this.userService.deleteUser(this.confirmUser.id).subscribe({
      next: () => {
        // Suppression dans le tableau local seulement après succès backend
        this.tableData = this.tableData.filter(u => u.id !== this.confirmUser!.id);

        this.showAlert('success', 'Utilisateur supprimé', `${this.confirmUser!.nom} ${this.confirmUser!.prenom} a été supprimé.`);
        this.confirmUser = null;
      },
      error: (err) => {
        console.error(err);
        this.showAlert('error', 'Erreur', 'Impossible de supprimer cet utilisateur.');
      }
    });
  }

  // Annuler la suppression
  cancelDelete() {
    this.confirmUser = null;
    this.alert.show = false;
  }

  // Toaster simple
  showAlert(variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string) {
    this.alert = { show: true, variant, title, message };
    setTimeout(() => (this.alert.show = false), 3000);
  }

  getBadgeColor(role: string): 'success' | 'warning' | 'error' {
    if (role === 'ADMIN') return 'success';
    if (role === 'TECHNICIEN') return 'warning';
    return 'error';
  }
}
