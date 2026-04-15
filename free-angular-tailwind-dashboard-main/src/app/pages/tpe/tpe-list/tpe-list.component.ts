import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { RouterLink, RouterModule } from "@angular/router";
import { TPEService } from '../../../shared/services/tpe.service';
import { UserService } from '../../../shared/services/user.service';
import { BadgeColor, BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { AvatarTextComponent } from '../../../shared/components/ui/avatar/avatar-text.component';
import { PagedResponse } from '../../../shared/models/PagedResponse.model';

@Component({
  selector: 'app-tpe-list',
  standalone: true,
  imports: [ButtonComponent, CommonModule, FormsModule, AvatarTextComponent, RouterModule, BadgeComponent, AlertComponent],
  templateUrl: './tpe-list.component.html',
})
export class TpeListComponent implements OnInit {
  tpes: any[] = [];
  userRole: string = '';
  loading = true;
  
  // Pagination
  currentPage = 1;
  pageSize = 6;
  totalPages = 1;
  totalCount = 0;
  
  // Filtres
  searchTerm = '';
  selectedModele = '';
  selectedCommercantId = '';
  commercants: any[] = [];
  
  // Options de modèles
  modeleOptions = [
    { value: '', label: 'Tous les modèles' },
    { value: 'Ingenico', label: 'Ingenico' },
    { value: 'Verifone', label: 'Verifone' },
    { value: 'PAX', label: 'PAX' }
  ];
  
  alert = {
    show: false,
    variant: 'info' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: ''
  };
  
  tpeToDeleteId: string | null = null;
  private searchTimeout: any;

  constructor(
    private tpeService: TPEService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.userService.getMyProfile().subscribe({
      next: (user) => {
        this.userRole = user.role;
        if (this.userRole === 'Admin') {
          this.loadCommercants();
        }
        this.loadTPEs();
      },
      error: (err) => {
        console.error('Erreur récupération profil:', err);
        this.loading = false;
      }
    });
  }
// Dans TpeListComponent, ajoutez :

// Variables pour les filtres temporaires
tempFilters = {
  modele: '',
  commercantId: ''
};

showFilters = false;

// Méthodes pour les filtres
toggleFilters(): void {
  this.showFilters = !this.showFilters;
  if (this.showFilters) {
    // Initialiser les filtres temporaires avec les valeurs actuelles
    this.tempFilters = {
      modele: this.selectedModele,
      commercantId: this.selectedCommercantId
    };
  }
}

cancelFilters(): void {
  this.showFilters = false;
  // Restaurer les valeurs depuis les filtres temporaires (inchangés)
  this.tempFilters = {
    modele: this.selectedModele,
    commercantId: this.selectedCommercantId
  };
}

applyFilters(): void {
  // Appliquer les filtres temporaires aux filtres actifs
  this.selectedModele = this.tempFilters.modele;
  this.selectedCommercantId = this.tempFilters.commercantId;
  this.currentPage = 1;
  this.loadTPEs();
  this.showFilters = false;
}

clearFilters(): void {
  // Réinitialiser tous les filtres
  this.tempFilters = {
    modele: '',
    commercantId: ''
  };
  this.selectedModele = '';
  this.selectedCommercantId = '';
  this.searchTerm = '';
  this.currentPage = 1;
  this.loadTPEs();
  this.showFilters = false;
}

// Modifier resetFilters pour utiliser clearFilters
resetFilters(): void {
  this.clearFilters();
}
  loadCommercants(): void {
    this.loading = true;
    this.userService.getCommercants().subscribe({
      next: (commercants) => {
        this.commercants = commercants;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement commerçants:', err);
        this.loading = false;
      }
    });
  }

  loadTPEs(): void {
    this.loading = true;
    
    if (this.userRole === 'Admin') {
      // Admin utilise la méthode paginée
      this.tpeService.getPagedTPEs({
        page: this.currentPage,
        pageSize: this.pageSize,
        searchTerm: this.searchTerm,
        modele: this.selectedModele || undefined,
        commercantId: this.selectedCommercantId || undefined
      }).subscribe({
        next: (response: PagedResponse<any>) => {
          this.tpes = response.data;
          this.totalCount = response.pagination.totalCount;
          this.totalPages = response.pagination.totalPages;
          this.currentPage = response.pagination.page;
          this.loading = false;
        },
        error: err => {
          console.error('Erreur chargement TPEs:', err);
          this.loading = false;
        }
      });
    } else if (this.userRole === 'Commercant') {
      // Commerçant voit SES TPEs
      this.tpeService.getMyTpes().subscribe({
        next: (tpes) => {
          this.tpes = tpes;
          this.totalCount = tpes.length;
          this.totalPages = 1;
          this.loading = false;
        },
        error: err => {
          console.error('Erreur chargement TPEs (Commercant):', err);
          this.loading = false;
        }
      });
    } else {
      this.tpes = [];
      this.loading = false;
    }
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadTPEs();
    }
  }

  onSearch(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.loadTPEs();
    }, 400);
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

  getBadgeColor(modele: string): BadgeColor {
    const map: Record<string, BadgeColor> = {
      'Ingenico': 'info',
      'Verifone': 'primary',
      'PAX': 'warning'
    };
    const key = modele?.trim() || '';
    return map[key] ?? 'dark';
  }

  canManage(): boolean {
    return this.userRole === 'Admin';
  }

 // Ajoutez ces propriétés dans la classe TpeListComponent
deleting = false;
tpeToDelete: any = null;

// Modifiez la méthode deleteTPE
deleteTPE(tpe: any) {
  if (!this.canManage()) {
    this.alert = {
      show: true,
      variant: 'error',
      title: 'Accès refusé',
      message: 'Seuls les administrateurs peuvent supprimer des TPEs'
    };
    return;
  }

  this.tpeToDelete = tpe;
  this.tpeToDeleteId = tpe.id;
}

// Modifiez confirmDelete
confirmDelete() {
  if (!this.tpeToDeleteId) return;

  this.deleting = true;
  
  this.tpeService.deleteTPE(this.tpeToDeleteId).subscribe({
    next: () => {
      this.alert = {
        show: true,
        variant: 'success',
        title: 'Succès',
        message: 'TPE supprimé avec succès'
      };
      this.loadTPEs();
      this.cancelDelete();
      this.deleting = false;
    },
    error: (err) => {
      this.alert = {
        show: true,
        variant: 'error',
        title: 'Erreur',
        message: err.error?.message || 'Erreur lors de la suppression du TPE'
      };
      this.cancelDelete();
      this.deleting = false;
    }
  });
}

// Modifiez cancelDelete
cancelDelete() {
  this.tpeToDeleteId = null;
  this.tpeToDelete = null;
  this.deleting = false;
}
  formatCommercant(tpe: any): string {
    if (this.userRole === 'Admin') {
      return tpe.commercantNom || 'Non assigné';
    }
    return 'Vous';
  }

}