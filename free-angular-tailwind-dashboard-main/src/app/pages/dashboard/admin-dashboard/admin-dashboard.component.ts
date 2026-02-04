import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../shared/services/user.service';
import { User } from '../../../shared/models/User.model';
import { BasicTableOneComponent } from '../../../shared/components/tables/basic-tables/basic-table-one/basic-table-one.component';

@Component({
  selector: 'app-admin-dashboard',
    standalone: true,  // si tu veux utiliser imports
  imports: [BasicTableOneComponent],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {

  users: User[] = []; // Initialisé pour éviter undefined

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getAllUsersWithRoles().subscribe({
      next: (data) => {
        // Mapping pour être sûr que chaque champ existe
        this.users = data.map((u: any) => ({
          id: u.id,
          nom: u.nom,
          prenom: u.prenom,
          phoneNumber: u.phoneNumber,
          role: u.role,
          image: u.image || '/assets/default-avatar.png',
          email: u.email
        }));
      },
      error: (err) => console.error('Erreur chargement users', err)
    });
  }
}
