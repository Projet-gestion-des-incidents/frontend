import { Component, Input } from '@angular/core';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DropdownItemTwoComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component-two';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { User, UserService } from '../../../services/user.service';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-user-dropdown',
    standalone: true,

  templateUrl: './user-dropdown.component.html',
  imports:[CommonModule,RouterModule,DropdownComponent,DropdownItemTwoComponent]
})
export class UserDropdownComponent {
  isOpen = false;
  @Input() user!: User;
  loading = true;

    constructor(
      public modal: ModalService,
private userService: UserService,    private router: Router
  ) {}
get fullName() {
  return `${this.user?.prenom || ''} ${this.user?.nom || ''}`.trim();
}

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  ngOnInit(): void {
    this.userService.getMyProfile().subscribe({
      next: (res) => {
        this.user = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement profil', err);
        this.loading = false;
      }
    });
  }
  closeDropdown() {
    this.isOpen = false;
  }

  onSignOut() {
    this.closeDropdown();
    this.router.navigate(['/sign-out']);
  }

}