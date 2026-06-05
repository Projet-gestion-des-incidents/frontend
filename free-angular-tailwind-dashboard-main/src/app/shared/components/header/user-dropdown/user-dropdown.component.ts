import { Component, Input } from '@angular/core';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DropdownItemTwoComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component-two';
import { Router } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { ModalService } from '../../../services/modal.service';
import { User } from '../../../models/User.model';

@Component({
  selector: 'app-user-dropdown',
  standalone: true,
  templateUrl: './user-dropdown.component.html',
  imports: [CommonModule, RouterModule, DropdownComponent, DropdownItemTwoComponent]
})
export class UserDropdownComponent {
  isOpen = false;
  @Input() user: User | null = null;
  loading = true;

  constructor(
    public modal: ModalService,
    private userService: UserService,
    private router: Router
  ) {}

  get fullName(): string {
    if (!this.user) return '';
    return `${this.user.prenom || ''} ${this.user.nom || ''}`.trim();
  }

  toggleDropdown(): void {
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

  closeDropdown(): void {
    this.isOpen = false;
  }

  getInitials(): string {
    if (!this.user) return 'U';
    
    if (this.user.role === 'Commercant') {
      return this.user.nom?.charAt(0)?.toUpperCase() || 'M';
    }
    
    const prenomInitial = this.user.prenom?.charAt(0)?.toUpperCase() || '';
    const nomInitial = this.user.nom?.charAt(0)?.toUpperCase() || '';
    return `${prenomInitial}${nomInitial}`;
  }

  onImageError(): void {
    if (this.user) {
      this.user.image = undefined;
    }
  }

  onSignOut(): void {
    this.closeDropdown();
    this.router.navigate(['/sign-out']);
  }
}