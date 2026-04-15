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
 

  ngOnInit(): void {
  
  }

  
}