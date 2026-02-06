import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../shared/services/user.service';
import { User } from '../../../shared/models/User.model';
import { BasicTableOneComponent } from '../../../shared/components/tables/basic-tables/basic-table-one/basic-table-one.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
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

  loadUsers(): void {
    this.loading = true;
    this.error = null;
    
    this.userService.getAllUsersWithRoles().subscribe({  
      next: (data) => {
        // Mapping correct vers l'interface User
        this.users = data.map((u: any) => ({
          id: u.id,
          userName: u.userName || `${u.prenom}.${u.nom}`.toLowerCase(),
          email: u.email,
          nom: u.nom || 'Non spécifié',
          prenom: u.prenom || 'Non spécifié',
          age: u.age,
          phoneNumber: u.phone || u.phoneNumber || 'Non spécifié', 
          role: u.role,
          image: u.image ? `https://localhost:7063${u.image}` : '/assets/default-avatar.png', // Préfixe l'URL
          birthDate: u.birthDate ? new Date(u.birthDate) : undefined        
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement users', err);
        this.error = 'Impossible de charger les utilisateurs';
        this.loading = false;
      }
    });
  }
}