import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../shared/services/user.service';
import { BasicTableOneComponent } from "../../../shared/components/tables/basic-tables/basic-table-one/basic-table-one.component";

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  imports: [BasicTableOneComponent]
})
export class AdminDashboardComponent implements OnInit {

  users: any[] = [];

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.userService.getAllUsers().subscribe({
      next: (data) => this.users = data,
      error: (err) => console.error('Erreur chargement users', err)
    });
  }
}
