import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BadgeComponent } from '../../../ui/badge/badge.component';
import { User } from '../../../../models/User.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-basic-table-one',
  standalone: true,   // important

  imports: [CommonModule, BadgeComponent], 
  templateUrl: './basic-table-one.component.html',
})
export class BasicTableOneComponent {

  @Input() tableData: User[] = [];  
  @Output() deactivate = new EventEmitter<User>();
  @Output() toggle = new EventEmitter<User>();

onDeactivate(user: User) {
  if (confirm(`Désactiver ${user.nom} ${user.prenom} ?`)) {
    this.deactivate.emit(user);
  }
}
 toggleUser(user: User) {
    this.toggle.emit(user);
  }

  getBadgeColor(role: string): 'success' | 'warning' | 'error' {
    if (role === 'ADMIN') return 'success';
    if (role === 'TECHNICIEN') return 'warning';
    return 'error';
  }
}
