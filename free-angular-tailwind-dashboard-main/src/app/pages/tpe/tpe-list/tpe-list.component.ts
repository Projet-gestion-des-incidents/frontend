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
today: string = new Date().toISOString().split('T')[0];
  showCommercantFilters = false;
tempCommercantFilters = {
  modele: '',
  createdAt: ''
};

// Pour la date de création (calendrier)
selectedCreatedAtForCommercant = '';
selectedDetectionDateObj: Date | null = null;
  
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
  commercantId: '',
  createdAt: '',
  updatedAt: ''
};

showFilters = false;


// ✅ Ajouter ces propriétés pour les dates
selectedCreatedAt = '';
selectedUpdatedAt = '';

// Méthodes pour les filtres
toggleFilters(): void {
  this.showFilters = !this.showFilters;
  if (this.showFilters) {
    // Initialiser les filtres temporaires avec les valeurs actuelles
    this.tempFilters = {
      modele: this.selectedModele,
      commercantId: this.selectedCommercantId,
      createdAt: this.selectedCreatedAt,
      updatedAt: this.selectedUpdatedAt
    };
  }
}

cancelFilters(): void {
  this.showFilters = false;
  // Restaurer les valeurs depuis les filtres temporaires (inchangés)
  this.tempFilters = {
    modele: this.selectedModele,
    commercantId: this.selectedCommercantId,
    createdAt: this.selectedCreatedAt,
      updatedAt: this.selectedUpdatedAt
  };
}

applyFilters(): void {
  // Appliquer les filtres temporaires aux filtres actifs
  this.selectedModele = this.tempFilters.modele;
  this.selectedCommercantId = this.tempFilters.commercantId;
  this.selectedCreatedAt = this.tempFilters.createdAt;
  this.selectedUpdatedAt = this.tempFilters.updatedAt;
  this.currentPage = 1;
  this.loadTPEs();
  this.showFilters = false;
}

clearFilters(): void {
  // Réinitialiser tous les filtres
  this.tempFilters = {
    modele: '',
    commercantId: '',
    createdAt: '',
    updatedAt: ''
  };
  this.selectedModele = '';
  this.selectedCommercantId = '';
  this.selectedCreatedAt = '';
  this.selectedUpdatedAt = '';
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


  // Méthodes pour les filtres du commerçant
toggleCommercantFilters(): void {
  this.showCommercantFilters = !this.showCommercantFilters;
  if (this.showCommercantFilters) {
    this.tempCommercantFilters = {
      modele: this.selectedModele,
      createdAt: this.selectedCreatedAtForCommercant
    };
  }
}

cancelCommercantFilters(): void {
  this.showCommercantFilters = false;
  this.tempCommercantFilters = {
    modele: this.selectedModele,
    createdAt: this.selectedCreatedAtForCommercant
  };
}

applyCommercantFilters(): void {
  this.selectedModele = this.tempCommercantFilters.modele;
  this.selectedCreatedAtForCommercant = this.tempCommercantFilters.createdAt;
  this.currentPage = 1;
  this.loadTPEs();
  this.showCommercantFilters = false;
}

clearCommercantFilters(): void {
  this.tempCommercantFilters = {
    modele: '',
    createdAt: ''
  };
  this.selectedModele = '';
  this.selectedCreatedAtForCommercant = '';
  this.searchTerm = '';
  this.currentPage = 1;
  this.loadTPEs();
  this.showCommercantFilters = false;
}

// Ajouter ces méthodes pour les calendriers admin

// Pour la date de création admin
onAdminCreatedAtChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const dateValue = input.value;
  
  if (dateValue) {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      this.tempFilters.createdAt = dateValue;
    } else {
      this.tempFilters.createdAt = '';
    }
  } else {
    this.tempFilters.createdAt = '';
  }
}

openAdminCreatedAtCalendar(): void {
  const dateInput = document.getElementById('adminCreatedAtDate') as HTMLInputElement;
  if (dateInput) {
    dateInput.showPicker();
  }
}

// Pour la date de modification admin
onAdminUpdatedAtChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const dateValue = input.value;
  
  if (dateValue) {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      this.tempFilters.updatedAt = dateValue;
    } else {
      this.tempFilters.updatedAt = '';
    }
  } else {
    this.tempFilters.updatedAt = '';
  }
}

openAdminUpdatedAtCalendar(): void {
  const dateInput = document.getElementById('adminUpdatedAtDate') as HTMLInputElement;
  if (dateInput) {
    dateInput.showPicker();
  }
}

// Méthode pour la date (comme dans incidents)
openCalendar(): void {
  const dateInput = document.getElementById('tpeDate') as HTMLInputElement;
  if (dateInput) {
    dateInput.showPicker();
  }
}

onDateChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const dateValue = input.value;
  
  if (dateValue) {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      this.selectedDetectionDateObj = date;
      this.selectedCreatedAtForCommercant = dateValue;
      this.tempCommercantFilters.createdAt = dateValue;
    } else {
      this.selectedDetectionDateObj = null;
      this.selectedCreatedAtForCommercant = '';
      this.tempCommercantFilters.createdAt = '';
    }
  } else {
    this.selectedDetectionDateObj = null;
    this.selectedCreatedAtForCommercant = '';
    this.tempCommercantFilters.createdAt = '';
  }
}

loadTPEs(): void {
  this.loading = true;
  
  if (this.userRole === 'Admin') {
    this.tpeService.getPagedTPEs({
      page: this.currentPage,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm,
      modele: this.selectedModele || undefined,
      commercantId: this.selectedCommercantId || undefined,
      createdAt: this.selectedCreatedAt || undefined,
      updatedAt: this.selectedUpdatedAt || undefined
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
    // ✅ Commerçant avec filtre modèle ET date de création
    this.tpeService.getMesTPEsPaged({
      page: this.currentPage,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm,
      modele: this.selectedModele || undefined,
      createdAt: this.selectedCreatedAtForCommercant || undefined
    }).subscribe({
      next: (response: PagedResponse<any>) => {
        this.tpes = response.data;
        this.totalCount = response.pagination.totalCount;
        this.totalPages = response.pagination.totalPages;
        this.currentPage = response.pagination.page;
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

getBadgeClasses(modele: string): string {
  const map: Record<string, string> = {
    // Ingenico - Bleu lavande (nuance bleutée proche du violet)
    'Ingenico': 'bg-[#B2B3FF] text-[#0C144E]',
    
    // Verifone - Digital Purple (violet signature)
    'Verifone': 'bg-[#8788FF] text-white',
    
    // PAX - Rose mauve (nuance rosée proche du violet)
    'PAX': 'bg-[#D4B8FF] text-[#0C144E]'
  };
  const key = modele?.trim() || '';
  return map[key] ?? 'bg-[#ECECFF] text-[#0C144E]';
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