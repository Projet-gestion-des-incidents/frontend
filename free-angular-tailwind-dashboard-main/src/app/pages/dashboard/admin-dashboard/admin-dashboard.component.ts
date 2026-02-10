import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../shared/services/user.service';
import { User } from '../../../shared/models/User.model';
import { BasicTableOneComponent } from '../../../shared/components/tables/basic-tables/basic-table-one/basic-table-one.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
 CommonModule,
  RouterModule,
  FormsModule,
  BasicTableOneComponent,
  ButtonComponent
  ],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  users: User[] = [];
  loading = true;
  error: string | null = null;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
    
  }
deactivateUser(user: User): void {
  this.userService.deleteUser(user.id).subscribe({
    next: () => {
      this.users = this.users.filter(u => u.id !== user.id);
    },
    error: err => {
      console.error('Erreur désactivation', err);
      alert('Erreur lors de la désactivation');
    }
  });
}

searchTerm: string = '';

searchUsers(term: string) {
  const lowerTerm = term.toLowerCase();
  return this.users.filter(u =>
    u.nom.toLowerCase().includes(lowerTerm) ||
        u.prenom.toLowerCase().includes(lowerTerm) ||

    u.email.toLowerCase().includes(lowerTerm) 
  );
}

toggleUser(user: User) {
  const action$ = user.statut === 'Inactif'
    ? this.userService.activateUser(user.id)
    : this.userService.desactivateUser(user.id);

  action$.subscribe({
    next: () => {
      user.statut = user.statut === 'Actif' ? 'Inactif' : 'Actif'; // mise à jour locale
    },
    error: () => {
      alert('Erreur lors du changement de statut');
    }
  });
}



filteredUsers: User[] = []; // Tableau affiché dans le tableau

loadUsers(): void {
  this.loading = true;
  this.error = null;

  console.log('Chargement des utilisateurs...'); // 🔹 debug start

  this.userService.getAllUsersWithRoles().subscribe({  
    next: (data) => {
      console.log('Données reçues du service:', data); // 🔹 data brute
      // Mapping correct vers l'interface User
      this.users = data.map((u: any) => ({
        id: u.id,
        userName: u.userName,
        nom: u.nom ?? 'Non spécifié',
        prenom: u.prenom ?? 'Non spécifié',
        email: u.email,
        phoneNumber: u.phoneNumber ?? 'Non spécifié',
        role: u.role,
        image: u.image,
        birthDate: u.birthDate ? new Date(u.birthDate) : undefined,
      statut: u.statut // <-- utiliser le statut direct
      }));
      console.log('Utilisateurs transformés:', this.users); // 🔹 après mapping
      this.filteredUsers = [...this.users];
      this.loading = false;
    },
    error: (err) => {
      console.error('Erreur chargement users', err);
      this.error = 'Impossible de charger les utilisateurs';
      this.loading = false;
    }
  });
}

  // Filtrage côté front
filterUsers(): void {
  const term = this.searchTerm.toLowerCase();
  this.filteredUsers = this.users.filter(u =>
    u.nom.toLowerCase().includes(term) ||
    u.prenom.toLowerCase().includes(term) ||
    u.email.toLowerCase().includes(term) ||   u.role.toLowerCase().includes(term)

  );
}
  deleteUser(user: User) {
  this.userService.deleteUser(user.id).subscribe(() => {
    this.users = this.users.filter(u => u.id !== user.id);
  });
  this.loadUsers();
}
}